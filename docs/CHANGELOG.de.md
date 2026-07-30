# Changelog

Was sich am Patcher und an der gebauten Firmware ändert. Neueste Einträge oben.

Die Versionsnummer ist der Stempel, den die Firmware über Bluetooth meldet. Die Kickstart-Fassung trägt dieselbe Nummer plus 200, also V44 und V244.

---

## Was drin ist

Beide Fassungen enthalten:

- Geschwindigkeitssperre, über Bluetooth aus einer passenden App ein- und ausschaltbar, der Roller startet gesperrt
- gesperrt auf einen festen Wert geklemmt. Am Rad gemessen sind das 455 U/min, also 21,8 km/h bei
  80 cm Abrollumfang und 22,1 bei 81 cm
- Sollwert und Skala passen zusammen, entsperrt liegt die volle Leistung an
- Tempomat freigegeben, geschaltet wird er wie gewohnt im Display-Menü
- Radgröße bleibt über den Neustart gespeichert und wirkt auf den Tacho, gesperrt zeigt das Display 10,0 Zoll
- Werksvorgaben auf 10 Zoll und 52 V korrigiert
- Blinker-Fix, beim Bauen wählbar

Die Fassung für ältere Controller (V244) zusätzlich:

- Anfahren ohne Antreten fest eingeschaltet
- gesperrt gilt statt der festen Klemme der begrenzte und halbierte Sollwert, die gesperrte Geschwindigkeit folgt damit dem Gang

---

## V44 / V244

**Sperre und Geschwindigkeit**

- Der Roller zieht am Berg wieder durch, beschleunigt sauber und der Tempomat springt nicht mehr von allein an. **Das ist der wichtigste Grund, von V43 zu wechseln:** dort läuft der volle Sollwert auf der gedrosselten Skala, was ungefähr die Hälfte von allem kostet. Die Geschwindigkeit klebt dabei so konstant, dass der Tempomat sie als gehaltenes Tempo liest. Jetzt hängt die Skala am selben Schalter wie die Sperre.
- Gesperrt bleibt der Roller unter 22 km/h. Auf unserem Testgerät fährt schon die Serien-Firmware schneller als 22 km/h, deshalb ist der Wert, der die gesperrte Geschwindigkeit bestimmt, niedriger gesetzt. Nachgemessen mit einem Laser-Drehzahlmesser an der Lauffläche.
- Sperren wirkt sofort, auch mitten in der Fahrt und ohne den Strom zu trennen. Gemessen wurden nach
  einem Entsperren dieselben 455 U/min wie im kalten Zustand.

**Werksvorgaben**

- Fällt der Controller auf seine Werksvorgaben zurück, fährt der Roller weiter statt in den Unterspannungsschutz zu laufen. Die Vorgaben tragen 10 Zoll Radgröße und 52 V Packspannung, also die Werte, die jeder Roller hat, den wir patchen. Mit den Vorgaben der Serien-Firmware, 11 Zoll und 60 V, geht der Controller in den Unterspannungsschutz.

**Nur die Fassung für ältere Controller (V244)**

- Anfahren ohne Antreten ist fest eingeschaltet, egal was in App oder Display-Menü eingestellt ist. Manche älteren Controller ignorieren diese Einstellung sonst vollständig.
- Gesperrt folgt die Geschwindigkeit dem Gang: der Sollwert wird zuerst begrenzt und dann halbiert. So läuft auch der oberste Gang gesperrt nicht über die Grenze.
- **Ungeprüft:** der Wert, der dort begrenzt, ist aus Messungen an einem neueren Controller berechnet und bisher auf keinem älteren Controller nachgemessen. Der Bau-Dialog weist beim Bauen darauf hin.

---

## Nach dem Flashen: Gänge durchschalten

Das Display führt seine eigene Kopie der Einstellungen pro Gang, also der Geschwindigkeiten und der Ströme. Diese Kopie schreibt es laufend in den Controller. Einen neuen Wert vom Controller übernimmt es nur dann, wenn der Gang wechselt.

Deshalb: nach dem Flashen alles einmal richtig einstellen und danach einmal alle Gänge durchschalten, damit das Display die Werte übernimmt. Genauso nach jeder späteren Änderung, einstellen und dann wieder alle Gänge durchschalten. Sonst stempelt das Display seine alte Kopie zurück und die Änderung sieht aus, als wäre sie nicht angekommen.

Das ist kein Fehler. So arbeitet das Fahrzeug ab Werk, die Einstellungen pro Gang gehören dem Display.

---

## Zur Radgröße

Einstellen lässt sie sich in beiden Zuständen und gespeichert wird immer dein Wert. Angezeigt wird er aber nicht überall gleich:

```
Roller-Display   entsperrt    dein Wert
Roller-Display   gesperrt     10,0 Zoll
App              entsperrt    dein Wert
App              gesperrt     dein Wert
```

Der Grund ist, dass die Maskierung nur in dem Frame sitzt, den die IVCU an das Display schickt. Der gespeicherte Wert wird dabei nie überschrieben, er ist beim Entsperren sofort wieder da. Was die App anzeigt, ist deshalb durchgehend der echte Wert.

Die Radgröße wirkt ohnehin nur auf Tacho und Kilometerstand, nie auf den Motorcontroller. An der tatsächlich gefahrenen Geschwindigkeit ändert sie nichts.
