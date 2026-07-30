# Changelog

Was sich am Patcher und an der gebauten Firmware ändert.

Die Versionsnummer ist der Stempel, den die Firmware über Bluetooth meldet. Die Fassung für ältere Modelle ohne Kickstart ab Werk trägt dieselbe Nummer plus 200, also V44 und V244.

---

## Was drin ist

Beide Fassungen enthalten:

- Geschwindigkeitssperre, über Bluetooth aus einer passenden App ein- und ausschaltbar, der Roller startet gesperrt
- gesperrt wird der Sollwert, den die Steuerung an den Motorcontroller gibt, auf einen festen Wert geklemmt, unabhängig vom gewählten Gang. Am Rad gemessen sind das 455 U/min, also 21,8 km/h bei 80 cm Abrollumfang und 22,1 bei 81 cm
- Sollwert und Skala passen zusammen, entsperrt liegt die volle Leistung an
- Tempomat freigegeben, geschaltet wird er wie gewohnt im Display-Menü
- Radgröße bleibt über den Neustart gespeichert und wirkt auf den Tacho, gesperrt zeigt das Display 10,0 Zoll
- Werksvorgaben sind 10 Zoll und 52 V
- Blinker-Fix, beim Bauen wählbar

Die Fassung für ältere Controller (V244) zusätzlich:

- Anfahren ohne Antreten (Kickstart) fest eingeschaltet
- gesperrt gilt statt der festen Klemme der begrenzte und halbierte Sollwert. Die gesperrte Höchstgeschwindigkeit ist damit nicht in jedem Gang gleich: nur der oberste Gang läuft bis an die Grenze, die unteren bleiben darunter

---

## V44 / V244

**Sperre und Geschwindigkeit**

- Entsperrt liegt wieder die volle Leistung an: der Roller zieht am Berg durch und beschleunigt sauber. In V43 fehlte etwa die Hälfte davon, weil der Sollwert und die Skala, auf der der Controller ihn liest, nicht zusammenpassten. Die Geschwindigkeit blieb dadurch ungewöhnlich konstant, weshalb auch der Tempomat von allein ansprang. **Wer V43 fährt, sollte deshalb wechseln.**
- Gesperrt bleibt der Roller unter 22 km/h. Auf unserem Testgerät fährt schon die Serien-Firmware schneller als 22 km/h, deshalb ist der Wert, der die gesperrte Geschwindigkeit bestimmt, niedriger gesetzt. Nachgemessen mit einem Laser-Drehzahlmesser an der Lauffläche.
- Sperren wirkt sofort, auch mitten in der Fahrt und ohne den Strom zu trennen. Gemessen wurden nach einem Entsperren dieselben 21,8 km/h wie im kalten Zustand.

**Werksvorgaben**

- Fällt der Controller auf seine Werksvorgaben zurück, fährt der Roller weiter statt in den Unterspannungsschutz zu laufen. Die Vorgaben tragen 10 Zoll Radgröße und 52 V Packspannung, also die Werte, die jeder Roller hat, den wir patchen.

**Nur die Fassung für ältere Controller (V244)**

- Anfahren ohne Antreten ist fest eingeschaltet, egal was in App oder Display-Menü eingestellt ist. Manche älteren Controller ignorieren diese Einstellung sonst vollständig.
- Gesperrt wird der Sollwert zuerst begrenzt und dann halbiert. Deshalb hängt die gesperrte Höchstgeschwindigkeit am gewählten Gang: der oberste Gang läuft bis an die Grenze, die unteren Gänge bleiben darunter. So kommt kein Gang gesperrt über die Grenze.
- **Ungeprüft:** der Wert, der dort begrenzt, ist aus Messungen an einem neueren Controller berechnet und bisher auf keinem älteren Controller nachgemessen. Der Bau-Dialog weist beim Bauen darauf hin.

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
