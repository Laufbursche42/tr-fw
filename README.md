# Laufbursche Firmware Patcher

A web page that builds a Laufbursche firmware for the **Teverun Fighter Mini (eKFV)** from the stock firmware of your own scooter.

Everything runs in the browser. Nothing is uploaded, nothing is stored on a server and the page ships no firmware of its own.

**Open the patcher: [laufbursche42.github.io/tr-fw](https://laufbursche42.github.io/tr-fw/)**

---

## What this is

The patching used to live inside the Android and iOS apps. It moved here so the apps stay clean and so anyone can read what happens to a firmware image before running it.

You supply the stock image from your own scooter, the page applies the patch set and hands you a flashable Intel HEX back.

## What it builds

Two builds that exclude each other, because both patch the same four controller frame builders:

- **V44** for newer controllers, the ones that pull away without a kick from the factory.
- **V244** for older controllers that have no zero start of their own.

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

## License

PolyForm Noncommercial 1.0.0, in full in [LICENSE.md](LICENSE.md). The source is public so that anyone can read what the tool does. It is not free for commercial use.
