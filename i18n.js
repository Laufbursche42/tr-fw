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
    dropSub: "Teverun IVCU R5.4.19 als .hex oder .txt",
    iosHint: "<b>Auf dem iPhone:</b> lässt sich deine Datei in der Auswahl nicht antippen, benenn sie in <b>.txt</b> um. Am Inhalt ändert das nichts und die Seite liest ihn genauso, denn geprüft wird das Abbild selbst, nie der Dateiname.",
    uploadHint: "Diese Seite liefert keine Firmware mit. Die passende IVCU-Firmware R5.4.19 findest du im Internet, zum Beispiel <a href=\"https://github.com/spooonky/Teverun-Fighter-Mini-Pro-Eco-eKFV-Firmware\" target=\"_blank\" rel=\"noopener\">hier</a>. Auch dein Händler kann sie dir zusenden. Hast du eine neuere Firmware, öffne bitte ein <a href=\"https://github.com/Laufbursche42/tr-fw/issues\" target=\"_blank\" rel=\"noopener\">Ticket</a> und häng sie dort an, dann bauen wir unsere Patches auch dafür.",
    okStock: "Serien-Firmware R5.4.19 erkannt.",
    badUnreadable: "Das ist keine lesbare Hex-Datei.",
    badVersion: "Falsche Firmware. Freigegeben ist nur R5.4.19.",
    badRange: "Das ist keine unveränderte Serien-Firmware, sie sieht nach einer bereits gepatchten Datei aus.",
    badSize: "Die Datei hat nicht die Größe der Serien-Firmware.",
    badContent: "Die Version stimmt, der Inhalt nicht. Die Datei wurde verändert.",

    s2: "Controller",
    varHelp: "Welche Version passt zu dir?",
    varStdWhen: "<b>Standard:</b> der Normalfall, nimm diese Version, wenn du noch nicht abschätzen kannst, welche der Punkte für deinen Scooter zutrifft. Sollte beim Patchen etwas schief gehen, keine Panik, einfach eine andere Version auswählen und erneut flashen.",
    varScaleWhen: "<b>Andere Skala:</b> nimm diese Version, wenn dein Roller mit der Standardversion Probleme gemacht hat und entsperrt bei etwa 15 km/h hängenbleibt.",
    varKickWhen: "<b>Ältere Controller:</b> wenn dein Roller ab Werk nicht ohne Antreten anfährt bzw. du Kickstart nicht deaktivieren kannst. Bei allen anderen führt diese Version dazu, dass der Scooter kein Gas mehr annimmt.",
    varPick: "Version",
    varStdTitle: "Standard",
    varScaleTitle: "Andere Skala",
    varKickTitle: "Ältere Controller",

    featTitle: "Was drin ist",
    featCommon: [
      "Geschwindigkeitssperre, über Bluetooth ein- und ausschaltbar, der Roller startet gesperrt",
      "gesperrt auf einen festen Wert geklemmt, am Rad gemessene 455 U/min",
      "Tempomat freigegeben, geschaltet wird er wie gewohnt im Display-Menü",
      "Radgröße bleibt über den Neustart gespeichert und wirkt auf den Tacho, gesperrt zeigt das Display 10,0 Zoll",
      "Werksvorgaben auf 10 Zoll und 52 V korrigiert"
    ],
    featStdExtra: [
      "Sollwert und Skala passen zusammen, entsperrt liegt die volle Leistung an"
    ],
    featScaleExtra: [
      "Die Skala bleibt so, wie der Controller sie ab Werk bekommt, sonst ist alles wie in der Standardfassung"
    ],
    featKickExtra: [
      "Anfahren ohne Antreten fest eingeschaltet",
      "gesperrt gilt statt der festen Klemme der begrenzte und halbierte Sollwert, die gesperrte Geschwindigkeit folgt damit dem Gang"
    ],
    detailsNote: "Was sich gegenüber der letzten Version geändert hat, steht im <a id=\"detailsLink\" href=\"CHANGELOG.de.md\" data-doc=\"CHANGELOG\" data-doc-title=\"changelog\">Changelog für Firmware</a>.",
    s3: "Optionen",
    blinkerTitle: "Blinker-Fix",
    blinkerText: "Nur wichtig, wenn dein Blinker dauerhaft leuchtet statt zu blinken. In der Regel passiert das nur bei Scootern, bei denen keine Blinkerbox verbaut ist.",

    s4: "Bauen",
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
    dropSub: "Teverun IVCU R5.4.19 as .hex or .txt",
    iosHint: "<b>On an iPhone:</b> if your file cannot be tapped in the picker, rename it to <b>.txt</b>. That changes nothing about the content and the page reads it just the same, because what is checked is the image itself, never the file name.",
    uploadHint: "This page ships no firmware. You can get the matching IVCU firmware R5.4.19 online, for example <a href=\"https://github.com/spooonky/Teverun-Fighter-Mini-Pro-Eco-eKFV-Firmware\" target=\"_blank\" rel=\"noopener\">here</a>. Your dealer can send it to you as well. If you have a newer firmware, please open a <a href=\"https://github.com/Laufbursche42/tr-fw/issues\" target=\"_blank\" rel=\"noopener\">ticket</a> and attach it there, then we will build our patches for that one too.",
    okStock: "Stock firmware R5.4.19 recognised.",
    badUnreadable: "That is not a readable hex file.",
    badVersion: "Wrong firmware. Only R5.4.19 is approved.",
    badRange: "This is not an untouched stock firmware, it looks like an already patched file.",
    badSize: "The file does not have the size of the stock firmware.",
    badContent: "The version matches but the content does not. The file has been altered.",

    s2: "Controller",
    varHelp: "Which build fits you?",
    varStdWhen: "<b>Standard:</b> the normal case, take this build if you cannot tell yet which of the points applies to your scooter. Should something go wrong while patching, no panic, just pick another build and flash again.",
    varScaleWhen: "<b>Other scale:</b> take this build if your scooter gave you trouble with the standard build and gets stuck at about 15 km/h unlocked.",
    varKickWhen: "<b>Older controllers:</b> if your scooter does not pull away without a kick from the factory, meaning you cannot switch the kickstart off. On every other scooter this build makes the throttle stop responding.",
    varPick: "Build",
    varStdTitle: "Standard",
    varScaleTitle: "Other scale",
    varKickTitle: "Older controllers",

    featTitle: "What it contains",
    featCommon: [
      "speed lock, switched on and off over Bluetooth, the scooter boots locked",
      "locked speed clamped to a fixed value, a measured 455 rpm at the wheel",
      "cruise control released, switched in the display menu as usual",
      "wheel size stays stored across a restart and feeds the speedometer, the display shows 10.0 inch while locked",
      "factory defaults corrected to 10 inch and 52 V"
    ],
    featStdExtra: [
      "setpoint and scale match up, full power when unlocked"
    ],
    featScaleExtra: [
      "the scale stays the way the controller gets it from the factory, everything else is as in the standard build"
    ],
    featKickExtra: [
      "zero start permanently on",
      "while locked the capped and halved setpoint applies instead of the fixed clamp, so the locked speed follows the gear"
    ],
    detailsNote: "What changed against the previous build is in the <a id=\"detailsLink\" href=\"CHANGELOG.en.md\" data-doc=\"CHANGELOG\" data-doc-title=\"changelog\">Changelog for Firmware</a>.",
    s3: "Options",
    blinkerTitle: "Blinker fix",
    blinkerText: "Only relevant if your indicator lights up continuously instead of blinking. As a rule that happens only on scooters with no blinker box fitted.",

    s4: "Build",
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
    docClose: "Close",
    docLoading: "loading ...",
    docFail: "The document could not be loaded.",
    docEnglish: "(English)",
    docGerman: "(German)"
  }
};
