# Laufbursche Firmware Patcher

A web page that builds a Laufbursche firmware for the **Teverun Fighter Mini (eKFV)** from the stock firmware of your own scooter.

> **This is a feasibility study.** It exists to show what a Teverun scooter's firmware makes possible, not to be a finished product. Error-free operation is not promised and there is no warranty of any kind. Whatever you build here and flash, you do at your own risk. Read the [Disclaimer](#disclaimer) before you flash anything.

Everything runs in the browser. Nothing is uploaded, nothing is stored on a server and the page ships no firmware of its own.

**Open the patcher: [laufbursche42.github.io/tr-fw](https://laufbursche42.github.io/tr-fw/)**

---

## What this is

The patching used to live inside the Android and iOS apps. It moved here so the apps stay clean and so anyone can read what happens to a firmware image before running it.

You supply the stock image from your own scooter, the page applies the patch set and hands you a flashable Intel HEX back.

## What it builds

Three builds that exclude each other, because all three decide the same instruction in the four controller frame builders:

- **V44** the normal case.
- **V144** for controllers that read the setpoint scale the other way round and therefore get slower with V44 instead of faster.
- **V244** for older controllers that cannot switch their zero start off. On any other controller this one leaves the throttle dead.

What they contain and what changed is in the changelog: [German](CHANGELOG.de.md), [English](CHANGELOG.en.md).

## What it accepts

Only the stock **R5.4.19**. The check runs on the content of the image, not on the file name, so a differently formatted hex of the same firmware still passes:

```
trailer version   5.4.19
address range     0x08007000 to 0x0801DAFB
size              92924 bytes
CRC-16/MODBUS     0x3693
```

Anything else is refused with the reason: an Ali image, another stock version, an already patched file. The check sits in the patcher itself, not only in the page, so it cannot be clicked away.

## Before you flash

Use at your own risk. The warnings are shown when you build.

- **Fighter Mini Pro eKFV only.** The firmwares built with the Laufbursche Firmware Patcher are for the Teverun Fighter Mini Pro eKFV. The hardware is a Box C / IVCU-V5.X board (shared with the Blade GT II, Fighter 11 and Supreme+), but those models run their own firmware - do NOT flash these on them or on a Box A (HW V3.X), Box B (V4.X) or a C1 / C2 board.
- **A failed flash is almost always recoverable.** The bootloader clears its "app valid" flag before it writes and restores it only after the new image passes its checksum, so a bad, interrupted, cancelled or power-lost flash leaves the IVCU back in the bootloader - still in flashing mode, surviving a power-off and a Bluetooth disconnect - and you just flash again. The stock **R5.4.19** is your recovery firmware. This is not a guarantee - flashing always carries some risk (a wrong-but-checksum-valid image can still boot broken). See [why an interrupted flash is almost never a brick](#why-an-interrupted-flash-is-almost-never-a-brick) for the code proof.
- **It takes about 13 minutes.** Keep whatever does the flashing open and in the foreground for the whole run. The scooter has to stay switched on and within range.
- **Set the scooter Auto-Off to 30 min first.** Because the flash takes ~13 minutes, set the auto-off timer to 30 minutes (or Off) in the scooter's own display menu before you start. The app cannot change it - a shorter timer powers the scooter off mid-flash.
- **Reset the display wheel to 10 first.** If you ever changed the wheel size in the scooter's own display menu (P-settings) to anything other than 10, set it back to 10 there before you flash. This firmware never changes the display's stored wheel, so the display keeps showing that number - and a roadside check reads the wheel there. You set your real wheel size in the app instead: it applies only while unlocked and is forced back to 10 when you lock, so the display always reads 10.
- **Road approval.** Flashing non-stock firmware or unlocking the speed changes the approved configuration, with the road-approval and insurance consequences in the [Legal and safety](#legal-and-safety) note. The responsibility is yours.
- **First time? Do a dry run** by flashing the unmodified stock R5.4.19 once, so you have seen the whole flow before you change anything.

## Firmware (reverse engineering)

**Scope: the Teverun Fighter Mini Pro eKFV only.** Everything below was reverse-engineered from that one model's firmware - no other scooter was disassembled, so nothing here is assumed to transfer to another model.

This section documents what was found by reverse-engineering the scooter's own firmware, the VCU and the display. It explains why the 22 km/h eKFV speed limit cannot be lifted over Bluetooth alone **on the stock firmware**, what these builds change and where the remaining limits actually live. It is a research and educational record of how the hardware works; read the legal and safety note at the end before acting on any of it. Findings are firmware-verified for the eKFV (TDE) Fighter Mini Pro line unless noted otherwise.

### The double-gated 22 km/h speed clamp

On an eKFV unit the VCU firmware clamps the motor setpoint to `0x16`. A single internal flag controls the clamp. One instruction earlier the same flag also sets bit5 of the flag byte that names the setpoint scale to the motor controller. That is why a build has to treat both together. It is also why there is a build for controllers that read that bit the other way round. The flag is the OR of two independent gates:

```
clamp_active = (VCU identity[0..2] == "TDE")  OR  (display 0x4c / 0x35 frame, byte6 bit2 set)
```

When the flag is set, the four motor-command frame builders each force the setpoint down whenever the requested value is higher. Because the two gates are ORed, BOTH have to be off for the stock clamp to disappear, so changing the identity name alone does not raise the speed: the display keeps asserting its own gate.

The builds here take a different route. They leave both gates exactly where they are and replace what happens inside the branch the gates lead to. That is why they need neither a FIN rename nor a display patch. On a unit whose gates are already off nothing was ever clamped, so the Bluetooth lock has nothing to act on.

### Gate 1 - VCU identity

The VCU identity string is the same value the scooter advertises as its Bluetooth name (its FIN). It lives in the VCU's external I2C EEPROM config block and is mirrored into RAM at boot. If its first three characters are `TDE` the eKFV region restriction is latched on. The factory-default identity baked into the firmware image is `AWPE-VCU-220212`, which does not start with `TDE`, so a fresh VCU is unrestricted; the per-unit `TDE` marker is what a factory writes to enable the eKFV limit.

This gate is changeable at runtime over BLE. Command id 0x1f carries sixteen ASCII bytes, space padded. The VCU copies them into its identity. It is written to EEPROM, so it survives a reboot, needs no firmware flash and is fully reversible by writing the old name back. This was confirmed on a real eKFV / TDE unit: setting a non-TDE name showed the new name after reconnect and persisted across a scooter power cycle.

### Gate 2 - the display clamp bit

The eKFV display firmware sets the clamp bit - byte6 bit2 of the `0x4c` / command-`0x35` frame it sends to the VCU - unconditionally. Its frame builder asserts that bit on every frame, with no menu, setting or key combination to turn it off, so from the VCU's point of view the display gate is always on regardless of the identity.

The exact fix is a one-byte patch to the display application image. At image offset `0x1729e` the instruction `orr r1, r1, #4` (bytes `41 f0 04 01`) becomes `bic r1, r1, #4` (bytes `21 f0 04 01`), which clears the bit instead of setting it. This is the only site that controls that bit; the display recomputes the frame checksum at runtime, so the VCU still accepts the modified frame.

There is NO no-flash unlock for Gate 2 on this firmware. A magic word (`0xAA55AA55`) written to a display flash config page only toggles a display-internal lock flag; it does not change the transmitted frame, because the frame builder re-asserts the bit on every frame. That word is not writable over NFC either, so the aftermarket de-restriction NFC chips sold for other displays do not work here - those displays have a conditional frame builder, whereas the eKFV display forces the clamp bit in the frame itself.

### Removing the clamp in VCU firmware

Patching the display is one option; the other is to patch the VCU application firmware, which defeats both gates at once. Each of the four motor-command frame builders clamps the setpoint with a `movs r7, #0x16` that runs after a compare. Replacing those four instructions with NOPs removes the clamp, but only the clamp: the `orr r6, r6, #0x20` right before it stays, so the controller keeps being told the restricted setpoint scale and the scooter can end up slower rather than faster. Clamp and scale bit belong to the same branch and have to be handled together.

This NOP-the-clamp route drops the cap unconditionally. The [Laufbursche Firmware Patcher](https://laufbursche42.github.io/tr-fw/) instead redirects the four clamp sites to a small appended routine that reads a RAM lock flag at `0x20001B40`. Any non-zero value means open and the per-gear setpoint passes untouched; zero means locked and the routine caps the setpoint. V44 and V144 cap it at `0x14`, V244 caps at `0x50` and halves the result, which is why its locked speed follows the gear. Measured at the wheel the locked value is around 455 rpm.

The same routine decides bit5, the scale the controller reads the setpoint on. V44 lets it follow the lock, V144 leaves the stock instruction in place and V244 clears it always. That flag is toggled live over Bluetooth with the direct lock command (cmd 0x1B), so one and the same firmware boots locked and unlocks or re-locks on demand with no re-flash and no FIN rename.

The clamp is unique to the R5 line: the four `movs r7, #0x16` caps appear in R5.4.19 but are absent from the R3, R2 and D-series VCU images, which ship unrestricted. Because the R3 and R5 images share the same Box C flash base (`0x08007000`) and the same MCU and peripheral map, flashing an unpatched open R3-line image onto an R5 VCU de-restricts it with no byte patch at all - the version number is only a client-side software lock (the original app's name gate just wants a version segment ending in "5"), not a hardware difference. The stock R5.4.19 stays the recovery image to return to.

A patched image needs its CRC-16/MODBUS recomputed and its `:07AAA555` trailer record rebuilt. The bootloader checks only the CRC and the address range - there is no signature - so a correctly re-checksummed patched image is accepted.

Important caveat: these offsets are for the R5.4.19 image. A unit running R5.4.21 has different offsets and no 5.4.21 image is available, so patching a 5.4.21 unit requires re-locating the four clamps in the correct image first. There is also a recovery risk: flashing is one-way because the firmware cannot be read back over BLE (see the next subsection), so a known-good image for the exact version on the scooter is the only safety net before any flash.

### The live speed lock

Every patched R5.4.19 build boots LOCKED at 22 km/h. To unlock or re-lock the speed live over Bluetooth - with no re-flash - triple-tap the VCU speed tile on the main screen. This sends the direct lock command (cmd 0x1B); it is not a FIN rename and needs no display step. The tile colour shows the current state, read straight from the scooter's telemetry (`55 71`). Unlocking lifts the 22 km/h cap, brings your stored cruise mode back and lets the app's Wheel size drive the speedometer; locking caps you back at 22, turns cruise off and forces the stock 10.0" wheel on the display for a correct legal speed reading. The unlock holds while the scooter stays on and every restart comes up locked again. Every step is reversible.

### VCU bootloader OTA and firmware read-back

The VCU bootloader exposes exactly five write commands over the OTA protocol - START, FINISH, INFO, PACKINFO and PACKDATA (ids `0x710` to `0x714`). Integrity is a CRC-16 (polynomial `0x8005`) only; there is no signature check.

Crucially there is no read-back, dump or memory-read command. Full decompilation of the bootloader confirms a single command dispatcher with a whitelist of just those five ids and no read path, so the VCU firmware cannot be extracted over BLE - this is proven, not merely assumed. The bootloader's RDP-unprotect routine is present but is dead code with no caller. Reading the firmware out requires hardware SWD / JTAG on the VCU board. The practical consequence is that a flash is one-way: there is no way to make a byte-exact backup of the running firmware over Bluetooth first.

### Why an interrupted flash is almost never a brick

The bootloader makes a failed flash fail-safe. This is provable in the binary. The addresses below are from the ALI D3.4.12 bootloader (`AWIVCU_ALI_D3_4_12_bootloader.bin`, byte-identical to `chipdump[0x0000:0x7000]`). The R5 bootloader cannot be read back, but the R5 and ALI apps share the same flash layout and the same flash-driver key constants at identical addresses, so the R5 bootloader is expected to be identical - inferred, not byte-proven for R5.

Everything hangs on an "app valid" magic word `0x5A5A5A5A` in a flash flag page at `0x0801F800`, erased first and re-written last:

- **Boot decision** (`0x08003CAE`) - each service-loop pass the bootloader jumps into the app at `0x08007000` only if `*0x0801F800 == 0x5A5A5A5A` (app valid) AND there is no pending update-request flag (`0xA5A5A5A5` at `0x0801F000`) AND no OTA frame is already queued. Otherwise it stays in the bootloader servicing OTA; a blank or half-written app has no magic, so it stays put.
- **INFO erases the flag first** (`0x08005C66`, erase at `0x08005A4A`) - once INFO confirms the target is the app base, it erases `0x0801F800` (magic -> `0xFFFFFFFF`) BEFORE any app byte is written.
- **FINISH restores it only on a CRC pass** (`0x08005C20`, program at `0x08005A7E`) - the image CRC-16 is verified and only then is `0x5A5A5A5A` programmed back; on CRC failure the flag stays erased.
- **The OTA writer cannot reach the bootloader** (`0x08005964`) - every write is range-gated to `[0x08007000, 0x0801EFFF]` (the app window), so the bootloader region `0x08000000-0x08006FFF` and the flag pages are physically unreachable by any payload.

So any interruption between INFO and a good FINISH - power loss, Bluetooth or CAN drop, cancel, a brown-out mid-write - leaves the magic erased and the next boot stays in the bootloader, re-flashable. The flag is in flash so it survives a power-off; the bootloader just idles for the next frame so it survives a Bluetooth disconnect.

It is "almost never", not "never". Integrity is a **CRC-16 (poly `0x8005`) only, no signature** (`0x08005AE4`), so a wrong-but-CRC-valid image passes FINISH and the box boots a broken app; re-entry is a normal command rather than a race: the running application programs the `0xA5A5A5A5` enter-update request itself (`0x08016EF2`, reached from the OTA handler at `0x0801A572`) and resets into the bootloader, so a box that still runs its application can always be sent back into update mode; a box whose application no longer starts leaves only the power-on window, otherwise SWD / JTAG. And external corruption of the bootloader pages (a flash-cell failure or an SWD mishap) is not OTA-recoverable. Keep the stock R5.4.19 as the recovery image.

### Display firmware flashing

The display has its own UART bootloader. It accepts an image with only a CRC-16 integrity check (polynomial `0x8005`, init `0xFFFF`) - no model, version or signature gate - and it writes only display flash; the VCU is never touched. It is recoverable rather than a one-way brick: the application-valid magic is committed only after a CRC plus read-back verify, the bootloader region itself is never erased and a failed flash simply leaves the bootloader waiting for a new image.

Protocol: an enter-update handshake (`11 22 33 44 55 66 77 88` followed by a mode byte) then block-write frames (`0x88` header, big-endian destination offset, CRC-16 over the payload) or equivalently START / DATA / FINISH commands.

Critical constraint on this unit: the stock VCU application firmware has NO display-OTA relay. The display is a UART device on USART3, the CAN bus is the BMS bus and the VCU app has no handler for the display-OTA command group. So a display image cannot be delivered as a pure-BLE app -> VCU -> display relay; reaching the display bootloader requires a direct UART connection to the display line. The original Teverun app does expose a display update, but it is gated to the "ver2" platform, so a TDE / eKFV unit cannot use it. In that app the display image format is Intel-HEX with a `:07AAA555` trailer record (uId, proId, version, CRC-16/MODBUS); a raw `.bin` is rejected.

### Region write-protection - locked vs free settings

This is the **stock** firmware. When the identity is `TDE` the VCU latches a country / region write-protection. An app can display every setting the VCU supports while the VCU quietly ignores the protected ones on the way out. Almost everything is still stored: the settings handler copies all sixteen payload bytes into the gear table unchecked. Only two control bits are really vetoed. What the table describes is therefore where a value stops having an effect, not where it stops being written.

In every build here that changes, because the read that latches this is redirected to the Bluetooth lock flag. The rows marked below follow the lock instead of the identity.

| Setting | State | Where the limit lives |
|---------|-------|-----------------------|
| Main speed limit + per-gear speed | Locked in stock, follows the lock in every build | stock hard-caps it in the four motor-frame builders; a build caps it only while the lock flag is zero |
| Cruise control (Tempomat) | Locked | VCU write-protects it (it keeps the old control-byte bits) |
| Wheel size | Locked in stock, follows the lock in every build | stock never applies the value; a build keeps it across a restart and feeds the speedometer with it, but it still never reaches the motor controller |
| Motor pole pairs | Locked | VCU never applies the value |
| Front current limit | Locked | forced to 0 by the separate motor-controller (ESC) firmware, unreachable from the app |
| Rear current limit | Locked | forced to 0 by the separate motor-controller (ESC) firmware, unreachable from the app |
| ABS | Free | works normally |
| Start / launch mode | Free | works normally |
| Front start level | Free | works normally |
| Rear start level | Free | works normally |
| EABS level | Free | works normally |
| Protection temperature | Free | works normally |
| Pack voltage | Free | works normally |
| Eco | Free | works normally |
| Units (km / mph) | Free | works normally |
| Anti-theft (electronic lock) | Not functional on eKFV | needs the original GPS / immobilizer module, which this unit lacks - it is the GPS hardware that decides this, not the T1 / T2 model - and the VCU has no handler for the toggle, so it does nothing here |
| Smart / TCS | Free | works normally |
| Gear selection | Free | works normally |
| Motor mode | Free | works normally |

The speed cap and the cruise lock are direct eKFV region protections latched by the `TDE` identity. Wheel size and motor pole pairs are simply never applied by this VCU - a structural limitation that manifests as a lock on TDE units. The two current limits are enforced one layer deeper, in the motor-controller (ESC) firmware, so no app can reach them; the VCU forwards them but the ESC reports 0 back every status frame.

### Sleep and power-off timer quirk

The sleep timer and the power-off timer are neither readable nor writable over BLE on this VCU, because of a firmware bug rather than a region lock. The `55 71` settings-echo frame builder copies only 16 payload bytes, so byte `t[18]` - which is supposed to carry the sleep timer and power-off timer - is never written; in the stock image the loop that should fill it is dead code. In a build those bytes carry the lock state instead. Either way `t[18]` stays empty. The inbound settings-write path drops the same byte. As a result those two timers live only in the VCU EEPROM config and can only be set from the scooter's on-display P-menu. The official app hides this by showing its own cached value; Laufbursche Edition therefore does not expose these two timers at all.

### Inter-MCU transport map

The controllers on this platform are wired as follows:

| Bus | Role |
|-----|------|
| USART1 | the BLE / phone link (the `0xAA` app-command protocol) |
| USART2 | the motor controller link; the frames with the setpoint go out here and the `0x71` answer comes back |
| USART3 | the display link (`0x4c` / `0x8a` / `0x8b` / `0x8c` frames) |
| CAN | the BMS / battery bus |

The display is UART-connected, not on CAN. This is why a display firmware update cannot be relayed through the VCU over BLE - there is no path from the phone link to the display line inside the VCU app - and why reaching the display needs a direct UART connection.

### Original Teverun app behaviour

A few behaviours of the official Teverun app explain why this app is built differently. The official app persists the whole settings state to disk per device, rewrites it on every change and has no targeted single-field write: any user action re-sends all five gear profiles from that (partially stale) cache, which can silently overwrite per-gear values the rider had set. That is the origin of the common complaint that "the app changed my settings". It also carries hardcoded per-model default tables. Laufbursche Edition avoids this by using an explicit Save, targeted per-gear writes and no persistence of VCU values on the phone.

### Chip and hardware access

The VCU carries an ARM Cortex-M4F on an STM32F1-style peripheral map, so a GD32F303-class part rather than the F103 it looks like at first glance. The image enables the FPU, uses VFP instructions and sets a flash latency an F103 does not offer. The SWD pads are the standard SWDIO / SWCLK pair. Reading the RDP / option-byte state over SWD is non-destructive - you can check whether the flash is readable without erasing it - which is the safe first step before considering any hardware dump. Actually reading the firmware out (for a backup) requires this SWD access; it cannot be done over BLE.

### Legal and safety

Removing the 22 km/h limit takes the scooter out of its eKFV road approval (ABE) and voids its insurance, so any de-restriction is for private-ground or research use only. This section explains what this page builds and where the findings behind it come from; it is not a how-to endorsement for public-road use. On a public road the scooter must keep its approved configuration.

## Disclaimer

**Feasibility study, no warranty.** This patcher is a feasibility study. What it builds is provided "as is". Nothing here promises that a build is free of defects, that it suits your scooter, that a value it reports is correct or that it still behaves the same after the next controller or display revision. The measurements quoted come from a small number of machines, in places from a single one. Where that is the case it is marked.

**At your own risk.** You build and flash at your own risk. As far as the law allows, the developer is not liable for damage to the scooter, its controller, its battery or any other part, for lost data, for injury or for any other loss that comes out of using this page or the firmware it builds. Flashing can leave a scooter unusable until a flash completes. It can void its warranty. Keeping to road traffic law stays your job: a scooter set up outside its approved configuration does not belong on public roads.

**Not the manufacturer's firmware.** This page ships none. You supply the stock image from your own scooter and it stays on your device. The stock firmware is the manufacturer's work and this page grants you no right in it.

## Trademarks

This is an independent, community project. It is not an official Teverun tool and the developer ("Laufbursche") is not affiliated with, endorsed by or connected to Teverun. "Teverun" and other product names are trademarks of their respective owners; the name is used here only descriptively to indicate the scooters this page works with. See [TRADEMARKS.md](TRADEMARKS.md) for details.

## License

PolyForm Noncommercial 1.0.0, in full in [LICENSE.md](LICENSE.md). The source is public so that anyone can read what the tool does. It is not free for commercial use.
