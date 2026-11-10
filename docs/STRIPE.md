# Stripe einrichten

Voima Coach rechnet Trainer- und Studio-Abos über Stripe ab. Kunden zahlen nie.

- **Testphase:** 7 Tage ab Registrierung, ohne Zahlungsdaten. Läuft in der App, nicht in Stripe.
- **Abschluss:** gehostete Stripe-Bezahlseite (Checkout). Eine laufende Testphase bleibt dabei kostenlos.
- **Verwalten:** Stripe-Kundenportal (Paket wechseln, kündigen zum Periodenende, Zahlungsart, Rechnungen).
- **Abgleich:** Stripe meldet jede Änderung per Webhook. Die App spiegelt den Stand in der Tabelle `subscriptions`.
- **Steuer:** Kleinunternehmer nach § 19 UStG. Keine Umsatzsteuer, Hinweis steht automatisch auf jeder Rechnung.

Preise und Pakete stehen an einer Stelle: [`lib/billing-plans.ts`](../lib/billing-plans.ts).

---

## 1. Konto und Test-Keys

1. Konto unter [dashboard.stripe.com](https://dashboard.stripe.com) anlegen und den **Testmodus** einschalten.
2. **Entwickler → API-Schlüssel:** den geheimen Schlüssel (`sk_test_…`) kopieren.
3. In `.env.local` eintragen (nie committen, nie im Chat teilen):

   ```bash
   STRIPE_SECRET_KEY=sk_test_…
   ```

## 2. Produkte, Preise und Kundenportal anlegen

```bash
npm run stripe:setup
```

Das Skript ist idempotent und kann jederzeit erneut laufen. Es legt an:

- je Paket ein Produkt mit Monats- und Jahrespreis. Die API findet die Preise über Lookup-Keys
  (`voima_trainer_10_month`, …), Preis-IDs müssen also nirgends eingetragen werden.
- zwei Kundenportal-Konfigurationen:
  - **Trainer:** dürfen zwischen den drei Trainer-Paketen wechseln.
  - **Studios:** können kündigen, aber nicht auf ein Trainer-Paket wechseln.

Ändert sich ein Preis in `lib/billing-plans.ts`, das Skript erneut ausführen. Es legt einen neuen Preis an und übernimmt den
Lookup-Key. Bestehende Abos behalten ihren alten Preis.

## 3. Webhook

### Lokal (Entwicklung)

Mit der [Stripe CLI](https://docs.stripe.com/stripe-cli):

```bash
stripe login
stripe listen --forward-to localhost:3000/api/v1/billing/webhook \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,customer.subscription.paused,customer.subscription.resumed
```

Port an den Dev-Server anpassen. Neuere CLI-Versionen verlangen die Event-Liste (`--events`).

Das angezeigte `whsec_…` als `STRIPE_WEBHOOK_SECRET` in `.env.local` eintragen und den Dev-Server neu starten.

### Produktion

**Entwickler → Webhooks → Endpunkt hinzufügen:**

- URL: `https://<deine-domain>/api/v1/billing/webhook`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.paused`
  - `customer.subscription.resumed`
- Das Signing-Secret als `STRIPE_WEBHOOK_SECRET` beim Hosting eintragen.

## 4. Rechnungen (Kleinunternehmer)

- **Einstellungen → Unternehmensdaten:** Name, Adresse und Kontakt-E-Mail eintragen (stehen auf jeder Rechnung).
- **Einstellungen → Rechnungen:** E-Mail-Versand von Rechnungen und Belegen einschalten.
- Den Hinweis „Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.“ setzt die App automatisch als Rechnungsfußzeile
  bei jedem neuen Stripe-Kunden.
- **Stripe Tax nicht aktivieren**, solange die Kleinunternehmerregelung gilt.

## 5. Testen

1. Als Trainer anmelden, **Profilmenü → Abo & Rechnungen** öffnen, ein Paket wählen.
2. Auf der Stripe-Seite mit der Testkarte `4242 4242 4242 4242`, einem beliebigen künftigen Datum und beliebiger Prüfziffer bezahlen.
3. Zurück in der App wird das Abo aktiviert, sobald der Webhook ankommt (die Seite lädt den Status einige Sekunden lang nach).
4. **Abo verwalten** öffnet das Kundenportal: Paket wechseln, kündigen, Rechnungen ansehen.

Weitere Testkarten (abgelehnt, 3-D-Secure …): [docs.stripe.com/testing](https://docs.stripe.com/testing).

## 6. Live schalten

1. In Stripe den Live-Modus aktivieren (Konto verifizieren, Bankkonto hinterlegen).
2. `npm run stripe:setup` mit dem **Live**-Key ausführen. Das Skript zeigt an, ob es im Test- oder Live-Modus läuft.
3. Webhook-Endpunkt im Live-Modus anlegen (siehe 3.), dann `STRIPE_SECRET_KEY=sk_live_…` und das Live-`STRIPE_WEBHOOK_SECRET`
   beim Hosting setzen.

## Verhalten in der App

| Situation | Trainer / Studio | Kunden |
| --- | --- | --- |
| Testphase läuft | alles nutzbar, Hinweisleiste „noch X Tage“ | normal |
| Abo aktiv | alles nutzbar | normal |
| Zahlung fehlgeschlagen (`past_due`) | weiter nutzbar, Warnleiste „Zahlungsart aktualisieren“ | normal |
| Testphase vorbei / Abo beendet | Dashboard gesperrt. Erreichbar sind nur noch Abo-Seite, Einstellungen (inkl. Konto löschen) und Abmelden. API antwortet mit `402` | normal, trainieren weiter |
| Kundenlimit erreicht (10 bzw. 20) | keine neuen Einladungen, Codes lassen sich nicht mehr einlösen | bestehende bleiben verbunden |
| Trainer im Studio | abgedeckt durch das Studio-Abo. Ist das abgelaufen, gesperrt mit Hinweis aufs Studio | normal |
