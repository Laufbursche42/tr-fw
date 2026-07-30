# Changelog

What changes in the patcher and in the firmware it builds.

The version number is the stamp the firmware reports over Bluetooth. The same number plus 100 is the build with the other setpoint scale, plus 200 the build for older models without a factory kickstart. So there is V44, V144 and V244.

---

## Which build is yours

There are three. They differ in what the controller tells the motor controller about the setpoint scale, everything else is the same.

- **V44, standard.** The normal case. Take it when you cannot tell yet which of the other two cases applies to your scooter.
- **V144, other scale.** For scooters that get stuck at about 15 km/h unlocked with the standard build.
- **V244, older controllers.** Only for scooters that do not pull away without a kick from the factory, meaning the kickstart cannot be switched off at all. On every other scooter this build makes the throttle stop responding.

The choice is not one way. If a build does not suit, pick another one in the patcher and flash again. There is no limit on how often a controller may be flashed.

---

## What it contains

All three builds carry:

- speed lock, switched on and off over Bluetooth from an app that supports it, the scooter boots locked
- while locked the setpoint the controller hands the motor controller is clamped to a fixed value, whatever gear is selected. Measured at the wheel that is 455 rpm, so 21.8 km/h at an 80 cm rolling circumference and 22.1 at 81 cm
- cruise control released, switched in the display menu as usual
- wheel size stays stored across a restart and feeds the speedometer, the display shows 10.0 inch while locked
- factory defaults are 10 inch and 52 V
- blinker fix, selectable when building

The standard build (V44) only:

- setpoint and scale match up, full power when unlocked

The other-scale build (V144) only:

- the scale stays the way the controller gets it set from the factory

The build for older controllers (V244) only:

- zero start (kickstart) permanently on
- while locked the capped and halved setpoint applies instead of the fixed clamp. The locked top speed is therefore not the same in every gear: only the top gear runs up to the limit, the lower ones stay below it

---

## V144

New, for scooters that get stuck at about **15 km/h** unlocked with the standard build.

The setpoint the controller hands the motor controller is not a speed, it is a number on a scale. A single bit in the frame to the controller says which of the two scales applies. The standard build clears that bit on unlock so that full power is available.

Some controllers read that bit the other way round. On those the cleared bit selects the smaller scale, so the scooter runs slower unlocked rather than faster. Measured on one affected machine that came out at roughly 15 km/h. V144 leaves the bit alone, so it stays at whatever the factory sets. Apart from that it is identical to the standard build.

This hangs off the controller, not off the model nor the year it was built. Nothing on the outside gives it away, so trying is all there is: if your scooter does not pull properly when unlocked on the standard build, take V144.

**When you need it:** your scooter will not go past roughly 15 km/h unlocked with the standard build. Otherwise take the standard build.

---

## V44 / V244

**Lock and speed**

- Unlocked, full power is back: the scooter pulls on hills and accelerates cleanly. V43 lost about half of it, because the setpoint and the scale the controller reads it on did not match. The speed stayed unusually constant as a result, which is why cruise control also engaged by itself. **Anyone running V43 should move off it.**
- Locked, the scooter stays below 22 km/h. On our test scooter even the stock firmware runs faster than 22 km/h, so the value that sets the locked speed is set lower. Checked with a laser tacho on the tread.
- Locking takes effect immediately, mid-ride and without cutting the power. After an unlock the same 21.8 km/h were measured as from cold.

**Factory defaults**

- If the controller falls back on its factory defaults, the scooter keeps running instead of dropping into undervoltage protection. Those defaults carry a 10 inch wheel and a 52 V pack, which is what every scooter we patch has.

**Only the build for older controllers (V244)**

- Zero start is permanently on, whatever the app or the display menu says about it. Some older controllers ignore that setting entirely otherwise.
- While locked the setpoint is capped first and then halved. The locked top speed therefore depends on the selected gear: the top gear runs up to the limit, the lower gears stay below it. That way no gear runs over the limit while locked.
- **Unverified:** the value that caps it there is calculated from measurements taken on a newer controller and has not been measured on any older controller. The build dialog says so when you create it.

---

## After flashing: switch through the gears

The display keeps its own copy of the per-gear settings, the speeds and the currents. It writes that copy into the controller continuously. It only adopts a new value from the controller when the gear changes.

This only affects values that come **from an app**. So after flashing, set everything once in the app and then switch through all the gears once, so the display takes the values over. The same after every later change in the app, set it and then switch through all the gears again. Otherwise the display keeps stamping its old copy back and the change looks as if it never arrived.

Setting it **in the display menu** instead needs none of that: the display's own copy changes right away. That copy is what it writes into the controller anyway.

This is not a defect. It is how the vehicle works from the factory, the per-gear settings belong to the display.

---

## About the wheel size

The wheel size only affects the speed the display works out from it, so the speedometer and the odometer. It never reaches the motor controller. It does not change how fast the scooter actually goes.

You can set it in either state and what gets stored is always your value. What gets shown is not the same everywhere:

```
Scooter display   unlocked    your value
Scooter display   locked      10.0 inch
App               unlocked    your value
App               locked      your value
```

The reason is that the masking sits only in the frame the IVCU sends to the display. The stored value is never overwritten, it is back the moment you unlock. What the app shows is therefore the real value throughout.
