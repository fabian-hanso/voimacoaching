# Demo-Zugänge (Mockdaten)

Alle Konten liegen im Supabase-Projekt `hkzosghsyjhptjmmomlb` und sind sofort nutzbar (E-Mail bestätigt).

**Passwort für alle Konten:** `VoimaDemo!2026`

> Neu anlegen bzw. zurücksetzen: App starten (`npm run dev`) und `npm run seed:mock` ausführen
> (läuft die App nicht auf Port 3000: `BASE_URL=http://localhost:3004 npm run seed:mock`).
> Das Skript löscht vorher alle `demo.…@example.com`-Konten samt Daten. Nur löschen: `npm run seed:mock -- --nur-loeschen`.
> Die E-Mail-Adressen sind fiktiv (`example.com`) – es werden keine Mails verschickt.

## Studios

| Login | Name | Studio | Was es zu sehen gibt |
| --- | --- | --- | --- |
| `demo.iron-gym@example.com` | Julia Hoffmann | **Iron Gym Köln** | 2 Trainer, 3 Kunden (davon 1 Mitglied ohne Coach), Kurse „Power Yoga“ & „Rücken-Fit“, Wochenkalender, Studio-Profil mit Öffnungszeiten, Team (Leitung & Rezeption), Mitglieds-Code/QR im Tab „Kunden“ |
| `demo.flow-loft@example.com` | Sven Lorenz | **Flow Yoga Loft** | 1 Trainerin, 1 Kundin, Kurs „Vinyasa Flow am Morgen“ |

## Trainer

| Login | Name | Gehört zu | Kunden | Termine & Kurse |
| --- | --- | --- | --- | --- |
| `demo.marco@example.com` | Marco Weber | Iron Gym Köln | Lena, Jonas | Plan „Ganzkörper Grundlagen“, bestätigter PT-Termin mit Lena (inkl. Kommentar & privater Notiz), **offene Anfrage** von Jonas, leitet „Rücken-Fit“, Chat mit Lena |
| `demo.sara@example.com` | Sara Klein | Iron Gym Köln | – | **Offene Anfrage** von Mia (Geräteeinweisung), Probetraining mit Gast „Max Interessent“ (vom Studio eingetragen), leitet „Power Yoga“ |
| `demo.nina@example.com` | Nina Brandt | Flow Yoga Loft | Elif | Leitet „Vinyasa Flow am Morgen“ |
| `demo.tom@example.com` | Tom Richter | eigenständig (kein Studio) | Paul | Plan „Ausdauer & Kraft draußen“, Chat mit Paul |

## Kunden

| Login | Name | Verbindung | Was es zu sehen gibt |
| --- | --- | --- | --- |
| `demo.lena@example.com` | Lena Schmidt | Coach Marco · Iron Gym | Plan, 4 Workouts (Fortschritt & Bestwerte), 2 Messungen, bestätigter PT-Termin, angemeldet bei „Power Yoga“, Chat mit Marco |
| `demo.jonas@example.com` | Jonas Becker | Coach Marco · Iron Gym | Status „Inaktiv“ (letztes Training vor 12 Tagen), offene Anfrage Ernährungsberatung |
| `demo.mia@example.com` | Mia Wagner | **Mitglied Iron Gym, ohne Coach** | Willkommenskarte für Mitglieder, offene Anfrage Geräteeinweisung bei Sara, angemeldet bei „Power Yoga“ & „Rücken-Fit“ |
| `demo.paul@example.com` | Paul Neumann | Coach Tom (eigenständig, kein Studio) | Plan mit Lauftraining, 1 Workout, Chat mit Tom |
| `demo.elif@example.com` | Elif Yılmaz | Coach Nina · Flow Yoga Loft | Angemeldet bei „Vinyasa Flow am Morgen“ |

## Gut zum Ausprobieren

- **Terminanfrage beantworten:** als Marco einloggen → Tab „Termine“ → Jonas’ Anfrage bestätigen; Jonas sieht die Bestätigung sofort an der Glocke.
- **Studio-Kalender:** als Iron Gym → Tab „Termine“ – Termine von Marco und Sara plus Kurse in einer Wochenansicht.
- **Mitglied ohne Coach:** als Mia → Kurse auf der Studio-Seite buchen, 1:1-Termin bei Marco anfragen.
- **Mitglied werden:** neues Kundenkonto registrieren und den Mitglieds-Code aus dem Iron-Gym-Dashboard (Tab „Kunden“) eingeben.
