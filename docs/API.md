# Voima Coach API v1

Eine API für **Web und Apps**. Das Web-Dashboard nutzt genau dieselben Endpunkte wie die mobilen Apps.

- Basis-URL: `https://<deine-domain>/api/v1`
- Format: JSON (`Content-Type: application/json`)
- Zeitangaben: ISO 8601 in UTC (`2026-11-09T18:30:00.000Z`)
- Übersicht aller Endpunkte: `GET /api/v1`

## Authentifizierung (Supabase Auth)

Registrierung, Login, Passwort-Reset und (später) Social Login laufen über **Supabase Auth**.
In der App verwendest du das passende Supabase-SDK, zum Beispiel `@supabase/supabase-js` (React Native/Expo), `supabase-swift` oder `supabase-kt`.
Für die App brauchst du nur die **Projekt-URL** und den **Publishable Key**. Den Secret Key niemals in eine App einbauen.

```ts
// Registrierung (Kunde mit Einladungscode)
await supabase.auth.signUp({
  email,
  password,
  options: { data: { name: "Lena", role: "client", invite_code: "K7MX2QPA" } }, // role: "trainer" | "client"
});

// Login
const { data } = await supabase.auth.signInWithPassword({ email, password });

// API-Aufruf: Access Token als Bearer mitschicken
const token = (await supabase.auth.getSession()).data.session?.access_token;
await fetch(`${BASE}/api/v1/me`, { headers: { Authorization: `Bearer ${token}` } });
```

Nach der Registrierung legt die Datenbank automatisch ein Profil an (Name, Rolle) und löst einen gültigen `invite_code` ein.
Ein ungültiger Code verhindert die Registrierung nicht. Er kann später über `POST /me/trainer` eingegeben werden.

**Passwort und E-Mail ändern, überall abmelden:** Das läuft direkt über das Supabase-SDK (`auth.updateUser({ password })`, `auth.updateUser({ email })`, `auth.signOut({ scope: "global" })`), nicht über diese API.
Das Web prüft vor einer Passwortänderung das aktuelle Passwort per `signInWithPassword` mit einem separaten Client.

Das Supabase-SDK erneuert Tokens automatisch. Bei `401` die Session erneuern oder neu einloggen.

## Fehlerformat

```json
{ "error": { "code": "validation_error", "message": "Ungültige Eingabe.", "details": [{ "path": "title", "message": "Titel fehlt." }] } }
```

| Status | `code`             | Bedeutung                                     |
| ------ | ------------------ | --------------------------------------------- |
| 400    | `bad_request`      | Fachlicher Fehler (z. B. Code abgelaufen)      |
| 401    | `unauthorized`     | Kein/ungültiges Token                          |
| 403    | `forbidden`        | Falsche Rolle (z. B. Kunde ruft Trainer-API)   |
| 404    | `not_found`        | Existiert nicht oder kein Zugriff              |
| 409    | `conflict`         | Existiert bereits                              |
| 422    | `validation_error` | Body ungültig, siehe `details`                 |

## Endpunkte

Legende: 🌐 öffentlich · 👤 alle angemeldeten Nutzer · 🏋️ nur Trainer · 🙋 nur Kunden · 🏢 nur Studio-Inhaber

### Übungskatalog

| Methode | Pfad          | Wer | Beschreibung                                                                 |
| ------- | ------------- | --- | ---------------------------------------------------------------------------- |
| GET     | `/exercises`  | 🌐  | `{ exercises, cardioMetrics, defaultCardioMetrics }`: Übungskatalog für Kraft und Ausdauer, inklusive der Messwerte pro Gerät (z. B. Laufband: Dauer, Distanz, Steigung, Puls, kcal). Jede Übung hat `guide` mit `summary`, `muscles[]`, `equipment`, `level` (`Einsteiger`/`Fortgeschritten`), `steps[]`, `tips[]` – oder `null`. Apps zeigen damit „Übung erklären“ an. |

Übungsnamen sind frei wählbar. Der Katalog liefert nur Vorschläge.

### Profil

| Methode | Pfad                 | Wer | Beschreibung                                          |
| ------- | -------------------- | --- | ----------------------------------------------------- |
| GET     | `/me`                | 👤  | `{ user, trainer }`, wobei `trainer` beim Kunden gefüllt ist |
| PATCH   | `/me`                | 👤  | Body `{ name? }`                                       |
| DELETE  | `/me`                | 👤  | **Konto endgültig löschen**, inklusive Workouts, Messwerten, Nachrichten und Profilbild. Bei Trainern zusätzlich Pläne und Einladungen, Kunden verlieren nur die Verbindung. 204 |
| POST    | `/me/trainer`        | 🙋  | Body `{ inviteCode }`, verbindet den Kunden mit dem Trainer |
| DELETE  | `/me/trainer`        | 🙋  | Verbindung zum Coach trennen. Dessen Planzuweisungen werden aufgehoben, eigene Workouts bleiben |
| POST    | `/me/avatar`         | 👤  | Profilbild hochladen: `multipart/form-data`, Feld `file` (JPEG/PNG/WebP, max. 5 MB, Typ wird anhand der Bytes geprüft) → `{ user, trainer }` |
| DELETE  | `/me/avatar`         | 👤  | Profilbild entfernen → `{ user, trainer }`              |
| GET     | `/me/plans`          | 🙋  | `{ plans: AssignedPlan[] }`                            |
| GET     | `/me/progress`       | 🙋  | `Progress`                                             |

### Einladungen

| Methode | Pfad                    | Wer | Beschreibung                                                   |
| ------- | ----------------------- | --- | -------------------------------------------------------------- |
| GET     | `/invitations`          | 🏋️  | `{ invitations: Invitation[] }`                                 |
| POST    | `/invitations`          | 🏋️  | Body `{ email?, validDays? = 14 }` → `Invitation` (8-stelliger Code) |
| GET     | `/invitations/:code`    | 🌐  | `{ code, valid, trainerName }`, z. B. für den Registrierungs-Screen |
| DELETE  | `/invitations/:code`    | 🏋️  | 204                                                             |

Einladungslink für das Web: `/registrieren?rolle=kunde&code=<CODE>`

### Kunden (Trainer-Sicht)

| Methode | Pfad                     | Wer | Beschreibung                                         |
| ------- | ------------------------ | --- | ---------------------------------------------------- |
| GET     | `/clients`               | 🏋️  | `{ clients: ClientSummary[] }`                        |
| GET     | `/clients/:id`           | 🏋️  | `{ client, plans, progress }`                         |
| GET     | `/clients/:id/progress`  | 🏋️  | `Progress`                                            |
| DELETE  | `/clients/:id`           | 🏋️  | Trennt Kunde und Trainer und hebt Planzuweisungen auf, 204 |

### Trainingspläne

| Methode | Pfad                                   | Wer | Beschreibung                                         |
| ------- | -------------------------------------- | --- | ---------------------------------------------------- |
| GET     | `/plans`                               | 👤  | Trainer: eigene Pläne inkl. `assignedClientIds`. Kunde: zugewiesene Pläne |
| POST    | `/plans`                               | 🏋️  | Body `PlanInput` → `Plan`                             |
| GET     | `/plans/:id`                           | 👤  | Trainer: eigener Plan. Kunde: nur ein zugewiesener Plan |
| PUT     | `/plans/:id`                           | 🏋️  | Body `PlanInput` → `Plan`                             |
| DELETE  | `/plans/:id`                           | 🏋️  | 204                                                   |
| POST    | `/plans/:id/assignments`               | 🏋️  | Body `{ clientId }` → Plan mit Zuweisungen            |
| DELETE  | `/plans/:id/assignments/:clientId`     | 🏋️  | 204                                                   |

```jsonc
// PlanInput
{
  "title": "Kraftaufbau Phase 1",
  "description": "3 Tage/Woche",
  "days": [
    {
      "name": "Unterkörper A",
      "exercises": [
        // Kraft (type kann entfallen, Standard ist "strength")
        { "name": "Kniebeuge", "type": "strength", "sets": 4, "reps": "6-8", "weightKg": 80, "restSec": 120, "notes": "Tempo 3-1-1" },
        // Ausdauer: durationMin und/oder distanceKm, intensity als Freitext
        { "name": "Laufband", "type": "cardio", "durationMin": 20, "distanceKm": null, "intensity": "Steigung 8 %, Zone 2" }
      ]
    }
  ]
}
```

`reps` ist ein Text, damit auch Angaben wie `"8-10"`, `"AMRAP"` oder `"30s"` möglich sind.
`notes` (max. 500 Zeichen) ist der persönliche Hinweis des Trainers an den Kunden. Apps zeigen ihn zusammen mit der Katalog-Erklärung (`GET /exercises`, Abgleich über den Übungsnamen, Groß-/Kleinschreibung egal).
Kraftübungen brauchen `sets` und `reps`, Ausdauerübungen `durationMin` oder `distanceKm`. Sonst kommt `422`.

### Workouts

| Methode | Pfad              | Wer | Beschreibung                                                          |
| ------- | ----------------- | --- | --------------------------------------------------------------------- |
| GET     | `/workouts`       | 👤  | Kunde: eigene Workouts. Trainer: `?clientId=`. Paging: `?limit=50&before=<ISO>` |
| POST    | `/workouts`       | 🙋  | Body `WorkoutInput` → `Workout` (inkl. berechnetem `volumeKg`)         |
| GET     | `/workouts/:id`   | 👤  | Eigenes Workout bzw. Workout eines eigenen Kunden                      |
| DELETE  | `/workouts/:id`   | 🙋  | 204                                                                   |

```jsonc
// WorkoutInput
{
  "title": "Unterkörper A",
  "planId": "…",                         // optional, muss dem Kunden zugewiesen sein
  "performedAt": "2026-11-09T18:00:00Z", // optional, Standard: jetzt
  "durationMin": 55,
  "notes": "Knie fühlte sich gut an",
  "exercises": [
    { "name": "Kniebeuge", "type": "strength", "sets": [{ "reps": 6, "weightKg": 85 }] },
    // Ausdauer: mind. durationMin oder distanceKm; weitere Werte optional
    { "name": "Laufband", "type": "cardio", "durationMin": 22, "distanceKm": 3.1,
      "inclinePct": 8, "avgHeartRate": 138, "calories": 240, "avgWatts": null, "level": null }
  ]
}
```

Die Antwort enthält berechnete Summen: `volumeKg` (Kraft, Wiederholungen × kg), `cardioMin` und `distanceKm` (Ausdauer).
`planId` ist optional. Ohne `planId` ist es ein freies Training, zum Beispiel nur Radfahren.

### Messungen

| Methode | Pfad                 | Wer | Beschreibung                                                |
| ------- | -------------------- | --- | ----------------------------------------------------------- |
| GET     | `/measurements`      | 👤  | Kunde: eigene Messungen. Trainer: `?clientId=`               |
| POST    | `/measurements`      | 🙋  | Body `{ measuredAt?, bodyWeightKg?, bodyFatPct?, waistCm?, notes? }` (mind. ein Wert) |
| DELETE  | `/measurements/:id`  | 🙋  | 204                                                          |

### Nachrichten (Coach ↔ Kunde, Realtime)

Pro Coach–Kunde-Paar gibt es eine Unterhaltung. `:partnerId` ist die ID des Gegenübers: Für Kunden ist das der Coach, für Trainer der jeweilige Kunde.

| Methode | Pfad                                        | Wer | Beschreibung                                                          |
| ------- | ------------------------------------------- | --- | --------------------------------------------------------------------- |
| GET     | `/conversations`                            | 👤  | `{ conversations: Conversation[], unreadTotal }`, neueste zuerst       |
| GET     | `/conversations/:partnerId/messages`        | 👤  | `{ messages: Message[] }`, älteste zuerst. Paging: `?limit=50&before=<createdAt der ältesten>` |
| POST    | `/conversations/:partnerId/messages`        | 👤  | Body `{ body }` (1–4000 Zeichen) → `Message`                          |
| POST    | `/conversations/:partnerId/read`            | 👤  | Markiert alle Nachrichten des Gegenübers als gelesen → `{ marked }`   |

```jsonc
// Message
{ "id": "…", "trainerId": "…", "clientId": "…", "senderId": "…", "body": "Hi!", "createdAt": "…", "readAt": null }
```

**Live-Empfang über Supabase Realtime.** Schreiben läuft immer über die API. Empfangen läuft über das Supabase-SDK mit dem eingeloggten Nutzer.
Die Datenbank liefert nur die eigenen Nachrichten aus (RLS-Policy auf `messages`).

```ts
const column = user.role === "trainer" ? "trainer_id" : "client_id";
supabase
  .channel(`messages:${user.id}`)
  .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `${column}=eq.${user.id}` }, (p) => {
    // p.eventType: "INSERT" (neue Nachricht) | "UPDATE" (read_at gesetzt → „Gelesen“)
    // p.new ist snake_case: { id, trainer_id, client_id, sender_id, body, created_at, read_at }
  })
  .subscribe();
```

Für Push-Benachrichtigungen bei geschlossener App ist noch ein Push-Dienst nötig (APNs/FCM). Das ist noch nicht eingebaut.

### Studios

Rollen: `trainer` · `client` · `studio` (Studio-Inhaber). Registrierung als Studio per `signUp` mit `options.data: { role: "studio", name, studio_name }`, als Trainer eines Studios zusätzlich mit `studio_code`.
`GET /me` liefert für alle Rollen `studio: { id, name, logoUrl } | null`. Kunden und Trainer sehen damit das Logo ihres Studios.

| Methode | Pfad | Wer | Beschreibung |
| ------- | ---- | --- | ------------ |
| GET | `/studio` | 🏢 | `StudioOverview`: Studio, Trainer (mit Kundenzahl), Kunden (inkl. „ohne Trainer“), Trainer-Einladungen |
| PATCH | `/studio` | 🏢 | Teil-Update: `{ name?, description?, street?, postalCode?, city?, phone?, email?, website?, instagram?, openingHours?, amenities? }`. Leere Texte leeren das Feld |
| GET | `/studio/profile` | 👤 | Studio-Seite für Inhaber, Trainer und Kunden des Studios: Infos, Adresse, Kontakt, Team (`trainers`, `staff`), `openingHours` (`[{ day: 0=Mo…6=So, closed, open: "HH:MM", close: "HH:MM" }]`), `amenities`, Team. Ohne Studio `404` |
| POST / DELETE | `/studio/logo` | 🏢 | Logo hochladen (`multipart/form-data`, Feld `file`) bzw. entfernen |
| POST | `/studio/invitations` | 🏢 | Body `{ email?, validDays? }` → Trainer-Einladung (Link: `/registrieren?rolle=trainer&studio=<CODE>`) |
| DELETE | `/studio/invitations/:code` | 🏢 | 204 |
| GET | `/studio-invitations/:code` | 🌐 | `{ code, valid, studioName }` |
| PUT | `/studio/clients/:clientId/trainer` | 🏢 | Body `{ trainerId }`: Kunden zuweisen bzw. übertragen. Zugewiesene Pläne werden für den neuen Trainer **kopiert** |
| POST | `/studio/trainers/:trainerId/transfer` | 🏢 | Body `{ toTrainerId }`: „Trainer fällt aus“, **alle** Kunden, Pläne und offenen Kunden-Einladungen übertragen → `{ transferred }` |
| DELETE | `/studio/trainers/:trainerId` | 🏢 | Trainer entfernen (nur ohne Kunden, sonst `409`). Das Konto bleibt bestehen |
| POST | `/studio/staff` | 🏢 | Weitere Mitarbeitende ohne Konto: `{ name, category: "management" \| "service" \| "other", position?, bio? }` (max. 50) |
| PATCH / DELETE | `/studio/staff/:id` | 🏢 | Bearbeiten (Teil-Update) bzw. entfernen |
| POST / DELETE | `/studio/staff/:id/photo` | 🏢 | Foto hochladen (`multipart/form-data`, Feld `file`) bzw. entfernen |
| POST | `/me/studio` | 🏋️ | Body `{ code }`: Trainer tritt einem Studio bei, seine Kunden kommen mit |

Max. 10 Trainer pro Studio. Studios sehen **keine** Trainingsdaten und keine Chats ihrer Kunden.
Löscht ein Studio-Trainer sein Konto, bleiben seine Kunden als „ohne Trainer“ im Studio.

### Feature-Wünsche

| Methode | Pfad                 | Wer | Beschreibung |
| ------- | -------------------- | --- | ------------ |
| POST    | `/feature-requests`  | 🏋️ 🏢 | Body `{ body, area?, importance?, context? }` → `{ id, createdAt }`, max. 20 pro Tag (sonst `429`) |

- `area`: `plans` · `clients` · `tracking` · `chat` · `billing` · `other`
- `importance`: `nice` · `important` · `essential`
- `context`: Herkunft im UI, z. B. `"Plan-Editor"`

Wünsche sind **nur für Admins sichtbar**. Es gibt bewusst keinen GET-Endpunkt. Bis zum Admin-Dashboard stehen sie in Supabase in der Tabelle `feature_requests`.

### Hinweise (Verbindung beendet)

| Methode | Pfad              | Wer | Beschreibung                                                                 |
| ------- | ----------------- | --- | ---------------------------------------------------------------------------- |
| GET     | `/notices`        | 👤  | `{ notices: Notice[] }`, offene Hinweise der letzten 30 Tage                   |
| DELETE  | `/notices/:id`    | 👤  | Hinweis wegklicken, 204                                                       |

```jsonc
// Notice – kind: client_deleted | client_left (an Trainer) · trainer_deleted | client_removed (an Kunden)
{ "id": "…", "kind": "client_deleted", "actorName": "Lena", "createdAt": "…" }
```

Kontolöschungen werden per Datenbank-Trigger erfasst, also auch bei Löschung im Supabase-Dashboard. Gespeichert wird nur der Name.
Ist eine Unterhaltung oder ein Kunde nicht mehr verfügbar, antwortet die API mit `404`. Apps sollten das als „nicht mehr verbunden“ anzeigen.

### Fehlerbehandlung in Apps

- `401`: Token ungültig, abgelaufen oder Konto gelöscht. Session erneuern bzw. neu einloggen.
- `503`: Datenbank oder Anmeldedienst kurzzeitig nicht erreichbar. **Nicht abmelden**, später erneut versuchen.
- Validierungsfehler (`422`) kommen mit deutschen Meldungen pro Feld in `details`.

### Progress-Objekt

```jsonc
{
  "totalWorkouts": 31,
  "workoutsLast7Days": 3,
  "workoutsLast30Days": 12,
  "currentStreakWeeks": 6,
  "lastWorkoutAt": "…",
  "weeklyVolume": [{ "weekStart": "2026-09-21", "volumeKg": 12450, "cardioMin": 95, "distanceKm": 14.2, "workouts": 3 }], // 8 Wochen, älteste zuerst
  "cardioLast30Days": { "sessions": 9, "minutes": 310, "distanceKm": 48.5 },
  "personalBests": [{ "exercise": "Kniebeuge", "weightKg": 92.5, "reps": 3, "achievedAt": "…" }],
  "cardioBests": [{ "exercise": "Laufband", "longestDistanceKm": 8.2, "longestDurationMin": 50, "achievedAt": "…" }],
  "latestMeasurement": { /* Measurement */ },
  "measurements": [ /* neueste zuerst */ ],
  "recentWorkouts": [ /* 10 neueste */ ]
}
```

Alle TypeScript-Typen stehen in [`lib/types.ts`](../lib/types.ts) und [`lib/schemas.ts`](../lib/schemas.ts). Für eine React-Native- oder Expo-App kannst du sie direkt übernehmen.

**Profilbilder:** `user`, `trainer`, Kunden (`ClientSummary`) und Chat-Partner haben ein Feld `avatarUrl` (öffentliche URL oder `null`).
Schneide Bilder in der App vor dem Upload am besten quadratisch auf 512×512 zu, so wie es das Web macht. Bei jedem Upload entsteht eine neue URL, das alte Bild wird gelöscht.

## Sicherheit

- Alle Tabellen haben Row Level Security. Mit dem Publishable Key ist kein direkter Datenbankzugriff möglich.
  Einzige Ausnahme ist `messages`: Teilnehmer dürfen ihre **eigenen** Nachrichten **lesen**. Das ist nötig für Realtime. Schreiben ist auch dort nur über die API möglich.
- Die API prüft Login (Supabase JWT), Rolle und Zuständigkeit, zum Beispiel ob ein Kunde zu diesem Trainer gehört. Erst danach greift sie mit dem Secret Key auf die Datenbank zu.

## Termine

Termine laufen immer über **Trainer**: Jeder Trainer pflegt eigene Angebote und Zeiten. Kunden fragen beim eigenen Coach an, Kunden eines Studios zusätzlich bei **jedem Trainer des Studios**. Da Doppelbuchungen nur pro Trainer geprüft werden, sind parallele Termine bei verschiedenen Trainern möglich. Studios sehen alle Termine ihrer Trainer, tragen Termine ein (sofort bestätigt, auch für Gäste ohne Konto) und sagen ab. Bestätigen/Ablehnen kann nur der Trainer.

Zeitfenster gelten in deutscher Ortszeit (Europe/Berlin), alle Zeitpunkte in der API sind ISO-Strings.

Kategorien: `personal_training`, `introduction` (Einführung/Geräteeinweisung), `nutrition` (Ernährungsberatung), `trial` (Probetraining), `body_check` (Körperanalyse), `consultation` (Beratungsgespräch), `other`.
Status: `requested` → `confirmed` | `declined` | `cancelled`. `cancelledBy`: `client`, `provider` (Trainer), `studio` oder `system` (Verbindung Kunde ↔ Coach/Studio bzw. Trainer ↔ Studio beendet). `createdBy`: `client` oder `studio`.

| Methode | Pfad | Wer | Beschreibung |
| --- | --- | --- | --- |
| GET | `/booking/settings` | Trainer | Eigene Angebote & Zeiten `{ enabled, services[], windows[], minNoticeHours, horizonDays }` |
| PUT | `/booking/settings` | Trainer | Komplett ersetzen. Angebote ohne `id` bekommen eine neue. Dauer 15–240 min in 15er-Schritten, max. 12 Angebote; Fenster `{ day: 0 (Mo)–6 (So), start, end }` ohne Überschneidung |
| GET | `/booking/providers` | Kunde | Buchbare Trainer `{ trainerId, name, avatarUrl, ownCoach, services[], horizonDays, nextFree }` – eigener Coach zuerst |
| GET | `/booking/slots?trainerId=…&serviceId=…` | Kunde | Freie Startzeiten je Tag `{ days: [{ date, slots: [iso] }] }` |
| GET | `/appointments` | alle | Kunde: eigene · Trainer: bei sich · Studio: bei allen eigenen Trainern. Kommende + letzte 30 Tage |
| POST | `/appointments` | Kunde | `{ trainerId, serviceId, startsAt, note? }` → 201. 409 wenn die Zeit nicht (mehr) frei ist, 429 ab 3 offenen Anfragen beim selben Trainer |
| PATCH | `/appointments/:id` | Kunde, Trainer, Studio | `{ action: "confirm" \| "decline" \| "cancel", message? }` – bestätigen/ablehnen nur der Trainer |
| GET | `/schedule?week=YYYY-MM-DD` | Trainer, Studio | Wochenkalender `{ weekStart, trainers: [{ id, name, avatarUrl, enabled, windows, services }], clients, appointments }` – Trainer: nur sich selbst, Studio: alle Trainer. `clients` = Kunden, für die eingetragen werden darf |
| POST | `/schedule` | Trainer, Studio | Termin direkt eintragen `{ trainerId (nur Studio), clientId \| guestName, category, title, durationMin, startsAt, note? }` → 201, sofort bestätigt. 409 bei Überschneidung |
| GET/POST | `/studio/appointments` | Studio | Wie `/schedule` (ältere Integrationen) |
| GET | `/appointments/:id/comments` | Beteiligte | Kommentare `[{ id, author: { id, name, role, avatarUrl }, body, createdAt, mine }]` |
| POST | `/appointments/:id/comments` | Beteiligte | `{ body }` (max. 1000 Zeichen) → 201. Andere Beteiligte (Kunde/Trainer) bekommen eine Benachrichtigung |
| DELETE | `/appointments/:id/comments/:commentId` | Autor | Eigenen Kommentar löschen |
| PUT | `/appointments/:id/contact` | Ersteller | Kontaktdaten am Termin `{ email?, phone? }` (leer/null = aus dem Kundenprofil). Nur wer den Termin eingetragen hat (Trainer bzw. Studio) |
| PUT | `/appointments/:id/note` | Trainer | Private Notiz `{ note }` – sehen weder Kunde noch Studio (`trainerNote` ist für sie immer `null`) |

„Beteiligte“ = Kunde, Trainer und das Studio des Trainers. Jeder Termin enthält `commentCount`. Trainer und Studio bekommen zusätzlich `contact: { email, phone, emailFromProfile, phoneFromProfile, overrideEmail, overridePhone }` (Kunden: `null`) und `canEditContact`. Am Termin hinterlegte Werte haben Vorrang vor dem Profil (E-Mail aus dem Konto, Telefon aus `PATCH /me { phone }`).

## Studio-Mitglieder

Kunden können einem Studio per wiederverwendbarem **Mitglieds-Code** beitreten (z. B. QR-Code an der Rezeption,
Link `/registrieren?rolle=kunde&mitglied=CODE`) – ohne festen Coach. Mitglieder buchen Kurse und 1:1-Termine bei
allen Trainern des Studios. `user.studioMember` zeigt die Mitgliedschaft an.

| Methode | Pfad | Wer | Beschreibung |
| --- | --- | --- | --- |
| GET | `/studio-join/:code` | öffentlich | `{ valid, studioName }` |
| POST | `/me/studio` | Kunde | `{ code }` Mitglieds-Code → Mitglied (Trainer: Studio-Einladungscode wie bisher). 400 bei ungültigem Code, bereits Mitglied oder Coach aus anderem Studio |
| DELETE | `/me/studio` | Kunde | Studio verlassen (Coach aus diesem Studio wird ebenfalls getrennt) |
| DELETE | `/studio/clients/:clientId` | Studio | Kunde/Mitglied aus dem Studio entfernen → 204. Coach aus dem Studio wird getrennt, künftige Kurs-/Terminbuchungen storniert |
| POST | `/studio/join-code` | Studio | Neuen Mitglieds-Code erzeugen → `{ joinCode }` |

Registrierung: Metadatum `studio_join_code` (zusätzlich zu `invite_code`). `GET /studio` liefert `studio.joinCode` und je Kunde `studioMember`.

## Kurse

Studios legen Kurse an; Kunden des Studios melden sich für einzelne Termine an (`startsAt` = Beginn des Termins, ISO).
Termine werden aus `schedule` (`[{ day: 0 (Mo)–6 (So), start: "HH:MM" }]`, Ortszeit Europe/Berlin) und dem optionalen
Zeitraum `startsOn`/`endsOn` berechnet; buchbar sind die nächsten 4 Wochen. Das Kontingent (`capacity`) gilt pro Termin.

| Methode | Pfad | Wer | Beschreibung |
| --- | --- | --- | --- |
| GET | `/courses` | alle im Studio | Aktive Kurse des eigenen Studios inkl. `sessions: [{ startsAt, endsAt, booked, capacity, bookedByMe }]` |
| POST | `/courses/:id/bookings` | Kunde | `{ startsAt }` → 201 (Kurs inkl. Termine). 409 bei ausgebucht / bereits angemeldet / Termin existiert nicht |
| DELETE | `/courses/:id/bookings?startsAt=…` | Kunde | Abmelden (vor Beginn) |
| GET | `/courses/:id/participants?startsAt=…` | Studio, Kurstrainer | Teilnehmende eines Termins |
| GET | `/me/course-bookings` | Kunde | Eigene kommende Anmeldungen |
| GET | `/studio/courses` | Studio | Alle Kurse inkl. pausierter |
| POST | `/studio/courses` | Studio | `{ title, category?, description?, location?, trainerId?, capacity, durationMin, schedule, startsOn?, endsOn?, active }` → 201 |
| PUT | `/studio/courses/:id` | Studio | Kurs ersetzen. Anmeldungen auf Terminen, die danach nicht mehr existieren, werden storniert (mit Hinweis) |
| DELETE | `/studio/courses/:id` | Studio | Löschen; künftige Anmeldungen werden storniert (mit Hinweis) |
| POST/DELETE | `/studio/courses/:id/image` | Studio | Titelbild (multipart, Feld `file`, max. 5 MB) |

`/schedule` enthält zusätzlich `courseSessions` (Studio: alle aktiven Kurse, Trainer: eigene) mit Belegung.

## Benachrichtigungen

Terminanfragen, Bestätigungen, Absagen und beendete Verbindungen erscheinen als Benachrichtigung (`/notices`, 30 Tage sichtbar). Termin-Arten `appointment_requested|confirmed|declined|cancelled|booked|comment`, Kurs-Arten `course_assigned|course_cancelled` enthalten in `detail` z. B. „Personal Training · Di., 18. Nov., 17:00 Uhr“. `readAt: null` = ungelesen (Zähler an der Glocke).

| Methode | Pfad | Beschreibung |
| --- | --- | --- |
| GET | `/notices` | Offene Benachrichtigungen inkl. `readAt` |
| POST | `/notices/read` | Alle als gelesen markieren → `{ updated }` |
| DELETE | `/notices/:id` | Benachrichtigung entfernen |
