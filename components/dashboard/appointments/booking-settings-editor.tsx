"use client";

import { Icon } from "@/components/icons";
import { Alert, Button, Card, cx, Field, Input, Select } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { bookingSettingsSchema } from "@/lib/schemas";
import type {
  AppointmentCategory,
  BookingService,
  BookingSettings,
  BookingWindow,
} from "@/lib/types";
import { useState } from "react";
import { CATEGORIES, durationLabel, DURATIONS, toMin, WEEKDAYS } from "./utils";

/* ---------------------------- Einstellungen ---------------------------- */

type DraftService = Omit<BookingService, "id"> & { id?: string; key: string };

let draftKey = 0;

const newKey = () => `k${++draftKey}`;

const plus2h = (t: string) => {
  const m = Math.min(toMin(t) + 120, 23 * 60 + 45);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

export function BookingSettingsEditor({
  initial,
  onSaved,
}: {
  initial: BookingSettings;
  onSaved: () => void;
}) {
  const [enabled, setEnabled] = useState(
    initial.enabled || (!initial.services.length && !initial.windows.length),
  );
  const [services, setServices] = useState<DraftService[]>(() =>
    initial.services.length
      ? initial.services.map((s) => ({ ...s, key: newKey() }))
      : [
          {
            key: newKey(),
            category: "personal_training",
            title: "Personal Training",
            durationMin: 60,
            description: null,
          },
        ],
  );
  const [windows, setWindows] = useState<BookingWindow[]>(initial.windows);
  const [minNoticeHours, setMinNotice] = useState(initial.minNoticeHours);
  const [horizonDays, setHorizon] = useState(initial.horizonDays);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateService = (key: string, patch: Partial<DraftService>) =>
    setServices((list) =>
      list.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    );
  const dayWindows = (day: number) =>
    windows.map((w, i) => ({ w, i })).filter(({ w }) => w.day === day);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const body = {
      enabled,
      services: services.map((s) => ({
        id: s.id,
        category: s.category,
        title: s.title,
        durationMin: s.durationMin,
        description: s.description || null,
      })),
      windows,
      minNoticeHours,
      horizonDays,
    };
    const parsed = bookingSettingsSchema.safeParse(body);
    if (!parsed.success)
      return setError(
        parsed.error.issues[0]?.message ?? "Bitte prüfe deine Eingaben.",
      );
    if (enabled && !services.length)
      return setError("Lege mindestens ein Angebot an.");
    if (enabled && !windows.length)
      return setError("Lege mindestens ein Zeitfenster an.");
    setPending(true);
    try {
      await api("/booking/settings", { method: "PUT", body });
      onSaved();
    } catch (err) {
      setError(errorMessage(err, "Speichern fehlgeschlagen."));
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Card className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-fg">Terminanfragen annehmen</p>
          <p className="mt-0.5 text-sm text-fg-muted">
            Deine Kunden – und, wenn du zu einem Studio gehörst, auch dessen
            Kunden – können in deinen Zeiten anfragen. Du bestätigst jede
            Anfrage.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Terminanfragen annehmen"
          onClick={() => setEnabled((v) => !v)}
          className={cx(
            "relative h-7 w-12 shrink-0 rounded-full transition",
            enabled ? "bg-brand-ink" : "bg-line-strong",
          )}
        >
          <span
            className={cx(
              "absolute top-1 size-5 rounded-full bg-white shadow transition-all",
              enabled ? "left-6" : "left-1",
            )}
          />
        </button>
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-fg">Angebote</h3>
            <p className="mt-0.5 text-sm text-fg-muted">
              Was Kunden bei dir anfragen können.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={services.length >= 12}
            onClick={() =>
              setServices((l) => [
                ...l,
                {
                  key: newKey(),
                  category: "other",
                  title: "",
                  durationMin: 30,
                  description: null,
                },
              ])
            }
          >
            <Icon name="plus" className="size-3.5" /> Angebot
          </Button>
        </div>
        {services.length === 0 ? (
          <p className="mt-4 text-sm text-fg-muted">Noch keine Angebote.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {services.map((s) => (
              <li
                key={s.key}
                className="grid gap-3 rounded-tile bg-surface-2 p-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_7rem_auto] sm:items-end"
              >
                <Field label="Kategorie">
                  <Select
                    value={s.category}
                    onChange={(e) => {
                      const category = e.target.value as AppointmentCategory;
                      const wasDefault =
                        !s.title || s.title === CATEGORIES[s.category].label;
                      updateService(s.key, {
                        category,
                        ...(wasDefault
                          ? {
                              title: CATEGORIES[category].label,
                              durationMin: CATEGORIES[category].duration,
                            }
                          : {}),
                      });
                    }}
                  >
                    {Object.entries(CATEGORIES).map(([value, c]) => (
                      <option key={value} value={value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Titel">
                  <Input
                    value={s.title}
                    maxLength={80}
                    required
                    onChange={(e) =>
                      updateService(s.key, { title: e.target.value })
                    }
                  />
                </Field>
                <Field label="Dauer">
                  <Select
                    value={s.durationMin}
                    onChange={(e) =>
                      updateService(s.key, {
                        durationMin: Number(e.target.value),
                      })
                    }
                  >
                    {DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {durationLabel(d)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`${s.title || "Angebot"} entfernen`}
                  onClick={() =>
                    setServices((l) => l.filter((x) => x.key !== s.key))
                  }
                  className="justify-self-end"
                >
                  <Icon name="x" className="size-4" />
                </Button>
                <div className="sm:col-span-4">
                  <Input
                    value={s.description ?? ""}
                    maxLength={300}
                    placeholder="Kurzbeschreibung (optional), z. B. „inkl. Trainingsplan-Anpassung“"
                    onChange={(e) =>
                      updateService(s.key, { description: e.target.value })
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold text-fg">Deine Verfügbarkeit</h3>
        <p className="mt-0.5 text-sm text-fg-muted">
          Wöchentlich wiederkehrend. Bereits vergebene Zeiten werden automatisch
          ausgeblendet.
        </p>
        <ul className="mt-4 divide-y divide-line">
          {WEEKDAYS.map((name, day) => {
            const list = dayWindows(day);
            return (
              <li
                key={day}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start"
              >
                <span
                  className={cx(
                    "w-28 shrink-0 pt-2 text-sm font-medium",
                    list.length ? "text-fg" : "text-fg-subtle",
                  )}
                >
                  {name}
                </span>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {list.map(({ w, i }) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-control bg-surface-2 p-1 ring-1 ring-line"
                    >
                      <Input
                        type="time"
                        step={900}
                        value={w.start}
                        aria-label={`${name} von`}
                        onChange={(e) =>
                          setWindows((ws) =>
                            ws.map((x, j) =>
                              j === i ? { ...x, start: e.target.value } : x,
                            ),
                          )
                        }
                        className="w-28 bg-surface py-1"
                      />
                      <span className="text-fg-subtle">–</span>
                      <Input
                        type="time"
                        step={900}
                        value={w.end}
                        aria-label={`${name} bis`}
                        onChange={(e) =>
                          setWindows((ws) =>
                            ws.map((x, j) =>
                              j === i ? { ...x, end: e.target.value } : x,
                            ),
                          )
                        }
                        className="w-28 bg-surface py-1"
                      />
                      <button
                        type="button"
                        aria-label="Zeitfenster entfernen"
                        onClick={() =>
                          setWindows((ws) => ws.filter((_, j) => j !== i))
                        }
                        className="grid size-7 place-items-center rounded-inner text-fg-subtle hover:bg-surface-3 hover:text-fg"
                      >
                        <Icon name="x" className="size-3.5" />
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      // Neues Fenster direkt nach dem letzten (2 Stunden), sonst 9–17 Uhr
                      const last = list.at(-1)?.w;
                      setWindows((ws) => [
                        ...ws,
                        last
                          ? { day, start: last.end, end: plus2h(last.end) }
                          : { day, start: "09:00", end: "17:00" },
                      ]);
                    }}
                    className="inline-flex items-center gap-1 rounded-control px-2 py-2 text-sm font-semibold text-brand-ink hover:bg-surface-2"
                  >
                    <Icon name="plus" className="size-3.5" />{" "}
                    {list.length ? "Weiteres" : "Zeitfenster"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Mindestvorlauf"
            hint="So kurzfristig dürfen Kunden höchstens anfragen."
          >
            <Select
              value={minNoticeHours}
              onChange={(e) => setMinNotice(Number(e.target.value))}
            >
              {[0, 2, 6, 12, 24, 48, 72, 168].map((h) => (
                <option key={h} value={h}>
                  {h === 0
                    ? "Kein Vorlauf"
                    : h < 24
                      ? `${h} Stunden`
                      : h === 168
                        ? "1 Woche"
                        : `${h / 24} ${h === 24 ? "Tag" : "Tage"}`}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Buchbar im Voraus"
            hint="So weit in der Zukunft können Kunden anfragen."
          >
            <Select
              value={horizonDays}
              onChange={(e) => setHorizon(Number(e.target.value))}
            >
              {[7, 14, 28, 42, 56, 90].map((d) => (
                <option key={d} value={d}>
                  {d % 7 === 0
                    ? `${d / 7} ${d === 7 ? "Woche" : "Wochen"}`
                    : `${d} Tage`}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {error && <Alert>{error}</Alert>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Wird gespeichert …" : "Speichern"}
        </Button>
      </div>
    </form>
  );
}
