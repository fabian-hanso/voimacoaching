"use client";

import { WEEKDAYS } from "@/components/dashboard/studio-page/opening-hours";
import { Icon } from "@/components/icons";
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  LoadError,
  Spinner,
  Textarea,
} from "@/components/ui";
import { api, useApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import type { OpeningHoursDay, StudioProfile } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

const AMENITY_SUGGESTIONS = [
  "Freihantelbereich",
  "Cardio-Bereich",
  "Kursraum",
  "Sauna",
  "Duschen",
  "Umkleiden",
  "Parkplätze",
  "Getränkebar",
  "WLAN",
  "Barrierefrei",
  "Kinderbetreuung",
  "24/7-Zugang",
];

const DEFAULT_HOURS: OpeningHoursDay[] = WEEKDAYS.map((_, day) => ({
  day,
  closed: false,
  open: day < 5 ? "06:00" : "09:00",
  close: day < 5 ? "22:00" : "18:00",
}));

export function StudioDetailsForm({ onSaved }: { onSaved: () => void }) {
  const profile = useApi<StudioProfile>("/studio/profile");
  if (profile.loading) return <Spinner />;
  if (!profile.data)
    return (
      <LoadError
        message={
          profile.error?.message ?? "Infos konnten nicht geladen werden."
        }
        onRetry={profile.reload}
      />
    );
  return (
    <DetailsEditor
      key={profile.data.id}
      initial={profile.data}
      onSaved={() => {
        profile.reload();
        onSaved();
      }}
    />
  );
}

function DetailsEditor({
  initial,
  onSaved,
}: {
  initial: StudioProfile;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    description: initial.description ?? "",
    street: initial.address.street ?? "",
    postalCode: initial.address.postalCode ?? "",
    city: initial.address.city ?? "",
    phone: initial.contact.phone ?? "",
    email: initial.contact.email ?? "",
    website: initial.contact.website ?? "",
    instagram: initial.contact.instagram ?? "",
  });
  const [hours, setHours] = useState<OpeningHoursDay[]>(
    initial.openingHours.length ? initial.openingHours : DEFAULT_HOURS,
  );
  const [hoursEnabled, setHoursEnabled] = useState(
    initial.openingHours.length > 0,
  );
  const [amenities, setAmenities] = useState<string[]>(initial.amenities);
  const [newAmenity, setNewAmenity] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const set =
    (key: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF((prev) => ({ ...prev, [key]: e.target.value }));
  const setDay = (day: number, patch: Partial<OpeningHoursDay>) =>
    setHours((prev) =>
      WEEKDAYS.map((_, d) => ({
        ...(prev.find((h) => h.day === d) ?? DEFAULT_HOURS[d]),
        ...(d === day ? patch : {}),
      })),
    );
  const addAmenity = (a: string) => {
    const v = a.trim();
    if (v && !amenities.includes(v) && amenities.length < 20)
      setAmenities([...amenities, v]);
    setNewAmenity("");
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    try {
      await api("/studio", {
        method: "PATCH",
        body: {
          ...f,
          website:
            f.website && !/^https?:\/\//i.test(f.website)
              ? `https://${f.website}`
              : f.website,
          openingHours: hoursEnabled ? hours : [],
          amenities,
        },
      });
      setMsg({
        tone: "success",
        text: "Studio-Infos gespeichert. Deine Trainer und Kunden sehen sie ab sofort.",
      });
      onSaved();
    } catch (err) {
      setMsg({
        tone: "error",
        text: errorMessage(err, "Speichern fehlgeschlagen."),
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-fg">Studio-Infos</h3>
          <p className="text-sm text-fg-muted">
            Sichtbar für deine Trainer und deren Kunden auf der Studio-Seite.
          </p>
        </div>
        <Link
          href="/dashboard/studio"
          className="text-sm font-semibold text-brand-ink hover:underline"
        >
          Studio-Seite ansehen →
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h4 className="font-semibold text-fg">Über das Studio</h4>
          <Textarea
            value={f.description}
            onChange={set("description")}
            rows={6}
            maxLength={1000}
            placeholder="Was macht euer Studio aus? z. B. Schwerpunkte, Atmosphäre, Kurse …"
            className="mt-3"
          />
          <p className="mt-1 text-right text-xs text-fg-subtle tabular-nums">
            {f.description.length}/1000
          </p>
        </Card>

        <Card>
          <h4 className="font-semibold text-fg">Adresse & Kontakt</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_7rem_1fr]">
            <Field label="Straße & Nr.">
              <Input
                value={f.street}
                onChange={set("street")}
                autoComplete="street-address"
                maxLength={120}
              />
            </Field>
            <Field label="PLZ">
              <Input
                value={f.postalCode}
                onChange={set("postalCode")}
                autoComplete="postal-code"
                maxLength={12}
                inputMode="numeric"
              />
            </Field>
            <Field label="Ort">
              <Input
                value={f.city}
                onChange={set("city")}
                autoComplete="address-level2"
                maxLength={80}
              />
            </Field>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Telefon">
              <Input
                value={f.phone}
                onChange={set("phone")}
                type="tel"
                placeholder="+49 …"
                maxLength={40}
              />
            </Field>
            <Field label="E-Mail">
              <Input
                value={f.email}
                onChange={set("email")}
                type="email"
                maxLength={254}
              />
            </Field>
            <Field label="Website">
              <Input
                value={f.website}
                onChange={set("website")}
                placeholder="https://…"
                maxLength={300}
              />
            </Field>
            <Field label="Instagram">
              <Input
                value={f.instagram}
                onChange={set("instagram")}
                placeholder="@deinstudio"
                maxLength={31}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold text-fg">Öffnungszeiten</h4>
            <label className="flex items-center gap-2 text-sm text-fg-muted">
              <input
                type="checkbox"
                checked={hoursEnabled}
                onChange={(e) => setHoursEnabled(e.target.checked)}
                className="size-4 accent-[var(--color-brand-ink)]"
              />
              anzeigen
            </label>
          </div>
          {hoursEnabled ? (
            <div className="mt-3 space-y-2">
              {WEEKDAYS.map((name, day) => {
                const h =
                  hours.find((x) => x.day === day) ?? DEFAULT_HOURS[day];
                return (
                  <div
                    key={day}
                    className="grid grid-cols-[6.5rem_1fr] items-center gap-2 sm:grid-cols-[6.5rem_1fr_auto]"
                  >
                    <span className="text-sm font-medium text-fg">{name}</span>
                    {h.closed ? (
                      <span className="text-sm text-fg-subtle">
                        geschlossen
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={h.open}
                          onChange={(e) =>
                            setDay(day, { open: e.target.value })
                          }
                          aria-label={`${name} von`}
                          className="w-28"
                        />
                        <span className="text-fg-subtle">–</span>
                        <Input
                          type="time"
                          value={h.close}
                          onChange={(e) =>
                            setDay(day, { close: e.target.value })
                          }
                          aria-label={`${name} bis`}
                          className="w-28"
                        />
                      </span>
                    )}
                    <label className="col-start-2 flex items-center gap-1.5 text-xs text-fg-muted sm:col-start-auto">
                      <input
                        type="checkbox"
                        checked={h.closed}
                        onChange={(e) =>
                          setDay(day, { closed: e.target.checked })
                        }
                        className="size-4 accent-[var(--color-brand-ink)]"
                      />
                      geschlossen
                    </label>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  const mo = hours.find((x) => x.day === 0) ?? DEFAULT_HOURS[0];
                  setHours((prev) =>
                    prev.map((h) => (h.day <= 4 ? { ...mo, day: h.day } : h)),
                  );
                }}
                className="text-xs font-semibold text-brand-ink hover:underline"
              >
                Montag für Mo–Fr übernehmen
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-fg-muted">
              Öffnungszeiten werden auf der Studio-Seite nicht angezeigt.
            </p>
          )}
        </Card>

        <Card>
          <h4 className="font-semibold text-fg">Ausstattung</h4>
          <ul className="mt-3 flex flex-wrap gap-2">
            {amenities.map((a) => (
              <li
                key={a}
                className="flex items-center gap-1 rounded-full bg-brand/30 py-1 pr-1 pl-3 text-sm font-medium text-brand-ink"
              >
                {a}
                <button
                  type="button"
                  aria-label={`${a} entfernen`}
                  onClick={() => setAmenities(amenities.filter((x) => x !== a))}
                  className="grid size-5 place-items-center rounded-full hover:bg-brand-ink/15"
                >
                  <Icon name="x" className="size-3" />
                </button>
              </li>
            ))}
            {!amenities.length && (
              <li className="text-sm text-fg-subtle">
                Noch nichts eingetragen.
              </li>
            )}
          </ul>
          <div className="mt-3 flex gap-2">
            <Input
              value={newAmenity}
              onChange={(e) => setNewAmenity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAmenity(newAmenity);
                }
              }}
              placeholder="Eigene hinzufügen …"
              maxLength={40}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => addAmenity(newAmenity)}
              disabled={!newAmenity.trim()}
            >
              Hinzufügen
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {AMENITY_SUGGESTIONS.filter((a) => !amenities.includes(a)).map(
              (a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => addAmenity(a)}
                  className="rounded-full px-2.5 py-1 text-xs font-medium text-fg-muted ring-1 ring-line-strong transition hover:bg-surface-3 hover:text-fg"
                >
                  + {a}
                </button>
              ),
            )}
          </div>
        </Card>
      </div>

      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Speichern …" : "Studio-Infos speichern"}
        </Button>
      </div>
    </form>
  );
}
