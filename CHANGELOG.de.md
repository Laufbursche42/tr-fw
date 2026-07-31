# Changelog

Was sich am Patcher und an der gebauten Firmware ändert.

Die Versionsnummer ist der Stempel, den die Firmware über Bluetooth meldet. Dieselbe Nummer plus 200 ist die Version für ältere Modelle ohne Kickstart ab Werk. Es gibt also V45 und V245.

---

## V45 auf einen Blick

- **Die Serien-Firmware R5.4.21 wird angenommen.** Bisher ging nur die R5.4.19. Beide Stände bekommen denselben Funktionsumfang.
- **Die gesperrte Geschwindigkeit stellst du beim Bauen selbst ein**, getrennt für den Zustand direkt nach dem Einschalten und für den Zustand nach einem Entsperren. Nötig ist das, weil derselbe eingestellte Wert nicht auf jedem Roller dieselbe Geschwindigkeit ergibt. Mit einer eingestellten 22 fährt der eine Roller gesperrt zu schnell, der nächste zu langsam. Vorhersagen lässt sich das nicht, deshalb ist der Wert einstellbar statt fest.
- **Die Skala bleibt in der Standardversion so, wie der Controller sie ab Werk gesetzt bekommt.** Das ist der Weg, der auf den neueren Geräten zuverlässiger läuft.

---

## Welche Version für dich

Es gibt zwei. Sie unterscheiden sich in dem, was die Steuerung dem Motorcontroller über die Sollwert-Skala sagt, sonst sind sie gleich.

- **V45, Standard.** Der Normalfall. Die Skala bleibt so, wie der Controller sie ab Werk gesetzt bekommt.
- **V245, ältere Controller.** Nur für Roller, die ab Werk nicht ohne Antreten anfahren, bei denen sich Kickstart also gar nicht abschalten lässt. Auf allen anderen nimmt der Roller mit dieser Version kein Gas mehr an.

Die Wahl ist keine Einbahnstraße. Passt eine Version nicht, wählst du im Patcher eine andere und flashst erneut. Wie oft ein Controller geflasht werden darf, ist nicht begrenzt.

---

## Welche Serien-Firmware der Patcher annimmt

R5.4.19 und R5.4.21. Erkannt wird der Inhalt des Abbilds, nicht der Dateiname, eine anders formatierte Hex-Datei derselben Firmware geht also genauso durch.

Die gebaute Datei trägt den Serienstand im Namen, `AWIVCU_APP_R5_4_19_V45.hex` oder `AWIVCU_APP_R5_4_21_V45.hex`. Geflasht wird nur die Datei, die zu dem Stand passt, der auf deinem Roller läuft. Die andere gehört auf einen anderen Roller.

---

## Gesperrte Geschwindigkeit einstellbar

Beim Bauen wählst du, worauf der Roller geklemmt wird, solange er gesperrt ist. Es sind zwei Felder mit jeweils 19, 20, 21 oder 22:

- **Seit dem Einschalten nie entsperrt.** Gilt, solange der Roller seit dem Einschalten noch nicht offen gefahren ist.
- **Nach Entsperren und wieder Sperren.** Gilt, sobald er einmal offen war, bis er das nächste Mal ausgeschaltet wird.

Das sind die Zahlen, mit denen die Firmware selbst rechnet, keine km/h. Die 20 ist der Wert, den bisher jede Version fest eingebaut hatte, am Rad gemessen 455 U/min. Was daraus auf der Straße wird, hängt an Reifen, Gewicht und eingestellter Radgröße. Derselbe Wert ergibt deshalb nicht auf jedem Roller dieselbe Geschwindigkeit: mit einer eingestellten 22 läuft der eine gesperrt über die erlaubten 22 km/h, der nächste bleibt darunter. Ein höherer Wert macht schneller, ein niedrigerer langsamer. Miss deinen Roller nach und stell es dir passend ein.

Zwei Felder gibt es, weil der Controller nach einem Entsperren bis zum nächsten Ausschalten oft etwas höher klemmt als beim Losfahren. So lässt sich beides getrennt treffen.

Vorgabe sind in beiden Feldern 21.

---

## Was drin ist

Beide Versionen enthalten:

- Geschwindigkeitssperre, über Bluetooth aus einer passenden App ein- und ausschaltbar, der Roller startet gesperrt
- gesperrt wird der Sollwert, den die Steuerung an den Motorcontroller gibt, auf den eingestellten Wert geklemmt, unabhängig vom gewählten Gang
- Sperren wirkt sofort, auch mitten in der Fahrt und ohne den Strom zu trennen
- Tempomat freigegeben, geschaltet wird er wie gewohnt im Display-Menü
- Radgröße bleibt über den Neustart gespeichert und wirkt auf den Tacho, gesperrt zeigt das Display 10,0 Zoll
- Werksvorgaben sind 10 Zoll und 52 V. Fällt der Controller darauf zurück, fährt der Roller weiter statt in den Unterspannungsschutz zu laufen
- Blinker-Fix, beim Bauen wählbar

Nur die Version für ältere Controller (V245):

- Anfahren ohne Antreten (Kickstart) fest eingeschaltet
- gesperrt wird der Sollwert zuerst begrenzt und dann halbiert. Deshalb hängt die gesperrte Höchstgeschwindigkeit am gewählten Gang: der oberste Gang läuft bis an die Grenze, die unteren Gänge bleiben darunter. So kommt kein Gang gesperrt über die Grenze
- **Ungeprüft:** die gesperrte Geschwindigkeit dieser Version ist auf keinem älteren Controller nachgemessen. Der Wert, der sie begrenzt, ist aus Messungen an einem neueren Controller berechnet. Der Bau-Dialog weist beim Bauen darauf hin

---

## Nach dem Flashen: Gänge durchschalten

Das Display führt seine eigene Kopie der Einstellungen pro Gang, also der Geschwindigkeiten und der Ströme. Diese Kopie schreibt es laufend in den Controller. Einen neuen Wert vom Controller übernimmt es nur dann, wenn der Gang wechselt.

Das betrifft nur Werte, die **aus einer App** kommen. Deshalb: nach dem Flashen alles einmal in der App einstellen und danach einmal alle Gänge durchschalten, damit das Display die Werte übernimmt. Genauso nach jeder späteren Änderung in der App, einstellen und dann wieder alle Gänge durchschalten. Sonst stempelt das Display seine alte Kopie zurück und die Änderung sieht aus, als wäre sie nicht angekommen.

Wer stattdessen **im Display-Menü** einstellt, braucht das nicht: dort ändert sich die Kopie des Displays sofort. Genau die schreibt es ohnehin von sich aus in den Controller.

Das ist kein Fehler. So arbeitet das Fahrzeug ab Werk, die Einstellungen pro Gang gehören dem Display.

---

## Zur Radgröße

Die Radgröße wirkt ausschließlich auf die Geschwindigkeit, die das Display daraus berechnet, also auf Tacho und Kilometerstand. Den Motorcontroller erreicht sie nie. An der tatsächlich gefahrenen Geschwindigkeit ändert sie nichts.

Einstellen lässt sie sich in beiden Zuständen und gespeichert wird immer dein Wert. Angezeigt wird er aber nicht überall gleich:

```
Roller-Display   entsperrt    dein Wert
Roller-Display   gesperrt     10,0 Zoll
App              entsperrt    dein Wert
App              gesperrt     dein Wert
```

Der Grund ist, dass die Maskierung nur in dem Frame sitzt, den die IVCU an das Display schickt. Der gespeicherte Wert wird dabei nie überschrieben, er ist beim Entsperren sofort wieder da. Was die App anzeigt, ist deshalb durchgehend der echte Wert.
