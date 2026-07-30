# Changelog

What changes in the patcher and in the firmware it builds. Newest entries first.

The version number is the stamp the firmware reports over Bluetooth. The kickstart build carries the same number plus 200, so V44 and V244.

---

## What it contains

Both builds carry:

- speed lock, switched on and off over Bluetooth from an app that supports it, the scooter boots locked
- locked speed clamped to a fixed value. Measured at the wheel that is 455 rpm, so 21.8 km/h at an
  80 cm rolling circumference and 22.1 at 81 cm
- setpoint and scale match up, full power when unlocked
- cruise control released, switched in the display menu as usual
- wheel size stays stored across a restart and feeds the speedometer, the display shows 10.0 inch while locked
- factory defaults corrected to 10 inch and 52 V
- blinker fix, selectable when building

The build for older controllers (V244) also has:

- zero start permanently on
- while locked the capped and halved setpoint applies instead of the fixed clamp, so the locked speed follows the gear

---

## V44 / V244

**Lock and speed**

- The scooter pulls on hills again, accelerates cleanly and cruise control no longer engages by itself. **This is the main reason to move off V43:** there the full setpoint runs on the throttled scale, which costs roughly half of everything. The speed sits so perfectly still that cruise control reads it as a held pace. The scale now hangs off the same switch as the lock.
- Locked, the scooter stays below 22 km/h. On our test scooter even the stock firmware runs faster than 22 km/h, so the value that sets the locked speed is set lower. Checked with a laser tacho on the tread.
- Locking takes effect immediately, mid-ride and without cutting the power. After an unlock the same
  455 rpm were measured as from cold.

**Factory defaults**

- If the controller falls back on its factory defaults, the scooter keeps running instead of dropping into undervoltage protection. Those defaults carry a 10 inch wheel and a 52 V pack, which is what every scooter we patch has. With the stock firmware's defaults of 11 inch and 60 V the controller goes into undervoltage protection.

**Only the build for older controllers (V244)**

- Zero start is permanently on, whatever the app or the display menu says about it. Some older controllers ignore that setting entirely otherwise.
- Locked, the speed follows the gear: the setpoint is capped first and then halved. That way even the top gear does not run over the limit while locked.
- **Unverified:** the value that caps it there is calculated from measurements taken on a newer controller and has not been measured on any older controller. The build dialog says so when you create it.

---

## After flashing: switch through the gears

The display keeps its own copy of the per-gear settings, the speeds and the currents. It writes that copy into the controller continuously. It only adopts a new value from the controller when the gear changes.

So after flashing, set everything once properly and then switch through all the gears once, so the display takes the values over. The same after every later change, set it and then switch through all the gears again. Otherwise the display keeps stamping its old copy back and the change looks as if it never arrived.

This is not a defect. It is how the vehicle works from the factory, the per-gear settings belong to the display.

---

## About the wheel size

You can set it in either state and what gets stored is always your value. What gets shown is not the same everywhere:

```
Scooter display   unlocked    your value
Scooter display   locked      10.0 inch
App               unlocked    your value
App               locked      your value
```

The reason is that the masking sits only in the frame the IVCU sends to the display. The stored value is never overwritten, it is back the moment you unlock. What the app shows is therefore the real value throughout.

The wheel size only feeds the speedometer and the odometer anyway, never the motor controller. It does not change how fast the scooter actually goes.
