# Changelog

Was sich am Patcher und an der gebauten Firmware ändert.

Die Versionsnummer ist der Stempel, den die Firmware über Bluetooth meldet. Dieselbe Nummer plus 100 ist die Version mit der anderen Sollwert-Skala, plus 200 die Version für ältere Modelle ohne Kickstart ab Werk. Es gibt also V44, V144 und V244.

---

## Welche Version für dich

Es gibt drei. Sie unterscheiden sich in dem, was die Steuerung dem Motorcontroller über die Sollwert-Skala sagt, sonst sind sie gleich.

- **V44, Standard.** Der Normalfall. Nimm sie, wenn du noch nicht abschätzen kannst, welcher der beiden anderen Fälle auf deinen Roller zutrifft.
- **V144, andere Skala.** Für Roller, die mit der Standardversion entsperrt bei etwa 15 km/h hängenbleiben.
- **V244, ältere Controller.** Nur für Roller, die ab Werk nicht ohne Antreten anfahren, bei denen sich Kickstart also gar nicht abschalten lässt. Auf allen anderen nimmt der Roller mit dieser Version kein Gas mehr an.

Die Wahl ist keine Einbahnstraße. Passt eine Version nicht, wählst du im Patcher eine andere und flashst erneut. Wie oft ein Controller geflasht werden darf, ist nicht begrenzt.

---

## Was drin ist

Alle drei Versionen enthalten:

- Geschwindigkeitssperre, über Bluetooth aus einer passenden App ein- und ausschaltbar, der Roller startet gesperrt
- gesperrt wird der Sollwert, den die Steuerung an den Motorcontroller gibt, auf einen festen Wert geklemmt, unabhängig vom gewählten Gang. Am Rad gemessen sind das 455 U/min, also 21,8 km/h bei 80 cm Abrollumfang und 22,1 bei 81 cm
- Tempomat freigegeben, geschaltet wird er wie gewohnt im Display-Menü
- Radgröße bleibt über den Neustart gespeichert und wirkt auf den Tacho, gesperrt zeigt das Display 10,0 Zoll
- Werksvorgaben sind 10 Zoll und 52 V
- Blinker-Fix, beim Bauen wählbar

Nur die Standardversion (V44):

- Sollwert und Skala passen zusammen, entsperrt liegt die volle Leistung an

Nur die Version mit der anderen Skala (V144):

- die Skala bleibt so, wie der Controller sie ab Werk gesetzt bekommt

Nur die Version für ältere Controller (V244):

- Anfahren ohne Antreten (Kickstart) fest eingeschaltet
- gesperrt gilt statt der festen Klemme der begrenzte und halbierte Sollwert. Die gesperrte Höchstgeschwindigkeit ist damit nicht in jedem Gang gleich: nur der oberste Gang läuft bis an die Grenze, die unteren bleiben darunter

---

## V144

Neu, für Roller, die mit der Standardversion entsperrt bei etwa **15 km/h** hängenbleiben.

Der Sollwert, den die Steuerung an den Motorcontroller gibt, ist keine Geschwindigkeit, sondern eine Zahl auf einer Skala. Welche der beiden Skalen gilt, sagt ein einzelnes Bit im Rahmen an den Controller. Die Standardversion löscht dieses Bit beim Entsperren, damit die volle Leistung anliegt.

Es gibt Controller, die dieses Bit genau andersherum auffassen. Bei denen wählt das gelöschte Bit die kleinere Skala und der Roller fährt entsperrt langsamer statt schneller. Gemessen wurde das auf einem betroffenen Gerät mit rund 15 km/h. V144 fasst das Bit nicht an, es bleibt bei dem, was ab Werk gesetzt wird. Davon abgesehen ist die Version mit der Standardversion identisch.

Das hängt am Controller, nicht am Modell und nicht am Baujahr. Von außen ist es nicht zu erkennen, deshalb bleibt nur der Versuch: fährt der Roller mit der Standardversion entsperrt nicht richtig los, nimm V144.

**Wann du sie brauchst:** dein Roller kommt mit der Standardversion entsperrt nicht über rund 15 km/h hinaus. Sonst nimm die Standardversion.

---

## V44 / V244

**Sperre und Geschwindigkeit**

- Entsperrt liegt wieder die volle Leistung an: der Roller zieht am Berg durch und beschleunigt sauber. In V43 fehlte etwa die Hälfte davon, weil der Sollwert und die Skala, auf der der Controller ihn liest, nicht zusammenpassten. Die Geschwindigkeit blieb dadurch ungewöhnlich konstant, weshalb auch der Tempomat von allein ansprang. **Wer V43 fährt, sollte deshalb wechseln.**
- Gesperrt bleibt der Roller unter 22 km/h. Auf unserem Testgerät fährt schon die Serien-Firmware schneller als 22 km/h, deshalb ist der Wert, der die gesperrte Geschwindigkeit bestimmt, niedriger gesetzt. Nachgemessen mit einem Laser-Drehzahlmesser an der Lauffläche.
- Sperren wirkt sofort, auch mitten in der Fahrt und ohne den Strom zu trennen. Gemessen wurden nach einem Entsperren dieselben 21,8 km/h wie im kalten Zustand.

**Werksvorgaben**

- Fällt der Controller auf seine Werksvorgaben zurück, fährt der Roller weiter statt in den Unterspannungsschutz zu laufen. Die Vorgaben tragen 10 Zoll Radgröße und 52 V Packspannung, also die Werte, die jeder Roller hat, den wir patchen.

**Nur die Version für ältere Controller (V244)**

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
