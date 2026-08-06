"use strict";

// ---------------------------------------------------------------------------
// The EEPROM check link: read-only Bluetooth to the rider's own scooter.
//
// A rider runs the check once before flashing and once after, so it has to work
// on its own, no matter where the flash happened. Flashing is not part of it:
// this file listens to the settings echo the controller streams by itself and
// writes nothing but the keep-alive handshake that link needs.
//
// Transport, CRC-8 and the 55 71 field map speak the controller's own settings
// echo, with every write path left out.
//
// Public interface, the whole surface the page uses:
//   window.TrFwBLE.supported            true when the browser has Web Bluetooth
//   window.TrFwBLE.status               current state, see STATUS below
//   window.TrFwBLE.connect()            promise, picks a scooter and listens
//   window.TrFwBLE.disconnect()         tears the link down
//   window.TrFwBLE.onStatus(cb)         cb(status) on every state change
//   window.TrFwBLE.onSnapshot(cb)       cb(snapshot) on every parsed 55 71
//   window.TrFwBLE.onIdentity(cb)       cb(partial) on the BLE name and every 55 42 / 55 43
// ---------------------------------------------------------------------------

(function () {

// --------------------------- transport constants ---------------------------

// The Bluetooth name is the FIN: "TDE..." on an eKFV unit, "T1..." on an open
// one. Both prefixes keep the chooser to actual scooters.
var NAME_PREFIXES = ["TDE", "T1"];

var ISSC_SERVICE = "49535343-fe7d-4ae5-8fa9-9fafd205e455";
var ISSC_NOTIFY = "49535343-1e4d-4bd9-ba61-23c647249616";
var ISSC_WRITE = "49535343-aca3-481c-91ec-d85e28a60318";
var NORDIC_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";

// Web Bluetooth may only touch services named up front, so the whole vendor
// range is declared: no single UUID covers every module these scooters ship.
var VENDOR_16BIT = [];
(function () {
  var bases = ["fc", "fd", "fe", "ff"];
  for (var b = 0; b < bases.length; b++) {
    for (var i = 0; i < 256; i++) {
      var lo = i.toString(16);
      if (lo.length < 2) lo = "0" + lo;
      VENDOR_16BIT.push("0000" + bases[b] + lo + "-0000-1000-8000-00805f9b34fb");
    }
  }
})();

var OPTIONAL_SERVICES = [ISSC_SERVICE, NORDIC_SERVICE].concat(VENDOR_16BIT);

// The common ISSC/FF services to fetch one by one where enumeration returns
// nothing, which is what Bluefy on iOS does right after a connect.
var COMMON_SERVICES = [ISSC_SERVICE, NORDIC_SERVICE,
  "0000ffe0-0000-1000-8000-00805f9b34fb", "0000ffe1-0000-1000-8000-00805f9b34fb",
  "0000fff0-0000-1000-8000-00805f9b34fb", "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe5-0000-1000-8000-00805f9b34fb", "0000fff6-0000-1000-8000-00805f9b34fb",
  "0000ffb0-0000-1000-8000-00805f9b34fb", "0000fee0-0000-1000-8000-00805f9b34fb"];

var CONNECT_CODE_INTERVAL_MS = 6500;
var WRITE_GAP_MS = 200;         // the spacing the native app keeps between two frames
var RECONNECT_BASE_MS = 2000;
var RECONNECT_MAX_MS = 20000;
var LINK_TIMEOUT_MS = 6000;     // how long the scooter may stay silent before the silence is reported

// The states the page can be in. Cancelled, denied and error are kept apart so
// a rider is told which of the three actually happened.
var STATUS = {
  UNSUPPORTED: "unsupported",
  IDLE: "idle",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ERROR: "error",
  CANCELLED: "cancelled",
  DENIED: "denied",
  DISCONNECTED: "disconnected"
};

// --------------------------- CRC-8 (poly 0x07) ---------------------------

function crc8(data, len) {
  var crc = 0;
  for (var i = 0; i < len; i++) {
    crc ^= (data[i] & 0xFF);
    for (var n = 8; n > 0; n--) {
      crc = ((crc & 0x80) !== 0) ? (((crc << 1) ^ 0x07) & 0x1FF) : ((crc << 1) & 0x1FF);
    }
    crc &= 0xFF;
  }
  return crc & 0xFF;
}

// --------------------------- the one frame we send ---------------------------

function finalizeFrame(a19) {
  var out = new Uint8Array(20);
  for (var i = 0; i < 19; i++) out[i] = a19[i] & 0xFF;
  out[19] = crc8(a19, 19);
  return out;
}

// Handshake and keep-alive: AA 01 10 <toggle> FF..FF CRC. The controller has no
// read command, this is what keeps it streaming and the only proof of a live link.
function connectCode(e) {
  var a = [];
  for (var i = 0; i < 19; i++) a.push(0xFF);
  a[0] = 0xAA;
  a[1] = 0x01;
  a[2] = 0x10;
  a[3] = e & 0xFF;
  return finalizeFrame(a);
}

// --------------------------- link state ---------------------------

// One fact decides what the rider is told: is the scooter still sending? A drop,
// a retry and a fresh subscription are transport work and stay off the status
// line while the frames keep coming, so a blip healed in a second reads as
// nothing at all rather than as "not connected" and back.
var device = null, notifyChar = null, writeChar = null;
var notifyReady = false, connected = false, userDisconnect = false;
var connecting = false;                        // connectGatt is not re-entrant, see the guard there
var reconnectDelay = RECONNECT_BASE_MS;
var reconnectTimer = null;                     // at most one pending attempt, see scheduleReconnect
var keepAliveTimer = null;
var linkTimer = null;                          // the data watchdog, re-armed by every valid frame
var lastFrameAt = 0;                           // when the scooter last sent one, 0 = not yet
var rxBuf = new Uint8Array(0);

var statusListeners = [];
var snapshotListeners = [];
var identityListeners = [];

function sleep(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

function log(m) {
  if (typeof console !== "undefined" && console.log) console.log("[ble] " + m);
}

function setStatus(s) {
  if (API.status === s) return;
  API.status = s;
  for (var i = 0; i < statusListeners.length; i++) {
    try { statusListeners[i](s); } catch (e) {}
  }
}

function emitSnapshot(snap) {
  for (var i = 0; i < snapshotListeners.length; i++) {
    try { snapshotListeners[i](snap); } catch (e) {}
  }
}

// Identity frames arrive on their own schedule, not with every 55 71, so a caller
// gets one partial update per frame instead of a snapshot that resets on every call.
function emitIdentity(part) {
  for (var i = 0; i < identityListeners.length; i++) {
    try { identityListeners[i](part); } catch (e) {}
  }
}

function ascii(t, from, toInc) {
  var s = "";
  for (var i = from; i <= toInc && i < 20; i++) {
    var c = t[i] & 0xFF;
    if (c >= 0x20 && c <= 0x7E) s += String.fromCharCode(c);
  }
  return s.trim();
}

function u16(t, i) { return ((t[i] & 0xFF) << 8) | (t[i + 1] & 0xFF); }

// --------------------------- the 55 71 field map ---------------------------

// Every value the EEPROM check shows, exactly as the settings echo carries it.
// wheelReadable is always false: on genuine stock firmware t[6] is a fixed
// constant rather than the stored wheel size, so it proves nothing about a reset.
//
// t[8], t[9] and t[10] belong to the gear the controller reports in t[3]: the
// echo only ever carries the active gear, never the other five.
//
// eabsLevel is a single value for the gear, not one per side: the same number
// sits in the high nibble of both t[8] and t[9], and the read path only ever
// looks at t[9]'s copy. The low nibbles are a different, genuinely separate
// pair: the front and rear start level, with no relation to the EABS level
// beyond sharing a byte with it.
function parse71(t) {
  var r = t[4] & 0xFF;                       // rControlStatus
  var b1 = (r >> 1) & 1, b2 = (r >> 2) & 1;
  var f = t[16] & 0xFF;                      // fControlStatus
  var m = t[17] & 0xFF;                      // mode flags
  return {
    gear: t[3] & 0xFF,
    cruise: (b2 << 1) | b1,                  // 0 off, 1 automatic, 2 manual
    wheelInches: (t[6] & 0xFF) * 0.1,
    wheelReadable: false,
    motorPolePairs: t[5] & 0xFF,             // EEPROM 0x02, rewritten by the firmware at every boot
    speedLimit: t[11] & 0xFF,
    voltCode: t[14] & 0xFF,
    packVolt: t[15] & 0xFF,
    fCurrent: t[12] & 0xFF,
    rCurrent: t[13] & 0xFF,
    eabsOn: ((r >> 3) & 1) === 1,
    zeroStart: ((r >> 6) & 1) === 1,
    rearMotorFree: ((r >> 7) & 1) === 1,
    // Bit 7 of the front byte is not a front-side twin of rearMotorFree: it is
    // doubleMotor, the single/dual-motor drivetrain toggle, a different setting
    // that happens to share the front control-status byte with the same bit position.
    doubleMotor: ((f >> 7) & 1) === 1,
    sysProTemp: t[7] & 0xFF,                 // overtemperature threshold in degrees
    ecoMode: (m & 1) === 1,                  // EEPROM 0x08 bit 0, masked out of the save path
    unitMiles: ((m >> 1) & 1) === 1,
    atMode: ((m >> 2) & 1) === 1,
    smartMode: ((m >> 4) & 1) === 1,         // traction control
    assistSpeedLimit: t[10] & 0xFF,
    eabsLevel: (t[9] & 0xFF) >> 4,
    fStartLevel: t[8] & 0x0F,
    rStartLevel: t[9] & 0x0F
  };
}

// --------------------------- receive ---------------------------

// A notification is not guaranteed to carry exactly one 20-byte frame, so the
// bytes are buffered and every frame that starts with 0x55 and checksums is
// pulled out. Anything else, an update-mode answer included, is skipped a byte
// at a time: this page never talks on that path.
function onNotify(value) {
  var len = value.byteLength;
  var u = new Uint8Array(len);
  for (var i = 0; i < len; i++) u[i] = value.getUint8(i);
  var merged = new Uint8Array(rxBuf.length + len);
  merged.set(rxBuf, 0);
  merged.set(u, rxBuf.length);
  var pos = 0;
  while (pos + 20 <= merged.length) {
    if (merged[pos] !== 0x55) { pos++; continue; }            // resync to the frame marker
    var t = new Array(20);
    for (var k = 0; k < 20; k++) t[k] = merged[pos + k];
    if (crc8(t, 19) !== (t[19] & 0xFF)) { pos++; continue; }  // not a valid frame, skip one byte
    dispatch(t);
    pos += 20;
  }
  rxBuf = merged.slice(pos);                   // the unconsumed tail belongs to the next notification
  if (rxBuf.length > 200) rxBuf = rxBuf.slice(rxBuf.length - 40);
}

// None of these are requested, the controller streams all of them on its own
// rotation the same way it streams 55 71; this just listens for them too.
//
// Per-cell voltages (0x51/0x55/0x56), pack volt/current/temperature (part of
// 0x52), balance bits and cell-voltage extremes (part of 0x53), and fault/ECU
// status (0x54, 0x72) stay out: no flash-write site in the VCU image ever
// persists these, only the vendor's cloud backend, unreachable here.
//
// SOC and SOH (also part of 0x52) are the open question: the battery's BMS
// chip has its own flash driver shaped for storing a baseline, but which
// value it actually holds could not be confirmed.
function dispatch(t) {
  onFrame();                                   // a valid frame proves the scooter is really here
  var cmd = t[1] & 0xFF;
  if (cmd === 0x71) emitSnapshot(parse71(t));
  else if (cmd === 0x42) emitIdentity({ frameNum: ascii(t, 2, 18) });
  else if (cmd === 0x43) {
    // t[5], t[7], t[8], t[9] and t[10..13] all arrive in this same frame already,
    // block-0 bytes with no consuming code found anywhere in the firmware beyond
    // round-tripping them back to EEPROM unchanged: no confirmed meaning, shown
    // as raw numbers rather than guessed at.
    var part = {
      fwBuild: t[6] & 0xFF,
      idByte0B: t[5] & 0xFF,
      idByte06: t[7] & 0xFF,
      idByte07: t[8] & 0xFF,
      idByte03: t[9] & 0xFF,
      // >>> 0 forces this back to unsigned: << would otherwise read the top byte's
      // high bit as a sign and turn half of all possible values negative.
      idBlock2F: (((t[10] & 0xFF) << 24) | ((t[11] & 0xFF) << 16) | ((t[12] & 0xFF) << 8) | (t[13] & 0xFF)) >>> 0
    };
    if ((t[2] & 0xFF) > 0) part.swVer = (t[2] & 0xFF) + "." + (t[3] & 0xFF) + "." + (t[4] & 0xFF);
    emitIdentity(part);
  } else if (cmd === 0x53) {
    // A T2 pack carries capacity in t[10] instead of t[8], the BLE name is the
    // only source for that.
    var isT2 = device && device.name && device.name.indexOf("T2") === 0;
    emitIdentity({
      battCapacity: u16(t, isT2 ? 10 : 8),
      battChargeCount: u16(t, 12),
      battCellCount: t[14] & 0xFF
    });
  } else if (cmd === 0x52) {
    emitIdentity({ battSoc: t[8] & 0xFF, battSoh: t[9] & 0xFF });
  } else if (cmd === 0x73) {
    // A 24-bit big-endian counter split across three bytes.
    emitIdentity({ odometer: ((t[8] & 0xFF) << 16) | ((t[9] & 0xFF) << 8) | (t[10] & 0xFF) });
  }
}

// A frame is the only proof the link is real: iOS reports a connected GATT even
// for a bonded scooter far out of range. Every frame pushes the watchdog out
// again, so a steady stream can never let it fire.
function onFrame() {
  if (userDisconnect) return;                  // a straggler after the rider closed the window
  lastFrameAt = Date.now();
  armWatchdog();
  setStatus(STATUS.CONNECTED);                 // unchanged status returns at once, so per frame is free
}

// True while the scooter is still sending. A drop the auto-reconnect heals keeps
// this true throughout, which is what holds the status line steady.
function dataFresh() {
  return lastFrameAt !== 0 && (Date.now() - lastFrameAt) < LINK_TIMEOUT_MS;
}

// One timer, always the current one: cleared before it is set, so no earlier arm
// can survive to fire late against a link that is streaming.
function armWatchdog() {
  if (linkTimer) clearTimeout(linkTimer);
  linkTimer = setTimeout(onLinkTimeout, LINK_TIMEOUT_MS);
}

// Silence is reported, never acted on: the link and the auto-reconnect stay up,
// so the next frame turns the state straight back into connected. This is the
// only place a live link is reported as anything but connected, which is what
// keeps one dropout to one message instead of a burst of them.
function onLinkTimeout() {
  linkTimer = null;
  if (userDisconnect) return;
  if (dataFresh()) { armWatchdog(); return; }  // a frame came in late, wait the window out again
  var gattUp = !!(device && device.gatt && device.gatt.connected);
  log("no data: scooter out of range, switched off or sitting in update mode");
  setStatus(gattUp ? STATUS.ERROR : STATUS.DISCONNECTED);
}

function onCharacteristicValue(ev) {
  try { onNotify(ev.target.value); } catch (e) {}
}

// The listener has to be released BEFORE the reference to its characteristic is
// dropped, otherwise the old one keeps delivering and every frame arrives twice.
function detachNotify() {
  var nc = notifyChar;
  notifyChar = null;
  if (!nc) return;
  try { nc.removeEventListener("characteristicvaluechanged", onCharacteristicValue); } catch (e) {}
  try {
    var p = nc.stopNotifications();
    if (p && p["catch"]) p["catch"](function () {});
  } catch (e) {}
}

// --------------------------- send ---------------------------

var writeQueue = [];
var writing = false;
var writeEpoch = 0;

function enqueue(frame) {
  writeQueue.push(frame);
  drain();
}

// A write that was in flight when the link went down can stay unsettled, and the
// pump would then turn away every later frame. The keep-alive is what asks the
// scooter to stream, so a stuck pump means silence on a link that is up again.
// The epoch releases the pump for the new link and retires the old loop.
function resetWritePump() {
  writeEpoch++;
  writeQueue.length = 0;
  writing = false;
}

async function drain() {
  if (writing || !notifyReady) return;
  var epoch = writeEpoch;
  writing = true;
  while (writeQueue.length && epoch === writeEpoch) {
    var f = writeQueue.shift();
    try { await doWrite(f); } catch (e) { log("write error: " + e); }
    await sleep(WRITE_GAP_MS);
  }
  if (epoch === writeEpoch) writing = false;
}

function doWrite(frame) {
  var wc = writeChar;
  if (!wc) return Promise.reject(new Error("no write characteristic"));
  if (wc.properties.write && wc.writeValueWithResponse) return wc.writeValueWithResponse(frame);
  if (wc.properties.writeWithoutResponse && wc.writeValueWithoutResponse) return wc.writeValueWithoutResponse(frame);
  return wc.writeValue(frame);
}

function startKeepAlive() {
  stopKeepAlive();
  var tick = function () {
    if (!notifyReady) return;
    enqueue(connectCode(0));
    keepAliveTimer = setTimeout(tick, CONNECT_CODE_INTERVAL_MS);
  };
  tick();
}

function stopKeepAlive() {
  if (keepAliveTimer) { clearTimeout(keepAliveTimer); keepAliveTimer = null; }
  writeQueue.length = 0;
}

// --------------------------- discovery ---------------------------

async function pickService(srv) {
  function isMatch(u) {
    return u.indexOf("495353") === 0 || u.indexOf("6e400001") === 0
        || /^0000f[c-f]/.test(u) || /^f[c-f][0-9a-f]{2}$/.test(u);
  }
  // Fetched in parallel batches, so walking the whole declared range stays quick.
  async function direct(list) {
    var BATCH = 16;
    for (var i = 0; i < list.length; i += BATCH) {
      var batch = list.slice(i, i + BATCH);
      var rs = await Promise.allSettled(batch.map(function (u) { return srv.getPrimaryService(u); }));
      for (var j = 0; j < rs.length; j++) {
        if (rs[j].status === "fulfilled" && rs[j].value) {
          log("service (direct): " + batch[j].slice(0, 8));
          return rs[j].value;
        }
      }
    }
    return null;
  }
  // The service list can still be empty right after a connect, so this tries
  // twice with a wait, the way the native app waits before discovering.
  for (var attempt = 0; attempt < 2; attempt++) {
    var services = [];
    try { services = await srv.getPrimaryServices(); } catch (e) { log("service enumerate failed: " + e); }
    if (services.length) {
      var chosen = null;
      for (var s = 0; s < services.length; s++) {
        if (isMatch(services[s].uuid.toLowerCase())) chosen = services[s];   // last match wins, as native
      }
      if (chosen) return chosen;
    }
    var d = await direct(COMMON_SERVICES);
    if (d) return d;
    if (attempt === 0) { log("no service yet, waiting for GATT discovery"); await sleep(1500); }
  }
  return await direct(VENDOR_16BIT);   // last resort: the whole declared vendor range
}

async function pickCharacteristics(svc) {
  detachNotify();                      // release the old characteristic before losing it
  writeChar = null;
  var u = svc.uuid.toLowerCase();
  if (u.indexOf("495353") === 0) {
    try { notifyChar = await svc.getCharacteristic(ISSC_NOTIFY); } catch (e) {}
    try { writeChar = await svc.getCharacteristic(ISSC_WRITE); } catch (e) {}
    if (notifyChar && writeChar) return;
  }
  var chars = [];
  try { chars = await svc.getCharacteristics(); } catch (e) { log("char enumerate failed: " + e); }
  var anyWritable = null;
  for (var i = 0; i < chars.length; i++) {     // last notify / last write-only wins, as native
    var p = chars[i].properties;
    if (p.notify) notifyChar = chars[i];
    else if (p.write) writeChar = chars[i];
    if (p.write || p.writeWithoutResponse) anyWritable = chars[i];
  }
  if (!writeChar) writeChar = anyWritable;
}

// --------------------------- connect ---------------------------

// The one place a device becomes THE device: the old notify listener goes
// first, so a replaced device cannot leave a live one behind. The drop handler
// is removed before it is added, on the held device as well: a second one on the
// same device would report one drop twice and start two reconnects for it.
function adoptDevice(dev) {
  if (!dev) return;
  if (dev !== device) {
    detachNotify();
    try { if (device) device.removeEventListener("gattserverdisconnected", onDisconnected); } catch (e) {}
    device = dev;
  }
  // Every adopt re-emits the name, not just the first one on a new device object: the
  // browser hands back the SAME device on a reconnect, so this line has to run outside
  // the dev !== device branch above or a second "EEPROM prüfen" open (which clears
  // eeIdentity first) would never see the FIN again. The BLE name is the FIN on this
  // platform (TDE... locked, T1... open), see NAME_PREFIXES above; a frame number from
  // 0x42 only ever stands in for a scooter connected under some other name.
  if (dev.name) emitIdentity({ name: dev.name });
  try { device.removeEventListener("gattserverdisconnected", onDisconnected); } catch (e) {}
  device.addEventListener("gattserverdisconnected", onDisconnected);
}

// The browser reports a cancelled chooser and a refused permission with
// different error names. A rider needs to be told which one it was.
function statusForError(e) {
  var name = (e && e.name) ? e.name : "";
  if (name === "NotFoundError") return STATUS.CANCELLED;
  if (name === "NotAllowedError" || name === "SecurityError") return STATUS.DENIED;
  return STATUS.ERROR;
}

// What an attempt did: it got there, another attempt already owns the link and
// answers for both, or it did not get there and the caller decides on a retry.
var LINK_OK = "ok", LINK_BUSY = "busy", LINK_FAIL = "fail";

// announce is the rider's own tap: only that path says a word about connecting
// or about a failure. An automatic retry stays silent and lets the frames or the
// watchdog speak, so a scooter that keeps dropping reads as one steady message
// rather than a run of them.
async function connectGatt(next, announce) {
  var target = next || device;
  if (!target) return LINK_FAIL;
  // Several paths reach here at once: a drop during an in-flight reconnect, a
  // retry on top of the one the disconnect scheduled, a tap racing both.
  if (connecting) { log("connect already in progress"); return LINK_BUSY; }
  // Nothing to redo while the link carries frames. The plain connected flag is
  // not enough on its own: a drop event clears it, and on these modules that
  // event can arrive for a link whose notifications keep coming. Rebuilding the
  // subscription underneath a working stream is what cuts it.
  if (target === device && device.gatt && device.gatt.connected && (connected || (notifyReady && dataFresh()))) return LINK_OK;
  connecting = true;
  try {
    adoptDevice(target);
    if (announce) setStatus(STATUS.CONNECTING);
    notifyReady = false;
    connected = false;
    rxBuf = new Uint8Array(0);
    resetWritePump();
    var server = await device.gatt.connect();
    var svc = await pickService(server);
    if (!svc) { log("no matching GATT service"); if (announce) setStatus(STATUS.ERROR); return LINK_FAIL; }
    await pickCharacteristics(svc);
    if (!notifyChar || !writeChar) { log("notify/write characteristic missing"); if (announce) setStatus(STATUS.ERROR); return LINK_FAIL; }
    await notifyChar.startNotifications();
    notifyChar.removeEventListener("characteristicvaluechanged", onCharacteristicValue);
    notifyChar.addEventListener("characteristicvaluechanged", onCharacteristicValue);
    notifyReady = true;
    connected = true;
    reconnectDelay = RECONNECT_BASE_MS;
    // The GATT link is up, but a bonded scooter out of range reports the same,
    // so the state only becomes connected once a real frame arrives.
    log("link up, waiting for data. notify=" + notifyChar.uuid.slice(0, 8) + " write=" + writeChar.uuid.slice(0, 8));
    startKeepAlive();
    armWatchdog();
    return LINK_OK;
  } catch (e) {
    log("connect failed: " + e);
    if (announce) setStatus(statusForError(e));
    return LINK_FAIL;
  } finally {
    connecting = false;
  }
}

// Exactly one attempt is ever pending: every retry goes through here, so a drop
// during a retry cannot leave two chains hunting the same scooter.
function scheduleReconnect(delay) {
  if (userDisconnect || !device) return;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  log("reconnecting in " + delay + " ms");
  reconnectTimer = setTimeout(function () {
    reconnectTimer = null;
    reconnect();
  }, delay);
}

// The status line is left alone here: the frames still in flight keep it on
// connected through a blip, and the watchdog reports it if the silence lasts.
function onDisconnected() {
  connected = false;
  notifyReady = false;
  stopKeepAlive();
  resetWritePump();
  log("link dropped" + (userDisconnect ? " (by user)" : ""));
  if (userDisconnect) return;
  if (!linkTimer) armWatchdog();               // a drop always ends in a reported state
  scheduleReconnect(reconnectDelay);           // the backoff grows in reconnect, on a failed attempt
}

async function reconnect() {
  if (userDisconnect) return;
  var r = await connectGatt();
  if (r !== LINK_FAIL || userDisconnect) return;   // busy: the attempt that holds it answers for this one
  reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
  scheduleReconnect(reconnectDelay);
}

// --------------------------- public interface ---------------------------

var API = {
  supported: (typeof navigator !== "undefined") && ("bluetooth" in navigator),

  status: ((typeof navigator !== "undefined") && ("bluetooth" in navigator)) ? STATUS.IDLE : STATUS.UNSUPPORTED,

  // Resolves true once the link is up. A refused, cancelled or failed attempt
  // resolves false and says which it was through the status, so a caller never
  // has to catch anything. Watching onStatus is the better guide either way: the
  // link is reported as connected from the first frame, not from the GATT link.
  connect: function () {
    if (!API.supported) {
      setStatus(STATUS.UNSUPPORTED);
      return Promise.resolve(false);
    }
    userDisconnect = false;
    // A retry left pending by the previous reading would wake up here, because
    // clearing userDisconnect is all it waits for.
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    lastFrameAt = 0;                            // this reading proves its own link
    reconnectDelay = RECONNECT_BASE_MS;
    setStatus(STATUS.CONNECTING);
    return navigator.bluetooth.requestDevice({
      filters: NAME_PREFIXES.map(function (p) { return { namePrefix: p }; }),
      optionalServices: OPTIONAL_SERVICES
    }).then(function (dev) {
      // The rider can close the dialog while the browser's own device chooser is
      // still open; a selection that arrives after that must not open a link.
      if (userDisconnect) { log("selected after disconnect, ignoring: " + (dev.name || "")); return false; }
      log("selected: " + (dev.name || "") + " [" + dev.id + "]");
      return connectGatt(dev, true).then(function (r) { return r === LINK_OK; });
    })["catch"](function (e) {
      log("scan/connect ended: " + e);
      setStatus(statusForError(e));
      return false;
    });
  },

  disconnect: function () {
    userDisconnect = true;
    lastFrameAt = 0;
    if (linkTimer) { clearTimeout(linkTimer); linkTimer = null; }
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    stopKeepAlive();
    resetWritePump();
    detachNotify();
    try { if (device && device.gatt && device.gatt.connected) device.gatt.disconnect(); } catch (e) {}
    connected = false;
    notifyReady = false;
    writeChar = null;
    rxBuf = new Uint8Array(0);
    setStatus(STATUS.DISCONNECTED);
  },

  onStatus: function (cb) {
    if (typeof cb === "function") statusListeners.push(cb);
  },

  onSnapshot: function (cb) {
    if (typeof cb === "function") snapshotListeners.push(cb);
  },

  onIdentity: function (cb) {
    if (typeof cb === "function") identityListeners.push(cb);
  }
};

if (typeof window !== "undefined") window.TrFwBLE = API;

})();
