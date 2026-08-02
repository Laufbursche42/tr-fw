"use strict";

// Every visible string in both languages. Keys match the data-t attributes in
// index.html, so a missing translation shows up as an empty element rather than
// as a silent fallback to the other language.
window.I18N = {
  de: {
    lede: "Baut aus der Serien-Firmware deines Rollers eine Laufbursche-Firmware. <b>Nur für den Teverun Fighter Mini in der eKFV-Ausführung, für kein anderes Gerät.</b>",
    ledePrivacy: "Alles passiert in diesem Browser, es wird nichts hochgeladen und nichts gespeichert.",

    s1: "Firmware-Upload",
    dropTitle: "Hex-Datei hierher ziehen oder klicken",
    dropSub: "Teverun IVCU R5.4.19 oder R5.4.21 als .hex oder .txt",
    iosHint: "<b>Auf dem iPhone:</b> lässt sich deine Datei in der Auswahl nicht antippen, benenn sie in <b>.txt</b> um. Am Inhalt ändert das nichts und die Seite liest ihn genauso, denn geprüft wird das Abbild selbst, nie der Dateiname.",
    uploadHint: "Diese Seite liefert keine Firmware mit. Die passende IVCU-Firmware findest du im Internet, zum Beispiel <a href=\"https://github.com/spooonky/Teverun-Fighter-Mini-Pro-Eco-eKFV-Firmware\" target=\"_blank\" rel=\"noopener\">hier</a>. Auch dein Händler kann sie dir zusenden. Hast du eine Firmware, die hier noch nicht angenommen wird, öffne bitte ein <a href=\"https://github.com/Laufbursche42/tr-fw/issues\" target=\"_blank\" rel=\"noopener\">Ticket</a> und häng sie dort an, dann bauen wir unsere Patches auch dafür.",
    okStock: "Serien-Firmware R{v} erkannt.",
    badUnreadable: "Das ist keine lesbare Hex-Datei.",
    badVersion: "Falsche Firmware. Freigegeben sind R5.4.19 und R5.4.21.",
    badRange: "Das ist keine unveränderte Serien-Firmware, sie sieht nach einer bereits gepatchten Datei aus.",
    badSize: "Die Datei hat nicht die Größe der Serien-Firmware.",
    badContent: "Die Version stimmt, der Inhalt nicht. Die Datei wurde verändert.",

    s2: "Controller",
    varHelp: "Welche Version passt zu dir?",
    varStdWhen: "<b>Standard:</b> der Normalfall, nimm diese Version, wenn du noch nicht abschätzen kannst, welche der Punkte für deinen Scooter zutrifft. Sollte beim Patchen etwas schief gehen, keine Panik, einfach eine andere Version auswählen und erneut flashen.",
    varKickWhen: "<b>Ältere Controller:</b> wenn dein Roller ab Werk nicht ohne Antreten anfährt bzw. du Kickstart nicht deaktivieren kannst. Bei allen anderen führt diese Version dazu, dass der Scooter kein Gas mehr annimmt.",
    varPick: "Version",
    varStdTitle: "Standard",
    varKickTitle: "Ältere Controller",

    featTitle: "Was drin ist",
    featCommon: [
      "Geschwindigkeitssperre, über Bluetooth ein- und ausschaltbar, der Roller startet gesperrt",
      "gesperrt auf den Wert geklemmt, den du in Schritt 03 einstellst",
      "Tempomat freigegeben, geschaltet wird er wie gewohnt im Display-Menü",
      "Radgröße bleibt über den Neustart gespeichert und wirkt auf den Tacho, gesperrt zeigt das Display 10,0 Zoll",
      "Werksvorgaben auf 10 Zoll und 52 V korrigiert"
    ],
    featStdExtra: [
      "Die Skala bleibt so, wie der Controller sie ab Werk bekommt"
    ],
    featKickExtra: [
      "Anfahren ohne Antreten fest eingeschaltet",
      "gesperrt gilt derselbe eingestellte Wert, umgerechnet auf die Skala dieser Version"
    ],
    detailsNote: "Was sich gegenüber der letzten Version geändert hat, steht im <a id=\"detailsLink\" href=\"CHANGELOG.de.md\" data-doc=\"CHANGELOG\" data-doc-title=\"changelog\">Changelog für Firmware</a>.",

    s3: "Gesperrte Geschwindigkeit",
    clampHelp: "Worauf soll der Roller geklemmt werden, solange er gesperrt ist?",
    clampStockLabel: "Seit dem Einschalten nie entsperrt",
    clampRelockLabel: "Nach Entsperren und wieder Sperren",
    clampNote: "Das sind die Werte, mit denen die Firmware selbst rechnet, keine km/h. Bisher stand hier fest die 20, gemessen 455 U/min am Rad. Was daraus auf der Straße wird, hängt an Reifen, Gewicht und eingestellter Radgröße. Derselbe Wert ergibt deshalb nicht auf jedem Roller dieselbe Geschwindigkeit: mit einer eingestellten 22 läuft der eine gesperrt über die erlaubten 22 km/h, der nächste bleibt darunter. Vorhersagen lässt sich das nicht, es hilft nur nachmessen. Ein höherer Wert macht schneller, ein niedrigerer langsamer. Zwei Felder gibt es, weil der Controller nach einem Entsperren bis zum nächsten Ausschalten oft etwas höher klemmt als beim Losfahren.",

    s4: "Optionen",
    blinkerTitle: "Blinker-Fix",
    blinkerText: "Nur wichtig, wenn dein Blinker dauerhaft leuchtet statt zu blinken. In der Regel passiert das nur bei Scootern, bei denen keine Blinkerbox verbaut ist.",

    s5: "Bauen",
    lockNote: "<b>Die Sperre lässt sich nur mit einer App ein- und ausschalten, die das unterstützt.</b> Ohne eine solche App bleibt der Roller gesperrt, auch mit dieser Firmware.",
    buildBtn: "Firmware bauen",


    dlgTitle: "Bitte einmal lesen",
    dlgLede: "Bevor du baust, bitte diese Punkte lesen.",
    dlgPoints: [
      "<b>Betriebserlaubnis:</b> Mit dieser Firmware erlischt die Allgemeine Betriebserlaubnis des Rollers.",
      "<b>Versicherungsschutz:</b> Damit entfällt in aller Regel auch der Versicherungsschutz. Bei einem Unfall haftest du persönlich, auch gegenüber Dritten.",
      "<b>Öffentlicher Verkehr:</b> Wir raten dringend davon ab, den Roller damit außerhalb von Privatgelände zu bewegen. Was bei dir erlaubt ist, musst du selbst prüfen.",
      "<b>Gewährleistung:</b> Hersteller und Händler können jede Gewährleistung ablehnen, sobald die Firmware verändert wurde.",
      "<b>Fahrverhalten:</b> Der Roller fährt schneller und beschleunigt anders als ab Werk. Bremsweg, Reifen und Bremsen können sich durch die höheren Geschwindigkeiten anders verhalten.",
      "<b>Flashen:</b> Ein abgebrochener Flashvorgang kann den Roller unfahrbar machen, bis ein Flashvorgang wieder vollständig durchläuft.",
      "<b>Haftung:</b> Für Schäden an Fahrzeug, Personen oder Dritten, die durch oder mit dieser Firmware entstehen, übernehmen wir keine Haftung, soweit gesetzlich zulässig. Die Nutzung erfolgt auf eigenes Risiko."
    ],
    dlgUnverified: "<b>Diese Version ist ungeprüft:</b> die gesperrte Geschwindigkeit der Version für ältere Controller ist bisher auf keinem älteren Controller nachgemessen. Der Wert, der sie begrenzt, ist aus Messungen an einem neueren Controller berechnet.",
    dlgConsent: "Ich habe den Haftungsausschluss gelesen und baue auf eigene Gefahr.",
    dlgNo: "Abbrechen",
    dlgYes: "Verstanden und bauen",

    okTitle: "Fertig",
    fSource: "Grundlage",
    fBase: "Serienstand",
    fClamp: "Klemme gesperrt / nach Entsperren",
    fVersion: "Meldet sich als",
    fBytes: "App-Bytes",
    fCrc: "CRC-16",
    fGroups: "Enthalten",
    download: "Firmware herunterladen",
    badTitle: "Nicht gebaut",

    source: "Quellcode",
    readme: "Readme",
    changelog: "Changelog für Firmware",
    disclaimer: "Haftungsausschluss",
    privacy: "Datenschutz",
    license: "Lizenz",
    trademarks: "Marken",
    buildLabel: "Build",
    langGroup: "Sprache",
    themeToLight: "Auf helle Darstellung umschalten",
    themeToDark: "Auf dunkle Darstellung umschalten",
    docClose: "Schließen",
    docLoading: "wird geladen ...",
    docFail: "Das Dokument konnte nicht geladen werden.",
    docEnglish: "(englisch)",
    docGerman: "(deutsch)"
  },

  en: {
    lede: "Builds a Laufbursche firmware from your scooter's stock firmware. <b>For the Teverun Fighter Mini in its eKFV version only, for no other device.</b>",
    ledePrivacy: "Everything happens in this browser; nothing is uploaded and nothing is stored.",

    s1: "Firmware upload",
    dropTitle: "Drop a .hex here or click to choose",
    dropSub: "Teverun IVCU R5.4.19 or R5.4.21 as .hex or .txt",
    iosHint: "<b>On an iPhone:</b> if your file cannot be tapped in the picker, rename it to <b>.txt</b>. That changes nothing about the content and the page reads it just the same, because what is checked is the image itself, never the file name.",
    uploadHint: "This page ships no firmware. You can get the matching IVCU firmware online, for example <a href=\"https://github.com/spooonky/Teverun-Fighter-Mini-Pro-Eco-eKFV-Firmware\" target=\"_blank\" rel=\"noopener\">here</a>. Your dealer can send it to you as well. If you have a firmware this page does not accept yet, please open a <a href=\"https://github.com/Laufbursche42/tr-fw/issues\" target=\"_blank\" rel=\"noopener\">ticket</a> and attach it there, then we will build our patches for that one too.",
    okStock: "Stock firmware R{v} recognised.",
    badUnreadable: "That is not a readable hex file.",
    badVersion: "Wrong firmware. Only R5.4.19 and R5.4.21 are approved.",
    badRange: "This is not an untouched stock firmware, it looks like an already patched file.",
    badSize: "The file does not have the size of the stock firmware.",
    badContent: "The version matches but the content does not. The file has been altered.",

    s2: "Controller",
    varHelp: "Which build fits you?",
    varStdWhen: "<b>Standard:</b> the normal case, take this build if you cannot tell yet which of the points applies to your scooter. Should something go wrong while patching, no panic, just pick another build and flash again.",
    varKickWhen: "<b>Older controllers:</b> if your scooter does not pull away without a kick from the factory, meaning you cannot switch the kickstart off. On every other scooter this build makes the throttle stop responding.",
    varPick: "Build",
    varStdTitle: "Standard",
    varKickTitle: "Older controllers",

    featTitle: "What it contains",
    featCommon: [
      "speed lock, switched on and off over Bluetooth, the scooter boots locked",
      "locked speed clamped to the value you set in step 03",
      "cruise control released, switched in the display menu as usual",
      "wheel size stays stored across a restart and feeds the speedometer, the display shows 10.0 inch while locked",
      "factory defaults corrected to 10 inch and 52 V"
    ],
    featStdExtra: [
      "the scale stays the way the controller gets it from the factory"
    ],
    featKickExtra: [
      "zero start permanently on",
      "while locked the same value you set applies, converted to the scale this build uses"
    ],
    detailsNote: "What changed against the previous build is in the <a id=\"detailsLink\" href=\"CHANGELOG.en.md\" data-doc=\"CHANGELOG\" data-doc-title=\"changelog\">Changelog for Firmware</a>.",

    s3: "Locked speed",
    clampHelp: "What should the scooter be clamped to while it is locked?",
    clampStockLabel: "Never unlocked since power on",
    clampRelockLabel: "After unlocking and locking again",
    clampNote: "These are the numbers the firmware itself works with, not km/h. Until now this was fixed at 20, a measured 455 rpm at the wheel. What that comes out as on the road depends on tyres, weight and the wheel size you set. The same value therefore does not come out as the same speed on every scooter: with 22 set, one runs past the 22 km/h it is allowed while the next stays under. There is no telling in advance, only measuring. A higher number is faster, a lower one slower. There are two fields because after an unlock the controller often clamps a little higher than it did from a cold start, until the next power off.",

    s4: "Options",
    blinkerTitle: "Blinker fix",
    blinkerText: "Only relevant if your indicator lights up continuously instead of blinking. As a rule that happens only on scooters with no blinker box fitted.",

    s5: "Build",
    lockNote: "<b>The lock can only be switched on and off with an app that supports it.</b> Without such an app the scooter stays locked, even with this firmware.",
    buildBtn: "Build firmware",


    dlgTitle: "Please read this once",
    dlgLede: "Before you build, please read these points.",
    dlgPoints: [
      "<b>Road approval:</b> With this firmware the scooter loses its road approval.",
      "<b>Insurance:</b> That usually voids your insurance cover as well. In an accident you are personally liable, including towards third parties.",
      "<b>Public roads:</b> We strongly advise against riding it anywhere but on private property. What is allowed where you live is yours to check.",
      "<b>Warranty:</b> The manufacturer and your dealer can refuse any warranty claim once the firmware has been changed.",
      "<b>How it rides:</b> The scooter goes faster and accelerates differently than it did from the factory. Braking distance, tyres and brakes can behave differently at the higher speeds.",
      "<b>Flashing:</b> An interrupted flash can leave the scooter unrideable until a flash completes.",
      "<b>Liability:</b> To the extent the law allows, we accept no liability for damage to the vehicle, to people or to third parties caused by or with this firmware. You use it at your own risk."
    ],
    dlgUnverified: "<b>This build is unverified:</b> the locked speed of the build for older controllers has not been measured on any older controller yet. The value that caps it is calculated from measurements taken on a newer controller.",
    dlgConsent: "I have read the disclaimer and I build at my own risk.",
    dlgNo: "Cancel",
    dlgYes: "Understood & build it",

    okTitle: "Done",
    fSource: "Based on",
    fBase: "Stock version",
    fClamp: "Clamp locked / after unlock",
    fVersion: "Reports as",
    fBytes: "App bytes",
    fCrc: "CRC-16",
    fGroups: "Included",
    download: "Download firmware",
    badTitle: "Not built",

    source: "Source",
    readme: "Readme",
    changelog: "Changelog for Firmware",
    disclaimer: "Disclaimer",
    privacy: "Privacy",
    license: "License",
    trademarks: "Trademarks",
    buildLabel: "build",
    langGroup: "Language",
    themeToLight: "Switch to the light theme",
    themeToDark: "Switch to the dark theme",
    docClose: "Close",
    docLoading: "loading ...",
    docFail: "The document could not be loaded.",
    docEnglish: "(English)",
    docGerman: "(German)"
  }
};
