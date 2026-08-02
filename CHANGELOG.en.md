# Changelog

What changes in the patcher and in the firmware it builds.

The version number is the stamp the firmware reports over Bluetooth. The same number plus 200 is the build for older models without a factory kickstart. So there is V46 and V246.

---

## V46 at a glance

- **One command reached the wrong handler.** In the controller's command dispatcher, command 4 ends without a break, so it then ran on into the handling of the RGB lighting as well. A command 4 could therefore change the lighting. The compiler had left an empty instruction in that exact spot, so the branch fits there and nothing else in the firmware moves. Everything from V45 is still in.

---

## V45 at a glance

- **The stock firmware R5.4.21 is accepted.** Until now only R5.4.19 was. Both versions get the same set of features.
- **The locked speed is yours to set when you build**, separately for the state straight after switching on and for the state after an unlock. It has to be, because the same value does not come out as the same speed on every scooter. With 22 set, one scooter runs too fast while it is locked, the next one too slow. There is no telling in advance, so the value is a setting rather than a fixture.
- **In the standard build the scale stays the way the controller gets it set from the factory.** That is the route which runs more reliably on the newer machines.

---

## Which build is yours

There are two. They differ in what the controller tells the motor controller about the setpoint scale, everything else is the same.

- **V45, standard.** The normal case. The scale stays the way the controller gets it set from the factory.
- **V245, older controllers.** Only for scooters that do not pull away without a kick from the factory, meaning the kickstart cannot be switched off at all. On every other scooter this build makes the throttle stop responding.

The choice is not one way. If a build does not suit, pick another one in the patcher and flash again. There is no limit on how often a controller may be flashed.

---

## Which stock firmware the patcher accepts

R5.4.19 and R5.4.21. What is recognised is the content of the image, not the file name, so a differently formatted hex of the same firmware passes just as well.

The built file carries the stock version in its name, `AWIVCU_APP_R5_4_19_V45.hex` or `AWIVCU_APP_R5_4_21_V45.hex`. Flash only the file that matches the version running on your scooter. The other one belongs on a different scooter.

---

## Locked speed is yours to set

When you build, you pick what the scooter is clamped to while it is locked. There are two fields, each offering 19, 20, 21 or 22:

- **Never unlocked since power on.** Applies while the scooter has not run open since it was switched on.
- **After unlocking and locking again.** Applies once it has been open, until it is next switched off.

These are the numbers the firmware itself works with, not km/h. 20 is the value every build so far had fixed in it, a measured 455 rpm at the wheel. What that comes out as on the road depends on tyres, weight and the wheel size you set. The same value therefore does not come out as the same speed on every scooter: with 22 set, one runs past the 22 km/h it is allowed while the next stays under. A higher number is faster, a lower one slower. Measure your own scooter and set it to suit.

There are two fields because after an unlock the controller often clamps a little higher than it did from a cold start, until the next power off. That way both can be hit separately.

Both fields default to 21.

---

## What it contains

Both builds carry:

- speed lock, switched on and off over Bluetooth from an app that supports it, the scooter boots locked
- while locked the setpoint the controller hands the motor controller is clamped to the value you set, whatever gear is selected
- locking takes effect immediately, mid-ride and without cutting the power
- cruise control released, switched in the display menu as usual
- wheel size stays stored across a restart and feeds the speedometer, the display shows 10.0 inch while locked
- factory defaults are 10 inch and 52 V. If the controller falls back on them, the scooter keeps running instead of dropping into undervoltage protection
- blinker fix, selectable when building

The build for older controllers (V245) only:

- zero start (kickstart) permanently on
- while locked the setpoint is capped first and then halved. The locked top speed therefore depends on the selected gear: the top gear runs up to the limit, the lower gears stay below it. That way no gear runs over the limit while locked
- **Unverified:** the locked speed of this build has not been measured on any older controller. The value that caps it is calculated from measurements taken on a newer controller. The build dialog says so when you create it

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
