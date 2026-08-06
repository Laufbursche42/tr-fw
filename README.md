# Laufbursche Firmware Patcher

A web page that builds a Laufbursche firmware for the **Teverun Fighter Mini (eKFV)** from the stock firmware of your own scooter.

> **This is a feasibility study.** It exists to show what a Teverun scooter's firmware makes possible, not to be a finished product. Error-free operation is not promised and there is no warranty of any kind. Whatever you build here and flash, you do at your own risk. Read the [Disclaimer](#disclaimer) before you flash anything.

Everything runs in the browser. Nothing is uploaded, nothing is stored on a server and the page ships no firmware of its own.

**Open the patcher: [laufbursche42.github.io/tr-fw](https://laufbursche42.github.io/tr-fw/)**

Or run it yourself, no build step, no dependencies: clone the repo and serve the folder over a local HTTP server. Opening `index.html` directly as a `file://` URL will not work, the page fetches its own documents and browsers block that over `file://`.

```
git clone https://github.com/Laufbursche42/tr-fw.git
cd tr-fw
npx serve .
```

Any static server works. Without Node, Python's own one does the same job:

```
python -m http.server 8000
```

Then open the printed address in a browser that supports Web Bluetooth.

---

## What this is

The patching used to live inside the Android and iOS apps. It moved here so the apps stay clean and so anyone can read what happens to a firmware image before running it.

You supply the stock image from your own scooter, the page applies the patch set and hands you a flashable Intel HEX back.

## What it builds

Three builds, one at a time. Two of them unlock. Those two exclude each other, because both decide the same instruction in the four controller frame builders:

- **V46** the normal case. It leaves the setpoint scale bit the way the controller gets it from the factory.
- **V246** for older controllers that cannot switch their zero start off. On any other controller this one leaves the throttle dead.

Those two let you pick the speed the scooter is clamped to while it is locked, as two separate numbers out of `19`, `20`, `21` and `22`: one that applies while the scooter has not been unlocked since it was switched on, one that applies after it has been unlocked and locked again. These are the firmware's own setpoint units, not km/h. `20` is the value every build so far shipped and measures 455 rpm at the wheel; what that turns into on the road depends on the scooter, which is why it can be set.

The third one unlocks nothing:

- **EEPROM reset** genuine stock firmware plus one call that puts the stored ride settings back to the factory table on the next start. It carries no lock, no clamp and no wheel size handling. It is never combined with either of the other two. It has its own section: [EEPROM reset](#eeprom-reset).

What they contain and what changed is in the changelog: [German](CHANGELOG.de.md), [English](CHANGELOG.en.md).

## What it accepts

The stock **R5.4.19** and the stock **R5.4.21**. The check runs on the content of the image, not on the file name, so a differently formatted hex of the same firmware still passes:

```
trailer version   5.4.19                        5.4.21
address range     0x08007000 to 0x0801DAFB      0x08007000 to 0x0801DBDB
size              92924 bytes                   93148 bytes
CRC-16/MODBUS     0x3693                        0x5DA5
```

Anything else is refused with the reason: an Ali image, another stock version, an already patched file. The check sits in the patcher itself, not only in the page, so it cannot be clicked away.

The build is made from the file you uploaded, so its name already carries that stock version, `AWIVCU_APP_R5_4_19_V46.hex` or `AWIVCU_APP_R5_4_21_V46.hex`. That is there for the moment several builds sit in your downloads folder: the name alone tells them apart, so the right one goes on the right scooter without opening any of them again.

## EEPROM reset

### The problem

Flashing a stock image back does not put the scooter back to stock.

- The ride settings are not in program flash at all. They live in the VCU's own EEPROM.
- A flash writes only the program, so the settings a patched build stored stay exactly where they were, no matter how clean the program image above them is afterwards.
- Cruise control is where this shows up first. Switch it on under an unlocked build and it is still on after a stock reflash, because nothing in the stock start-up ever puts that byte back.

### How it works

The **EEPROM reset** build is genuine stock firmware with one addition: a single start-up call is redirected to a short appended routine.

The start-up sequence calls the settings loader once. On R5.4.19 that call is at `0x08017958`, bytes `ff f7 84 fc`, a `bl` to the loader at `0x08017264`. The build writes `06 f0 d0 f8` over those four bytes, a `bl` to a 72-byte routine appended past the end of the image at `0x0801DAFC`. On R5.4.21 the same call sits at `0x08017A38` with the same stock bytes `ff f7 84 fc`, its loader at `0x08017344`, redirected to the routine at `0x0801DBDC`. Call site and routine move by the same 224 bytes there, so the four patched bytes are identical on both bases.

That routine does three things, in this order, unconditionally:

1. **Flips one bit in each of five checksummed bytes of the settings block.** It loads `r1` with the block's RAM address `0x20001A28`, then for each of the offsets 0x2F, 0x30, 0x31, 0x32 and 0x33 reads the byte with `ldrb.w`, XORs it against 1 with `eors` and writes it back with `strb.w`. Two further bytes, 0x36 and 0x37, are left untouched entirely: they sit past the block's own checksum span and are not needed to trigger the mismatch below.
2. **Calls the factory-table writer** (`0x0801720A` on R5.4.19, `0x080172EA` on R5.4.21). The writer copies the factory table held in ROM at `0x0801D78C` (`0x0801D86C` on R5.4.21) into the block: offsets 0 to 8 one byte at a time, then offsets 0x2D and 0x2E zeroed outright, then a 0x24-byte copy from table+9 into block+9, which is the gear table, six gears of six bytes. It ends with `movs r0, #1` / `bl 0x0801700C` (`0x080170EC` on R5.4.21), the save routine, which checksums the first 0x34 bytes, stores the result as a halfword at offset 0x34 and writes the whole 0x38-byte block back to the EEPROM.
3. **Calls the settings loader** (`0x08017264`, `0x08017344` on R5.4.21), the same routine the redirected call was going to, so start-up carries on with the values that were just written.

**The unconditional call is the whole mechanism.** Stock keeps the writer behind a checksum check. The loader reads the 0x38-byte block out of the EEPROM, checksums its first 0x34 bytes and compares that against the halfword stored at offset 0x34: at `0x08017280` on R5.4.19 `cmp r0, r5` / `beq 0x0801728A` / `bl 0x0801720A`, at `0x08017360` on R5.4.21 the same three instructions with `beq 0x0801736A` / `bl 0x080172EA`. The writer is the mismatch branch. A block that an unlock build left checksummed and valid therefore never gets rewritten by stock. The appended routine calls the writer regardless, so the block is reset even when its checksum still looks valid.

**What comes back.** Cruise control is the field this was built for. It is byte 0 of the block. The save path stores it there from RAM `0x2000029B` (`0x08017C64` on R5.4.19, `0x08017D44` on R5.4.21: `ldr r0, =0x2000029B` / `ldrb r0, [r0]` / `ldr r1, =0x20001A28` / `strb r0, [r1]`) and the loader reads that same byte back into `0x200002D1` (`0x08017294`, `0x08017374` on R5.4.21). The writer overwrites it with table byte 0 like every other field, alongside:

- wheel diameter
- speed limit
- pack voltage
- the gear table, block offsets 0x09 to 0x2C, which the loader fans out into five per-gear arrays from `0x2000029F` on

**The five flipped bytes.** They are not settings. The loader reads block offsets 0 to 9, the gear table at 0x09 to 0x2C and the two bytes 0x2D and 0x2E, then stops. Nothing reads 0x2F to 0x33.

They sit inside the block's own checksummed span, the first 0x34 bytes, which is the whole point: touching any one of them already breaks the stored checksum and forces the mismatch the writer call needs. A single bit flip per byte does that while overwriting as little as possible of whatever was there before, rather than a blanket zero. Offsets 0x36 and 0x37 are reserved too but sit past the stored checksum at 0x34 / 0x35, so nothing here needs to touch them at all, and nothing does.

### What needs this build and what does not

The number an unlock build reports over Bluetooth and the ride settings in the EEPROM are two different things. Only the settings need this build.

**The reported version number clears itself.** An unlock build stamps its own number by replacing one read instruction, at the exact point the `55 43` hardware-info frame is assembled. On R5.4.19 that site is `0x0800C5DE` (shifted on R5.4.21). Stock does `ldr r7, [pc, #0x184]` / `ldrb r7, [r7]`, which loads the live hardware-info byte from RAM `0x20000019`. The very next instruction `strb.w r7, [ip, #4]` drops it into the outbound frame buffer. The build overwrites just the load pair with `movs r7, #<number>` plus a `nop`. The store into the frame stays stock. Nothing in that function writes anything back.

The genuine byte behind it is untouched by every build. RAM `0x20000019` is EEPROM block 0 offset 5. Stock alone maintains it: it is filled from live wire data at `0x0801840E` and copied into the block 0 shadow at `0x08017BF2`. No build references `0x20000019`, the block 0 shadow `0x200019D8` or any block 0 save. The stamped number therefore exists as one immediate in program flash and nowhere else. Flash a stock image over it and the next hardware-info frame already reports whatever that untouched EEPROM byte really holds. That happens by itself, with no reset build, no special boot and no sequence.

Two further values a build reports work the same way and vanish the same way:

- **The lock state in the `55 71` telemetry frame.** At `0x0800BF5E` the build fills one payload byte from RAM `0x20001B40`, in place of a fill loop that is dead code in stock. That byte is what the app's tile colour reads.
- **The wheel diameter in two frame builders**, `0x0801083C` and `0x08010B64`. While locked they report a fixed `0x64`, the stock 10.0 inch value, instead of the stored byte.

Both are plain reads out of RAM into a transmit buffer. The build's own flags `0x20001B40` to `0x20001B43` live in free RAM well past the end of every EEPROM shadow, which ends at `0x20001A88`. They are zeroed at every boot by the start-up hook at `0x08007150`. They have no write side anywhere.

**The stored settings do not clear themselves.** Cruise control is a real runtime write. Under an unlock build the display's cruise bits are merged into RAM `0x200002D1` at run time (`0x0800F8B0`, redirected to an appended routine, plus the fan-out at `0x0800D2E2`). The ordinary settings save then puts that value into the block and calls the save routine, which pushes all 0x38 bytes into the EEPROM. Program flash never enters into it, so replacing the program leaves the byte standing. That is the difference: a stamped number is code, cruise control is data.

Cruise control is not the only field an unlock build can leave behind. Three paths persist something:

- **Cruise control**, block byte 0, as above.
- **Wheel size**, block byte 3. The appended wheel routine writes an incoming wheel byte into the block shadow at `0x20001A28 + 3` and calls the save routine directly (`movs r0, #1` / `bl 0x0801700C`) whenever it differs from the stored one. The same builds also nop stock's forced overwrite of RAM `0x2000029D` at `0x0801730E`, so a non-stock wheel size survives in RAM and can reach the same block byte through the ordinary settings save as well.
- **The corrected defaults**, block bytes 3, 6 and 7. The unlock builds change three bytes of the factory table itself in flash: table+3 wheel diameter `0x6E` to `0x64`, table+6 `0x30` to `0x2A` and table+7 `0x3C` to `0x34` for the pack voltage. Stock calls the factory-table writer on its own whenever the block checksum does not match at start-up. If that ever happens under an unlock build the corrected numbers are what gets written, so they land in the EEPROM and survive a reflash to stock. This is the one case where a number belonging to these builds, rather than a stock-range rider setting, can end up stored at all.

All three sit in EEPROM block 1 and this build rewrites all 0x38 bytes of that block, so all three come back to factory. The eraser's own factory table is the genuine one, because the build carries nothing but the redirected call plus the routine. No build writes to block 0 or to any other block. The one save call that any build makes on its own passes `r0 = 1`, which is block 1.

So the short version. The reported build number goes away the moment the program flash is replaced, because it never was anywhere but in the program. The ride settings stay until something writes over them, which is what this build is for.

### What it does not do

It unlocks nothing. This is about the code in the image, not about what the reset writes. It carries:

- no speed clamp
- no lock flag
- no wheel size handling: none of the appended wheel routine that lets a rider set and store a custom wheel size over Bluetooth, none of the fixed 10.0 inch on the display while locked, so there is no way to set a wheel size at all
- no corrected defaults: its own factory table at `0x0801D78C` is the genuine one, without the three changed bytes

The last two are features this build does not have, not data it leaves alone. Rewriting the whole settings block does put the stored wheel size back to factory along with the wheel diameter and pack voltage numbers, precisely because the table it copies from is the unmodified one.

### How to use it

It only ever appears in one sequence:

1. Flash the **EEPROM reset** build once and let the scooter boot. That one boot is what does the work.
2. Flash a genuine, unmodified stock image over it.

> **Never use V46 or V246 as that second step.** Both are themselves non-stock: they report their own version number over Bluetooth, run patched code and carry their own corrected wheel diameter and pack voltage bytes in place of the genuine factory ones. Finishing with either one leaves the scooter visibly modified again, no matter what the EEPROM now holds. Build the eraser and a genuine stock image as the pair they are meant to be.

After the second step the program flash is the manufacturer's own image byte for byte and the settings block holds the factory values, so neither of the two carries anything left over from a patched build.

Two details on the build itself:

- **The version byte is deliberately left alone.** The other builds stamp their own number into the byte the scooter reports over Bluetooth. This one does not touch it, because the firmware really is stock apart from that one call, so the scooter keeps reporting its stock version. Its file is named `AWIVCU_APP_R5_4_19_ee.hex` rather than after a version, for the same reason.
- **Exactly two changed places.** Built from either stock version the image differs from the stock image in exactly two places: four bytes at the redirected call, plus 48 appended bytes holding the routine.

## Check your EEPROM

The EEPROM reset build puts the stored settings back to the factory table on one boot. Nothing on the scooter says whether that boot did its job. **Check your EEPROM** is the button that answers it: it connects to your own scooter over Bluetooth, straight out of this page, then opens a window showing the settings the controller reports right now beside the values the factory table holds. A copy button at the bottom puts the whole reading on the clipboard.

It is a capability of its own, not part of a flash. The flashing can happen on the flashing page next door or out of an app, so this check is deliberately not tied to wherever that happened. A rider runs it once before flashing and once after, then compares the two readings.

### What it reads

There is no read command in this firmware. The controller sends its `55 71` settings frame on its own and the page reads the fields out of that frame, so the scooter has to be switched on and in range. Nothing is ever written to it, no setting is changed and no firmware is touched: the page only listens plus the keep-alive that holds the Bluetooth link open. The device chooser lists the scooter under its Bluetooth name, which starts with `TDE` or with `T1`.

The window reads every command the controller streams on its own that carries anything other than live, constantly-changing sensor telemetry, not a curated subset: the `55 71` settings echo in full, including the fields the running firmware itself overwrites or masks before the rider ever sees them (each of those carries its own explanation behind a `?` button rather than being left out), plus `55 42` (a frame number), `55 43` (firmware version and build), `55 73` (an odometer counter), the SOC/SOH bytes of `55 52`, and the stored fields of `55 53` (battery capacity, charge cycles, cell count). Left out on purpose are the frames that carry only a live measurement with no persistence found anywhere on the scooter or the battery: `55 72` (live speed and ECU fault bits), `55 51`/`55 55`/`55 56` (per-cell voltages), the rest of `55 52` (pack volt, current, temperatures), `55 54` (active fault bits) and the balance bits and voltage extremes inside `55 53` itself. A full sweep of every flash-write site in the VCU firmware confirmed none of these ever reach the VCU's own EEPROM; the only persistence found for them lives on the vendor's cloud backend, unreachable from this offline, BLE-only tool.

**Identity, stored but not reset by the eraser build:**

| Field | Notes |
|-------|-------|
| FIN (Bluetooth name) | lives in the Bluetooth module's own storage, not EEPROM block 1; settable over Bluetooth (VCU command `0x1F`, same as the original app's rename screen: name must start with `T` or `BT04`, 16 characters max); unaffected by a reset |
| Frame number | its own 80-byte EEPROM region (offset `0x00`), separate from the 56-byte settings block; no write path found, not Bluetooth-settable; unaffected by a reset |
| VCU version | same 80-byte EEPROM region as the frame number; not Bluetooth-settable, only a firmware reflash changes it; unaffected by a reset |
| Laufbursche build | on unlock/kickstart builds a literal baked into the flash code; on stock or a bare eraser build it reads an EEPROM byte from the same region as the version instead, showing a dash; not Bluetooth-settable; unaffected by a reset |
| Identity byte `0x03` | block 0, arrives in the same `55 43` frame as the VCU version; no meaning found in the firmware, shown as a raw number |
| Identity byte `0x06` | block 0, next to the Laufbursche build byte, rewritten by the same calibration routine; no meaning found |
| Identity byte `0x07` | block 0; the firmware forces it to 0 on every calibration pass |
| Identity byte `0x0B` | block 0, next to the checked version block but outside its checksum; factory default 21 (`0x15`), no meaning found |
| Identity block `0x2F` | four bytes from block 0, factory default `0x14160C01`; nothing in the firmware interprets them |
| Odometer | a 4-byte counter kept as two wear-levelled EEPROM copies, separate from the 56-byte settings block; no write path found, not Bluetooth-settable; unaffected by a reset |
| Battery capacity | from the battery's own BMS chip, behind its own CAN wire, not the VCU; not Bluetooth-settable; unaffected by any patch or reset |
| Charge cycles | same battery BMS storage; not Bluetooth-settable; unaffected by any patch or reset |
| Battery cells | same battery BMS storage; not Bluetooth-settable; unaffected by any patch or reset |
| SOC (state of charge) | live on the VCU side (no EEPROM write path found there); the battery's separate BMS chip does contain a genuine flash storage driver of the kind an SOC baseline would need, but which value it actually holds could not be confirmed |
| SOH (state of health) | same open question as SOC: live on the VCU side, plausibly persisted on the battery's own BMS chip, unconfirmed |

**Gear-independent settings, with the factory value each one is compared against:**

| Field | Factory value | Notes |
|-------|---------------|-------|
| Cruise control | `0`, off | `1` is automatic, `2` is manual |
| EABS brake | off | |
| Kickstart | off | the zero-start flag |
| Rear motor free | on | |
| Dual motor mode | on | not a front-motor status, see the `?` note |
| Smart mode (TCS) | off | traction control, auto single/dual motor switching |
| AT mode | off | anti-theft: locks the motor until a phone connects |
| Miles display | off | the scooter's own display, not this page |
| Eco mode | | masked out on load and on save, session-only, see the `?` note |
| Power limit (%) | `100` | not a real speed value despite the firmware's own field name, see the `?` note |
| Overtemperature threshold | `120` | |
| Voltage code | `48` | a corrected-defaults unlock build writes `42` |
| Pack voltage | `60` | a corrected-defaults unlock build writes `52` |
| Wheel size | `10.0` inch | not meaningful on stock, see below |
| Motor pole pairs | | forced by the firmware at every boot, see below |

**Per-gear settings, one column per gear, factory value against the gear of that column:**

| Field | Factory value | Notes |
|-------|---------------|-------|
| Front current | `15` in gear 1 | |
| Rear current | `15` in gear 1 | |
| EABS level | equals the gear number | one value for the whole gear, not split front/rear |
| Front start level | equals the gear number | shares a byte with the EABS level, unrelated to it |
| Rear start level | equals the gear number | |
| Gear speed limit | twenty times the gear number | the byte the eKFV's 22 km/h clamp actually targets |

**Pack voltage is the single strongest field.** It is a plain byte and the two unlock builds carry their own number for it, `52` in place of the factory `60`, so a `60` after a reset boot is the clearest sign that the settings block really was rewritten. The voltage code beside it works the same way, `48` against the builds' `42`.

**Only the active gear is ever reported.** The frame carries the front current and the rear current for the gear the scooter is in at that moment, so the window can show one gear row at a time and names which gear it belongs to. Switch gears on the scooter to see another one. The factory set for gear 1 is front current `15`, rear current `15`.

### What it cannot show

**The wheel size is not evidence on stock firmware.** The byte that carries it in the `55 71` frame is a hard-coded constant on genuine stock firmware, `0x64`, the 10.0 inch value, whatever the EEPROM below it actually holds. Stock reports `10.0` inch even when the stored wheel size is something else entirely. That is exactly the state this check is meant to look at after a reset, so the field can never prove anything there. The window shows it anyway, greyed out with that note on it, because leaving it out silently would be worse than showing it marked. Read the other fields instead.

### Address reference

For anyone who wants to read the disassembly alongside this page. Five separate EEPROM records exist on this VCU: block 0 at physical I2C address `0x00` (80 bytes, holds the FIN's fallback frame number and the VCU version), block 1 at physical address `0x50` (56 bytes, everything below), blocks 2 and 3 at physical `0x88` and `0x94` (12 bytes each, a wear-levelled pair holding nothing but the odometer, its own generation counter and a checksum), and block 4 at physical `0xA0` (16 bytes of internal mode and calibration state for the motor-control code, with no Bluetooth exposure at all, mentioned here for completeness and absent from every table below). Offsets in this table are relative to the start of whichever block is named, not the physical I2C address. RAM addresses are where the VCU keeps its live copy; the BLE index is the byte the `55 71` frame carries it at, unless another command is named.

**Block 1 (the one the EEPROM eraser build restores), gear-independent bytes:**

| Field | Block-1 offset | RAM address | BLE index |
|-------|-----------------|-------------|-----------|
| Cruise control | `0x00`, bits 1-2 | `0x2000029B` | `t[4]` |
| EABS brake | `0x00`, bit 3 | `0x2000029B` | `t[4]` |
| Kickstart | `0x00`, bit 6 | `0x2000029B` | `t[4]` |
| Rear motor free | `0x00`, bit 7 | `0x2000029B` | `t[4]` |
| Dual motor mode | `0x01`, bit 7 | `0x2000029A` | `t[16]` |
| Smart Mode | `0x2E`, whole byte | `0x2000030A` | `t[17]`, bit 4 |
| AT mode | `0x08`, bit 2 | `0x200002D2` | `t[17]` |
| Display in miles | `0x08`, bit 1 | `0x200002D2` | `t[17]` |
| Eco mode | `0x08`, bit 0 | `0x200002D2` | `t[17]` |
| Power limit (%) | `0x05` | `0x200002B1` | `t[11]` |
| Overtemperature threshold | `0x04` | `0x2000029E` | `t[7]` |
| Voltage code | `0x06` | `0x200002BE` | `t[14]` |
| Pack voltage | `0x07` | `0x200002BF` | `t[15]` |
| Wheel size | `0x03` | `0x2000029D` | `t[6]` |
| Motor pole pairs | `0x02` | `0x2000029C` | `t[5]` |

**Block 1, per-gear bytes** (a 6-byte record per gear at block-1 offset `0x09 + 6 × gear`, gear 0-5):

| Field | Record offset | RAM array | BLE index |
|-------|----------------|-----------|-----------|
| Front current | `+5` | `0x200002B8[gear]` | `t[12]` |
| Rear current | `+4` | `0x200002B2[gear]` | `t[13]` |
| EABS level | `+2`, high nibble | `0x2000029F[gear]` | `t[9]`, high nibble |
| Front start level | `+3`, low nibble | `0x200002A5[gear]` | `t[8]`, low nibble |
| Rear start level | `+2`, low nibble | `0x2000029F[gear]` | `t[9]`, low nibble |
| Gear speed limit | `+1` | `0x200002AB[gear]` | `t[10]` |

**Everything else this page shows:**

| Field | Location | RAM address | BLE index |
|-------|----------|-------------|-----------|
| FIN | Bluetooth module's own storage, not EEPROM | - | `55 42`, ASCII |
| Frame number | Block 0, offset `0x34`, 19 bytes | `0x2000070E` | `55 42`, ASCII |
| VCU version | Block 0, offset `0x0D`-`0x0F` | `0x20000011`-`0x20000013` | `55 43` |
| Laufbursche build | flash literal at `0x0800C5DE` (unlock builds only) | `0x20000019` (stock/eraser only) | `55 43` |
| Identity byte `0x03` | Block 0, offset `0x03` | `0x20000014`+3 | `55 43`, `t[9]` |
| Identity byte `0x06` | Block 0, offset `0x06` | `0x2000001A` | `55 43`, `t[7]` |
| Identity byte `0x07` | Block 0, offset `0x07` | `0x2000001B` | `55 43`, `t[8]` |
| Identity byte `0x0B` | Block 0, offset `0x0B` | `0x2000000C`+3 | `55 43`, `t[5]` |
| Identity block `0x2F` | Block 0, offset `0x2F`-`0x32`, 4 bytes | `0x2000002C` | `55 43`, `t[10]`-`t[13]` |
| Odometer | two wear-levelled EEPROM copies, physical `0x88` and `0x94` | `0x200002F8` | `55 73` |
| Battery capacity, charge cycles, cell count, SOC, SOH | battery's own BMS chip, a separate EEPROM behind CAN | - | `55 53`, `55 52` |

### What you need

Web Bluetooth, which is not in every browser:

- **Chrome or Edge on Windows, macOS and Linux.**
- **Chrome on Android.**
- **[Bluefy](https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055) on iPhone and iPad.** Safari has no Web Bluetooth, so on iOS it takes a dedicated browser like this one.
- **Not Safari, not Chrome, not Firefox on iOS.** Apple requires every iOS browser to run on Safari's own engine, so none of them can do Web Bluetooth there either, only a browser built specifically for it like Bluefy can.

The connection goes from your browser to your own scooter and nowhere else. Nothing is uploaded, no reading is stored on a server and the clipboard copy is yours to do what you want with. That is the same stance as the rest of this page, set out in [Privacy](PRIVACY.en.md).

## Before you flash

Use at your own risk. The warnings are shown when you build.

- **Fighter Mini Pro eKFV only.** The firmwares built with the Laufbursche Firmware Patcher are for the Teverun Fighter Mini Pro eKFV. The hardware is a Box C / IVCU-V5.X board (shared with the Blade GT II, Fighter 11 and Supreme+), but those models run their own firmware - do NOT flash these on them or on a Box A (HW V3.X), Box B (V4.X) or a C1 / C2 board.
- **A failed flash is almost always recoverable.** The bootloader clears its "app valid" flag before it writes and restores it only after the new image passes its checksum, so a bad, interrupted, cancelled or power-lost flash leaves the IVCU back in the bootloader - still in flashing mode, surviving a power-off and a Bluetooth disconnect - and you just flash again. The stock image **for the version your own scooter runs**, R5.4.19 or R5.4.21, is your recovery firmware; the other one is not. This is not a guarantee - flashing always carries some risk (a wrong-but-checksum-valid image can still boot broken). See [why an interrupted flash is almost never a brick](#why-an-interrupted-flash-is-almost-never-a-brick) for the code proof.
- **It takes about 13 minutes.** Keep whatever does the flashing open and in the foreground for the whole run. The scooter has to stay switched on and within range.
- **Set the scooter Auto-Off to 30 min first.** Because the flash takes ~13 minutes, set the auto-off timer to 30 minutes (or Off) in the scooter's own display menu before you start. The app cannot change it - a shorter timer powers the scooter off mid-flash.
- **Reset the display wheel to 10 first.** If you ever changed the wheel size in the scooter's own display menu (P-settings) to anything other than 10, set it back to 10 there before you flash. This firmware never changes the display's stored wheel, so the display keeps showing that number - and a roadside check reads the wheel there. You set your real wheel size in the app instead: it applies only while unlocked and is forced back to 10 when you lock, so the display always reads 10.
- **Road approval.** Flashing non-stock firmware or unlocking the speed changes the approved configuration, with the road-approval and insurance consequences in the [Disclaimer](#disclaimer). The responsibility is yours.
- **First time? Do a dry run** by flashing your own unmodified stock image once, so you have seen the whole flow before you change anything.

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

This NOP-the-clamp route drops the cap unconditionally. The [Laufbursche Firmware Patcher](https://laufbursche42.github.io/tr-fw/) instead redirects the four clamp sites to a small appended routine that reads a RAM lock flag at `0x20001B40`. Any non-zero value means open and the per-gear setpoint passes untouched; zero means locked and the routine caps the setpoint.

The cap itself is not one number. The same routine sets a second RAM byte, `0x20001B41`, the first time the lock is opened after a power cycle. It reads that byte to choose between two caps: one for a scooter that has not been unlocked since it was switched on, one for a scooter that has. Both are chosen when the firmware is built, out of `0x13`, `0x14`, `0x15` and `0x16`. `0x14` measures around 455 rpm at the wheel. V246 clears bit5 rather than setting it and therefore reads the setpoint on the doubled scale, so it carries the same two caps multiplied by four and halves the result again after clamping.

Bit5, the scale the controller reads the setpoint on, is left the way the factory instruction sets it in V46 and cleared always in V246. The lock flag itself is toggled live over Bluetooth with the direct lock command (cmd 0x1B), so one and the same firmware boots locked and unlocks or re-locks on demand with no re-flash and no FIN rename.

The clamp is unique to the R5 line: the four `movs r7, #0x16` caps appear in R5.4.19 but are absent from the R3, R2 and D-series VCU images, which ship unrestricted. Because the R3 and R5 images share the same Box C flash base (`0x08007000`) and the same MCU and peripheral map, flashing an unpatched open R3-line image onto an R5 VCU de-restricts it with no byte patch at all - the version number is only a client-side software lock: the name gate in the usual tooling just wants a version segment ending in "5", not a hardware difference. Your own stock image stays the recovery image to return to.

A patched image needs its CRC-16/MODBUS recomputed and its `:07AAA555` trailer record rebuilt. The bootloader checks only the CRC and the address range - there is no signature - so a correctly re-checksummed patched image is accepted.

The offsets quoted above are the R5.4.19 ones. R5.4.21 carries the same code at different addresses and the shift is not a single offset: it runs from 0 bytes in the low flash region through 12, 192, 196, 224, 232 and 242 up to 422 bytes at the frame builders. A handful of RAM variables move by two or four bytes with it. The patcher therefore holds a per-address map for R5.4.21 rather than a formula, re-encodes every branch that crosses between stock code and the appended routines and rewrites the literal pool words whose variables moved. Five sites also load their variable through a pc relative offset that R5.4.21 sizes differently, so the stock bytes it expects there differ while resolving to the same variable.

There is still a recovery risk: flashing is one-way because the firmware cannot be read back over BLE (see the next subsection), so a known-good image for the exact version on the scooter is the only safety net before any flash. The build carries its stock version in the file name for that reason.

### The live speed lock

Every patched build boots LOCKED, at whichever of the two caps was chosen for a scooter that has not been unlocked yet. To unlock or re-lock the speed live over Bluetooth - with no re-flash - triple-tap the VCU speed tile on the main screen. This sends the direct lock command (cmd 0x1B); it is not a FIN rename and needs no display step. The tile colour shows the current state, read straight from the scooter's telemetry (`55 71`). Unlocking lifts the cap, brings your stored cruise mode back and lets the app's Wheel size drive the speedometer; locking caps you again, turns cruise off and forces the stock 10.0" wheel on the display for a correct legal speed reading. The cap after a re-lock is the second of the two values, which is the one to set if your scooter runs hotter once it has been open. The unlock holds while the scooter stays on and every restart comes up locked again. Every step is reversible.

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

It is "almost never", not "never". Integrity is a **CRC-16 (poly `0x8005`) only, no signature** (`0x08005AE4`), so a wrong-but-CRC-valid image passes FINISH and the box boots a broken app; re-entry is a normal command rather than a race: the running application programs the `0xA5A5A5A5` enter-update request itself (`0x08016EF2`, reached from the OTA handler at `0x0801A572`) and resets into the bootloader, so a box that still runs its application can always be sent back into update mode; a box whose application no longer starts leaves only the power-on window, otherwise SWD / JTAG. And external corruption of the bootloader pages (a flash-cell failure or an SWD mishap) is not OTA-recoverable. Keep the stock image matching your scooter's version as the recovery image.

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

The sleep timer and the power-off timer are neither readable nor writable over BLE on this VCU, because of a firmware bug rather than a region lock. The `55 71` settings-echo frame builder copies only 16 payload bytes, so byte `t[18]` - which is supposed to carry the sleep timer and power-off timer - is never written; in the stock image the loop that should fill it is dead code. An unlock build reuses that same dead loop, but it writes the live lock flag into `t[2]`, the frame's first payload byte; that is a different byte entirely, so `t[18]` stays empty in every build without exception. The inbound settings-write path drops the same byte. As a result those two timers live only in the VCU EEPROM config and can only be set from the scooter's on-display P-menu. Tooling that shows a value for them is showing its own cache; Laufbursche Edition therefore does not expose these two timers at all.

### Inter-MCU transport map

The controllers on this platform are wired as follows:

| Bus | Role |
|-----|------|
| USART1 | the BLE / phone link (the `0xAA` app-command protocol) |
| USART2 | the motor controller link; the frames with the setpoint go out here and the `0x71` answer comes back |
| USART3 | the display link (`0x4c` / `0x8a` / `0x8b` / `0x8c` frames) |
| CAN | the BMS / battery bus |

The display is UART-connected, not on CAN. This is why a display firmware update cannot be relayed through the VCU over BLE - there is no path from the phone link to the display line inside the VCU app - and why reaching the display needs a direct UART connection.

### Chip and hardware access

The VCU carries an ARM Cortex-M4F on an STM32F1-style peripheral map, so a GD32F303-class part rather than the F103 it looks like at first glance. The image enables the FPU, uses VFP instructions and sets a flash latency an F103 does not offer. The SWD pads are the standard SWDIO / SWCLK pair. Reading the RDP / option-byte state over SWD is non-destructive - you can check whether the flash is readable without erasing it - which is the safe first step before considering any hardware dump. Actually reading the firmware out (for a backup) requires this SWD access; it cannot be done over BLE.

## Disclaimer

**Feasibility study, no warranty.** This patcher is a feasibility study. What it builds is provided "as is". Nothing here promises that a build is free of defects, that it suits your scooter, that a value it reports is correct or that it still behaves the same after the next controller or display revision. The measurements quoted come from a small number of machines, in places from a single one. Where that is the case it is marked.

**At your own risk.** You build and flash at your own risk. As far as the law allows, the developer is not liable for damage to the scooter, its controller, its battery or any other part, for lost data, for injury or for any other loss that comes out of using this page or the firmware it builds. Flashing can leave a scooter unusable until a flash completes. It can void its warranty. Keeping to road traffic law stays your job.

**Road approval and insurance.** Lifting the 22 km/h limit takes the scooter out of its eKFV road approval and, with it, out of its insurance cover. A scooter in that state belongs on private ground or on a test bench, never in public traffic. On a public road it has to carry its approved configuration. Nothing here is an encouragement to ride it anywhere else.

**Not the manufacturer's firmware.** This page ships none. You supply the stock image from your own scooter and it stays on your device. The stock firmware is the manufacturer's work and this page grants you no right in it.

## Trademarks

This is an independent, community project. It is not an official Teverun tool and the developer ("Laufbursche") is not affiliated with, endorsed by or connected to Teverun. "Teverun" and other product names are trademarks of their respective owners; the name is used here only descriptively to indicate the scooters this page works with. See [TRADEMARKS.md](TRADEMARKS.md) for details.

## License

PolyForm Noncommercial 1.0.0, in full in [LICENSE.md](LICENSE.md). The source is public so that anyone can read what the tool does. It is not free for commercial use.
