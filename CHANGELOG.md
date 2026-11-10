# Changelog

Alle nennenswerten Änderungen an **Voima Coach** (Web-App, API und Datenbank) stehen in dieser Datei.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), die Versionsnummern folgen
[Semantic Versioning](https://semver.org/lang/de/). Solange die Version unter 1.0.0 liegt, können sich
API-Endpunkte noch ändern – Änderungen, die Apps anpassen müssen, sind mit **⚠️ Breaking** markiert.

## So wird das Changelog gepflegt

- Jede Änderung kommt **sofort** unter [Unreleased] in die passende Kategorie – nicht erst beim Release.
- Kategorien: **Hinzugefügt** · **Geändert** · **Behoben** · **Entfernt** · **Sicherheit** · **Datenbank**.
- Ein Eintrag beschreibt, was sich **für Nutzer oder App-Entwickler** ändert, nicht wie es umgesetzt ist.
- **Datenbank** listet jede neue Migration aus `supabase/migrations/` und ob sie manuell eingespielt werden muss.
- Beim Release: [Unreleased] in eine neue Version mit Datum umbenennen, `version` in `package.json` anheben
  und einen Git-Tag `vX.Y.Z` setzen. Neue Funktionen → Minor (0.**x**.0), nur Fehlerbehebungen → Patch (0.0.**x**).

---

## [Unreleased]

### Hinzugefügt

- **Abo & Abrechnung mit Stripe** für Trainer und Studios (Kunden zahlen nie). Einrichtung: [`docs/STRIPE.md`](docs/STRIPE.md).
  - **7 Tage kostenlos testen** ab Registrierung, ohne Zahlungsdaten. Eine Hinweisleiste zeigt die verbleibenden Tage.
  - Neue Seite **Abo & Rechnungen** (`/dashboard/abo`, im Profilmenü): Paket wählen (Trainer: bis 10, bis 20 oder unbegrenzt Kunden; Studio), monatlich oder jährlich, Bezahlung über die Stripe-Bezahlseite. Eine laufende Testphase bleibt kostenlos.
  - **Abo verwalten** über das Stripe-Kundenportal: Paket wechseln, kündigen zum Periodenende, Zahlungsart ändern, Rechnungen herunterladen.
  - **Nach Ablauf ohne Abo** ist das Dashboard für Trainer und Studios gesperrt. Erreichbar bleiben die Abo-Seite, die Einstellungen (inkl. Konto löschen) und Abmelden. Kunden trainieren normal weiter.
  - **Kundenlimit** je Paket: Bei 10 bzw. 20 Kunden lassen sich keine neuen Einladungen erstellen oder einlösen. Bestehende Kunden bleiben verbunden.
  - **Trainer im Studio** sind über das Studio-Abo abgedeckt.
  - Fehlgeschlagene Zahlung: Das Konto bleibt nutzbar, eine Warnleiste bittet, die Zahlungsart zu aktualisieren.
  - **Gekündigtes Abo:** Eine Hinweisleiste im ganzen Dashboard zeigt das Enddatum („Abo fortsetzen“), die Abo-Seite den Status „Gekündigt“. Erkennt auch Kündigungen über `cancel_at`, wie sie neuere Stripe-Versionen aus dem Kundenportal melden.
  - Kleinunternehmer: keine Umsatzsteuer, der Hinweis nach § 19 UStG steht automatisch auf jeder Rechnung.
  - API: `GET /billing`, `POST /billing/checkout`, `POST /billing/portal`, `POST /billing/webhook`. `GET /me` liefert zusätzlich `billing`. Neuer Fehlercode `402 billing_required`.
  - `npm run stripe:setup` legt Produkte, Preise und das Kundenportal in Stripe an. Neue Variablen `STRIPE_SECRET_KEY` und `STRIPE_WEBHOOK_SECRET`.
  - Demo-Daten (`npm run seed:mock`): Demo-Trainer und -Studios bekommen ein Jahr Testphase. Neu ist der gesperrte Demo-Trainer `demo.kai@example.com` (Testphase abgelaufen, kein Abo) mit Kundin `demo.greta@example.com` sowie das gesperrte Studio „Pulse Fitness Bonn“ (`demo.pulse@example.com`) mit Trainer `demo.jan@example.com` und Kunde `demo.ben@example.com`.

- **Impressum, Datenschutzerklärung und AGB** (`/impressum`, `/datenschutz`, `/agb`), im Footer verlinkt. Die Texte sind Muster, zugeschnitten auf die eingesetzten Dienste (Vercel, Supabase, Stripe), die Kleinunternehmerregelung und Geschäftskunden. Alle persönlichen Angaben stehen gesammelt in `lib/legal.ts`. Solange `draft: true` gesetzt ist, zeigen die Seiten einen Entwurfs-Hinweis und werden nicht indexiert. Preise und Testphase in den AGB kommen aus `lib/billing-plans.ts`. Die Links stehen auch unter Login, Registrierung und Passwort-Seiten sowie am Ende jeder Dashboard-Seite (Impressum muss von überall erreichbar sein).

### Geändert

- **Markenname zentral:** „Voima Coach“ steht nur noch in `lib/site.ts` (`SITE_NAME`). Seitentitel nutzen eine Vorlage im Root-Layout („Anmelden · Voima Coach“). Stripe-Produktnamen werden beim Einrichten aus dem Namen zusammengesetzt. Die Stellen außerhalb des Codes (Logo, Supabase-E-Mails, Stripe-Dashboard) sind dort aufgelistet.
- Preise der Landingpage kommen aus derselben Quelle wie die Abrechnung (`lib/billing-plans.ts`). Die Jahressumme zeigt jetzt den echten Jahrespreis (z. B. 190 € statt 192 €).
- Preise: „Unbegrenzte Pläne & Vorlagen“ heißt jetzt „Unbegrenzt viele Trainingspläne“, weil es keine Vorlagen gibt.
- Landingpage: Im Hero ist „Fitnessstudios“ jetzt lila hervorgehoben, passend zum Lime-Balken bei „Personal Trainer“.

### Datenbank

- `20261125000000_billing.sql` – `profiles.trial_ends_at` (bestehende Trainer/Studios: 7 Tage ab Einspielen), Tabelle `subscriptions` (RLS, nur über die API), Funktion `trainer_client_limit`, Kundenlimit in `redeem_invitation`. Eingespielt.

## [1.0.0] – 2026-11-10

Erste stabile Version. Ab hier gilt Semantic Versioning streng: Änderungen an der API, die Apps anpassen müssen,
kommen nur noch mit einer neuen Hauptversion (2.0.0).

### Hinzugefügt

- **Übungskatalog mit Erklärungen:** Alle 46 Katalogübungen haben eine Anleitung mit Muskeln, Equipment, Niveau, Ausführung Schritt für Schritt und typischen Fehlern.
  - Trainer: neuer Tab „Übungen“ zum Durchsuchen, nach Übung, Muskel oder Gerät und mit Kategorien. Im Plan-Editor gibt es „Aus Katalog wählen“ je Trainingstag, ein Erklär-Icon am Übungsnamen und das Feld **„Hinweis für den Kunden“** je Übung.
  - Studios: ebenfalls ein Tab „Übungen“ mit dem kompletten Katalog.
  - Kunden: An jeder Übung im Plan und beim Training gibt es „Erklärung“, mit Katalog-Anleitung und persönlichem Hinweis des Coaches. Kunden sehen nur Anleitungen zu Übungen aus ihren zugewiesenen Plänen, einen freien Katalog gibt es für sie nicht.
  - Im Katalog ist die ganze Übungskachel klickbar und hat einen Hover-Zustand.
  - API: neuer Endpunkt `GET /exercises/guides` (angemeldet). Trainer und Studios bekommen alle Anleitungen, Kunden nur die ihrer Pläne. `GET /exercises` bleibt öffentlich und enthält keine Anleitungen.
- **Kurse im Studio** (z. B. Yoga, Spinning, Rücken-Fit):
  - Studios legen Kurse an – mit Titel, Kategorie, Beschreibung, Titelbild (16:9), Raum, zugewiesenem Trainer,
    **Plätzen pro Termin** (Kontingent), Dauer und wöchentlichen Zeiten (mehrere Tage/Uhrzeiten möglich),
    optional mit Zeitraum „ab/bis“. Kurse lassen sich pausieren und löschen.
  - Kunden des Studios sehen aktive Kurse auf der Studio-Seite und melden sich für **einzelne Termine** der nächsten
    4 Wochen an oder ab. Die Datenbank verhindert Überbuchen – auch bei gleichzeitigen Anmeldungen.
  - „Meine Kurse“ im Kunden-Dashboard mit allen kommenden Anmeldungen.
  - Kurstermine erscheinen im **Wochenkalender** (Studio: alle, Trainer: eigene) inkl. Belegung; ein Klick zeigt die Teilnehmenden.
  - Studio-Dashboard: neuer Tab **„Kurse“** mit den nächsten Terminen und deren Belegung.
  - Benachrichtigungen: Trainer erfahren, wenn sie einen Kurs leiten; angemeldete Kunden, wenn ein Termin entfällt
    (Kurs gelöscht, pausiert oder Zeiten geändert) – ihre Anmeldung wird dann automatisch storniert.
  - Verlässt ein Kunde das Studio, werden seine künftigen Kursanmeldungen storniert; verlässt ein Trainer das Studio,
    ist er keinem Kurs mehr zugewiesen.

- **Studio-Mitglieder ohne festen Coach:**
  - Jedes Studio hat einen wiederverwendbaren **Mitglieds-Code** inkl. **QR-Code** (Tab „Kunden“) – zum Aushängen an
    der Rezeption, Link kopieren oder als PNG herunterladen. Der Code lässt sich erneuern; alte Aushänge sind dann ungültig.
  - Neue Kunden registrieren sich per QR direkt als Mitglied; bestehende Kunden treten in den Einstellungen bei
    (oder im Dashboard-Feld „Mit deinem Trainer oder Studio verbinden“). Angemeldete Kunden landen beim Scannen
    direkt in den Einstellungen mit vorausgefülltem Code.
  - Mitglieder buchen **Kurse und 1:1-Termine bei allen Trainern** des Studios – ein fester Coach ist nicht nötig.
    Das Dashboard begrüßt sie mit direkten Links zu Kursen und Terminbuchung.
  - Mitglieder können zusätzlich einen eigenständigen Coach haben; die Mitgliedschaft bleibt bestehen, auch wenn
    ein Coach die Verbindung beendet. Kunden mit Coach aus einem anderen Studio können nicht beitreten (ein Studio pro Kunde).
  - Kunden können ihr Studio in den Einstellungen verlassen – künftige Kurs- und Terminbuchungen werden storniert,
    ein Coach aus diesem Studio wird ebenfalls getrennt.
  - Studio erhält Benachrichtigungen, wenn Mitglieder beitreten oder austreten.
- **Kunden aus dem Studio entfernen** (z. B. nach Vertragsende): neuer Button in der Studio-Kundenliste mit
  Bestätigung („entfernen“). Ein Coach aus dem Studio wird getrennt (Planzuweisungen aufgehoben), ein eigenständiger
  Coach bleibt. Künftige Kurs- und Terminbuchungen im Studio werden storniert; Kunde und ggf. Coach bekommen einen Hinweis.

- **Demo-Daten:** `npm run seed:mock` legt 2 Studios, 4 Trainer und 5 Kunden mit Plänen, Workouts, Chats,
  Terminen und Kursen an (wiederholbar; Zugänge in `mock.md`).

### Geändert

- Studio-Seite: Erst die Studio-Infos (Ausstattung, Team, Öffnungszeiten, Kontakt), danach freie Termine bei Trainern und Kurse.
- Startseite (Kunde): Die Kachel „Nächstes Training“ hat ein Gym-Foto als Hintergrund unter einer dunklen Ebene, weißen Text und einen Lime-Button (`public/images/dashboard-training.jpg`, zugeschnitten und auf 1600 px verkleinert).
- Training: Die Abhak-Buttons für Sätze und Ausdauer-Einheiten sind kleiner und zeigen schon vor dem Abhaken einen grauen Haken. Erledigt werden sie Lime.
- **Landingpage neu aufgebaut** – fokussiert auf Personal Trainer und Studios, kurz und übersichtlich:
  - Hero mit klarer Zielgruppe („Die Software für Personal Trainer und Fitnessstudios“), CTAs „Als Trainer starten“ und „Studio anlegen“, Karten mit Plan, Terminanfrage und Kursbelegung, die beim Laden nacheinander von unten einschweben (nicht bei „Bewegung reduzieren“). Testzeitraum überall **7 statt 14 Tage**.
  - Neue Abschnitte: Funktionen auf einen Blick (mit Kennzeichnung Trainer/Studios), Für Trainer, Für Studios, ein kompakter Kunden-Block (kostenlos, per Einladung), Preise, FAQ und Abschluss-CTA.
  - Entfernt: erfundene Zahlen, Bewertungen und Stimmen sowie Aussagen, die das Produkt nicht erfüllt (800 Übungen mit Videos, Fortschrittsfotos, iOS-/Android-Apps, Check-in-Fragebögen).
  - Footer verlinkt echte Ziele statt Platzhaltern. Impressum, Datenschutz und AGB fehlen noch als Seiten.
- **Landingpage in Komponenten zerlegt:** `app/page.tsx` setzt die Seite nur noch zusammen. Jeder Abschnitt ist eine eigene Komponente in `components/landing/` (Header, Hero, Hero-Karten, Funktionen, Trainer/Studios/Kunden, Vorschauen, FAQ, Abschluss, Footer, strukturierte Daten), dazu gemeinsame Bausteine (`Section`, `SectionHeading`, `CheckList`, `CtaLink`, `AudienceSection`). Alle Texte und Listen stehen in `components/landing/content.ts`. Die Preis-Überschrift nutzt jetzt denselben Kopf wie die anderen Abschnitte.
- **Alle Seiten in eigenständige Komponenten zerlegt:** In `app/` liegen nur noch Routen (Seiten, Layouts, Fehlerseiten, API). Die großen Feature-Dateien sind nach `components/` gezogen und nach Bereichen aufgeteilt, eine Datei pro Komponente oder Abschnitt:
  - `components/dashboard/appointments/` (vorher eine Datei mit 1.900 Zeilen), `studio/`, `trainer/`, `client/`, `courses/`, `settings/`, `messaging/` und `studio-page/`, jeweils mit `utils.ts` für gemeinsame Hilfsfunktionen.
  - Kleinere Dashboard-Bausteine (Shell, Modal, Benachrichtigungen, Fortschritt, Übungsanleitungen …) liegen direkt in `components/dashboard/`, die Formulare für Login, Registrierung und Passwort in `components/auth/`.
  - Neu: `ButtonLink` (Link im Button-Look) in `components/ui.tsx`, `AuthSwitchLink` für die Auth-Seiten, `NotFoundState` und `GlobalErrorState`.
  - Keine Verhaltensänderung, keine Import-Zyklen.
- **SEO:** eigener Seitentitel und Beschreibung, Canonical-URL, Open-Graph-/Twitter-Vorschau mit Bild (`app/opengraph-image.jpg`), strukturierte Daten (`SoftwareApplication` und `FAQPage`), `robots.txt` (Dashboard und API ausgeschlossen) und `sitemap.xml`. Die Live-Adresse steht fest in `lib/site.ts` (vorläufig `https://voimacoach.vercel.app`, später durch die echte Domain ersetzen).
- **Einheitliche Rundungen:** feste Stufen als Design-Tokens (`rounded-box` 24 px für äußere Flächen, `rounded-tile` 16 px für Flächen in Karten, `rounded-control` 12 px für Buttons/Felder, `rounded-inner` 8 px). Alle CTAs haben jetzt dieselbe Form, keine Pillen-Buttons mehr.
- Aktiver Tab in den Dashboards (Team, Kunden, …) ist jetzt schwarz statt dunkelgrün.
- Studio-Kundenliste: Status **„Mitglied“** für Mitglieder ohne Coach, Filter „Mitglieder“ und „Coach fehlt“.
  Der Hinweis „Kunden ohne Trainer – bitte zuweisen“ erscheint nur noch, wenn ein Coach weggefallen ist.
- Registrierung als Kunde: Das Code-Feld akzeptiert Einladungscodes von Trainern **und** Studio-Codes.

### Behoben

- Filter-Chips im Übungskatalog und die Tagesauswahl bei der Terminbuchung werden oben nicht mehr abgeschnitten (Rand und Fokus-Ring hatten in der horizontal scrollenden Zeile keinen Platz).
- Die Tab-Leisten im Studio- und Trainer-Dashboard (Team, Kunden, …) ließen sich vertikal scrollen. Die Leiste scrollt jetzt nur noch horizontal, und zwar ohne sichtbaren Scrollbalken.
- Startseite (Kunde): Der Nachrichten-Button in der Karte „Dein Coach“ hat jetzt einen sichtbaren Hover-Zustand.

### Datenbank

- `20261124000000_member_removed.sql` – Hinweisarten `member_removed` und `studio_client_removed`. Eingespielt.
- `20261123000000_studio_members.sql` – Mitglieds-Code `studios.join_code`, `profiles.studio_member`,
  Beitritt `join_studio_as_client`, Registrierung mit `studio_join_code`, Mitgliedschaft bleibt bei eigenständigen
  Coaches erhalten, Hinweisarten `member_joined`/`member_left`. Eingespielt.
- `20261122000000_courses.sql` – Tabellen `courses` und `course_bookings`, Anmeldung mit Kontingent-Prüfung
  (`book_course`), neue Hinweisarten `course_assigned` und `course_cancelled`. Eingespielt.

---

## [0.2.0] – 2026-11-10

### Hinzugefügt

- **Studio-Branding:** Im Studio-Kontext (Inhaber, Trainer und Kunden eines Studios) zeigt der Header nur noch
  Logo und Namen des Studios. Voima Coach erscheint dort als kleines „powered by Voima Coach“ im Profilmenü.
- **Benachrichtigungen in Echtzeit:** Die Glocke im Header aktualisiert sich sofort bei neuen, gelesenen oder
  entfernten Hinweisen (benötigt die Migration `20261121000000`). Fallback: minütliches Nachladen bei gestörter
  Verbindung, sonst alle 5 Minuten als Sicherheitsnetz.
- Profilmenü: Eintrag **„Studio-Infos & Öffnungszeiten“** (für Studio-Inhaber „Studio-Seite ansehen“).
- Kunden erreichen die Studio-Seite zusätzlich über die Studio-Zeile in der Karte „Dein Coach“.

### Geändert

- Das Logo oben links führt im Studio-Kontext zum Dashboard; die Studio-Seite ist über das Profilmenü erreichbar.
- Während das Profil lädt, zeigt der Header einen neutralen Platzhalter statt kurz das Voima-Logo.

### Entfernt

- Glühbirnen-Icon („Feature wünschen“) aus dem Header – die Funktion bleibt im Profilmenü und als Kontext-Link.
- Pfeil neben dem Profilbild auf Mobilgeräten.

### Behoben

- **Neue Chat-Nachrichten erschienen erst nach einem Reload.** Nach einem Seitenaufruf baute sich die
  Realtime-Verbindung auf, bevor die Sitzung aus dem Cookie gelesen war, und lief ohne Login-Token – die Datenbank
  filterte dann still alle Nachrichten heraus. Jetzt wird erst die Sitzung geladen, dann abonniert; nach dem
  Verbinden wird einmal nachgeladen.

### Datenbank

- `20261121000000_notices_realtime.sql` – Lese-Policy „Nutzer lesen eigene Hinweise“ und Aufnahme der Tabelle
  `notices` in die Realtime-Publication. Eingespielt.

---

## [0.1.0] – 2026-11-10

Erste vollständige Version: Landingpage, Web-App für Trainer, Kunden und Studios sowie eine REST-API für
Web und native Apps (Dokumentation: [`docs/API.md`](docs/API.md)).

### Hinzugefügt

#### Landingpage

- Startseite für Trainer und Kunden mit großem Hero-Bild, Funktionen, Ablauf, Stimmen und Abschluss-CTA.
- Preise: Kunde (kostenlos), Trainer-Pakete bis 10 / bis 20 / unbegrenzt Kunden als aufgefächerte Karten,
  Studio für 299 €/Monat; Umschalter monatlich/jährlich („2 Monate gratis“).
- Angemeldete sehen statt „Anmelden“/„Kostenlos starten“ den Button **„Zum Dashboard“**.

#### Konten & Anmeldung

- Registrierung als Trainer, Kunde oder Studio – optional direkt mit Einladungs- bzw. Studio-Code.
- Login, Passwort vergessen/zurücksetzen, E-Mail-Bestätigung.
- Angemeldete werden von Login und Registrierung automatisch ins Dashboard geleitet.
- Einstellungen: Profilbild, Name, **Telefonnummer**, E-Mail und Passwort ändern, überall abmelden, Konto löschen.

#### Trainer & Kunden

- Kunden per Einladungscode verbinden; Kundenliste mit Status **Aktiv**, **Inaktiv**, **Neu angemeldet**, **Eingeladen**.
- Trainingspläne mit Kraft- und Ausdauerübungen (Laufband, Rad, Rudern, …) aus einem Übungskatalog.
- Kunden loggen Workouts (nach Plan oder frei) und Messwerte (Gewicht, Körperfett, Taille).
- Fortschritt: Workouts, Streak, Ausdauer, Volumen pro Woche, Bestwerte, Körpergewicht.
- **Chat in Echtzeit** zwischen Trainer und Kunde, inkl. Ungelesen-Zähler.
- Kunden entfernen nur nach Eingabe von „löschen“ im Bestätigungsdialog.
- Profilbilder für Trainer und Kunden.

#### Studios

- Studios laden Trainer per Code ein; deren Kunden gehören automatisch zum Studio.
- Kunden einem Trainer zuweisen, alle Kunden eines Trainers übertragen (z. B. bei Ausfall), Trainer entfernen.
- Studio-Logo, sichtbar für Trainer und Kunden.
- **Studio-Seite** mit Beschreibung, Öffnungszeiten (inkl. „Jetzt geöffnet“), Adresse, Kontakt, Ausstattung
  und Team (Leitung, Trainer, Service & Empfang, Weitere) – Mitarbeitende mit Foto, ohne eigenes Konto.

#### Termine

- Jeder **Trainer** legt Angebote (Personal Training, Einführung, Ernährungsberatung, Probetraining,
  Körperanalyse, Beratungsgespräch, Sonstiges) und wöchentliche Verfügbarkeit fest.
- Kunden fragen beim eigenen Coach an, Studio-Kunden bei **jedem Trainer des Studios** – mehrere Termine
  gleichzeitig bei verschiedenen Trainern sind möglich. Doppelbuchungen beim selben Trainer verhindert die Datenbank.
- Trainer bestätigen oder lehnen ab (optional mit Nachricht); Kunden, Trainer und Studio können absagen.
- **Wochenkalender** für Trainer (eigene Termine) und Studios (alle Trainer, filterbar, Verfügbarkeit als Heatmap).
- Trainer und Studios tragen Termine direkt ein – auch für Gäste ohne Konto (z. B. Probetraining).
- Termin-Details mit **Kommentaren** (Kunde, Trainer, Studio) und **privater Notiz** nur für den Trainer.
- **Kontaktdaten** am Termin: E-Mail und Telefon aus dem Kundenprofil oder vom Ersteller des Termins gepflegt.
- Studio-Seite: Übersicht der Trainer mit Angeboten und nächstem freien Termin.
- Endet eine Verbindung (Coachwechsel, Austritt aus dem Studio, …), werden betroffene künftige Termine automatisch storniert.

#### Benachrichtigungen & Feedback

- **Glocke im Header** mit Ungelesen-Zähler für Terminanfragen, Bestätigungen, Absagen, Kommentare und
  beendete Verbindungen (z. B. Konto gelöscht, Coach gewechselt). Beim Öffnen gelten alle als gelesen.
- „Feature wünschen“ für Trainer und Studios (nur für das Voima-Coach-Team sichtbar).

#### API

- REST-API unter `/api/v1` für Web und native Apps (Bearer-Token oder Cookies), einheitliche JSON-Fehler.

### Behoben

- Nach Abmelden und Anmelden mit einem anderen Konto war kurz die Oberfläche des vorherigen Kontos sichtbar.
  Anmelde-Wechsel laden die Seite jetzt vollständig neu; zusätzlich reagiert das Dashboard auf Ab-/Anmeldungen in anderen Tabs.

### Sicherheit

- Row Level Security auf allen Tabellen; Daten laufen ausschließlich über die API, die jede Berechtigung selbst prüft.
- Konto löschen entfernt alle personenbezogenen Daten inkl. Bilder; die Gegenseite erhält einen Hinweis.

### Datenbank

Alle Migrationen in `supabase/migrations/` sind auf dem Projekt eingespielt:

| Migration | Inhalt |
| --- | --- |
| `20261109000000_init` | Profile, Einladungen, Pläne, Workouts, Messwerte |
| `20261110000000_messages` | Chat (inkl. Realtime) |
| `20261111000000_avatars` | Profilbilder (Storage) |
| `20261112000000_notices` | Hinweise bei beendeten Verbindungen |
| `20261113000000_feature_requests` | Feature-Wünsche |
| `20261114000000_studios` | Studios, Studio-Einladungen, Übertragungen |
| `20261115000000_studio_profile` | Studio-Infos, Öffnungszeiten, Ausstattung |
| `20261116000000_studio_staff` | Studio-Mitarbeitende |
| `20261117000000_appointments` | Termine & Buchungsprofile |
| `20261118000000_trainer_appointments` | Termine über Trainer statt Studio, Gäste, Gelesen-Status für Hinweise |
| `20261119000000_appointment_comments` | Kommentare & private Trainer-Notizen |
| `20261120000000_contact_details` | Telefon im Profil, Kontaktdaten am Termin |

[Unreleased]: https://github.com/fabian-hanso/voimacoaching/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/fabian-hanso/voimacoaching/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/fabian-hanso/voimacoaching/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/fabian-hanso/voimacoaching/releases/tag/v0.1.0
