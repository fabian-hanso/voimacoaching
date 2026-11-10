"use client";

import { useEffect, useState, type ReactNode } from "react";
import { api, ApiClientError, useApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { Alert, Avatar, Badge, Button, Card, cx, EmptyState, Field, Input, LoadError, Select, Spinner, Textarea, type BadgeTone } from "@/components/ui";
import { Icon, IconTile, type IconName } from "@/components/icons";
import { bookingSettingsSchema } from "@/lib/schemas";
import { Modal, ModalHeader } from "./modal";
import { CourseSessionModal } from "./courses";
import type {
  Appointment,
  AppointmentCategory,
  AppointmentStatus,
  BookingProvider,
  BookingService,
  BookingSettings,
  BookingSlotDay,
  BookingWindow,
  AppointmentComment,
  Schedule,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Gemeinsames                                                         */
/* ------------------------------------------------------------------ */

export const CATEGORIES: Record<AppointmentCategory, { label: string; icon: IconName; duration: number }> = {
  personal_training: { label: "Personal Training", icon: "dumbbell", duration: 60 },
  introduction: { label: "Einführung / Geräteeinweisung", icon: "sparkles", duration: 45 },
  nutrition: { label: "Ernährungsberatung", icon: "heart", duration: 45 },
  trial: { label: "Probetraining", icon: "star", duration: 60 },
  body_check: { label: "Körperanalyse", icon: "scale", duration: 30 },
  consultation: { label: "Beratungsgespräch", icon: "chat", duration: 30 },
  other: { label: "Sonstiges", icon: "calendar", duration: 30 },
};

const STATUS: Record<AppointmentStatus, { label: string; tone: BadgeTone }> = {
  requested: { label: "Angefragt", tone: "accent" },
  confirmed: { label: "Bestätigt", tone: "brand" },
  declined: { label: "Abgelehnt", tone: "neutral" },
  cancelled: { label: "Abgesagt", tone: "neutral" },
};

const WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const DURATIONS = [15, 30, 45, 60, 75, 90, 120, 150, 180, 240];

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("de-DE", opts).format(new Date(iso));
const time = (iso: string) => fmt(iso, { hour: "2-digit", minute: "2-digit" });
const longDate = (iso: string) => fmt(iso, { weekday: "long", day: "numeric", month: "long" });
const durationLabel = (min: number) => (min < 60 ? `${min} min` : min % 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min / 60} h`);
/** Lokales Datum als YYYY-MM-DD */
const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localDate(d);
};
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const partyName = (a: Appointment) => a.client?.name ?? a.guestName ?? "Gast";

/** Aktuelle Zeit, minütlich aktualisiert (Render bleibt rein). */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function split(appointments: Appointment[], now: number) {
  const upcoming = appointments.filter((a) => (a.status === "requested" || a.status === "confirmed") && Date.parse(a.endsAt) > now);
  const rest = appointments.filter((a) => !upcoming.includes(a)).sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  return { upcoming, rest };
}

/** Offene Anfragen (für den Zähler am Tab). */
export const openRequests = (list: Appointment[] | undefined, now = 0) =>
  (list ?? []).filter((a) => a.status === "requested" && Date.parse(a.endsAt) > now).length;

/** Rückfrage mit optionaler Nachricht (Ablehnen / Absagen). */
function ReasonDialog({
  title,
  description,
  confirmLabel,
  placeholder,
  onSubmit,
  onClose,
}: {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  placeholder: string;
  onSubmit: (message: string) => Promise<void>;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal label={title} onClose={onClose} busy={pending}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError(null);
          try {
            await onSubmit(message.trim());
          } catch (err) {
            setError(errorMessage(err));
            setPending(false);
          }
        }}
      >
        <h2 className="text-lg font-bold text-fg">{title}</h2>
        <div className="text-sm text-fg-muted">{description}</div>
        {error && <Alert>{error}</Alert>}
        <Field label="Nachricht (optional)">
          <Textarea rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={placeholder} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Zurück
          </Button>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Wird gesendet …" : confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const cancelAppointment = (a: Appointment, message: string) =>
  api(`/appointments/${a.id}`, { method: "PATCH", body: { action: "cancel", message: message || undefined } });

function DateBlock({ iso, muted }: { iso: string; muted?: boolean }) {
  return (
    <div className={cx("grid w-14 shrink-0 place-items-center rounded-xl py-2 text-center", muted ? "bg-surface-3 text-fg-muted" : "bg-brand text-brand-fg")}>
      <span className="text-[11px] font-semibold uppercase">{fmt(iso, { weekday: "short" }).replace(".", "")}</span>
      <span className="text-xl leading-6 font-extrabold">{fmt(iso, { day: "numeric" })}</span>
      <span className="text-[11px] font-medium">{fmt(iso, { month: "short" }).replace(".", "")}</span>
    </div>
  );
}

function AppointmentRow({
  a,
  perspective,
  actions,
  now,
  onOpen,
}: {
  a: Appointment;
  perspective: "client" | "trainer";
  actions?: ReactNode;
  now: number;
  onOpen?: () => void;
}) {
  const past = Date.parse(a.endsAt) <= now;
  const inactive = past || a.status === "declined" || a.status === "cancelled";
  const person = perspective === "client" ? { name: a.trainer.name, src: a.trainer.avatarUrl } : { name: partyName(a), src: a.client?.avatarUrl ?? null };
  const answerFrom = { client: "Deine Nachricht", provider: perspective === "client" ? `Antwort von ${a.trainer.name}` : "Deine Antwort", studio: "Studio", system: "Hinweis" };
  return (
    <li className="flex flex-col gap-4 rounded-2xl bg-surface p-4 ring-1 ring-line sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <DateBlock iso={a.startsAt} muted={inactive} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cx("font-semibold", inactive ? "text-fg-muted" : "text-fg")}>{a.title}</p>
            <Badge tone={STATUS[a.status].tone}>{past && a.status === "confirmed" ? "Stattgefunden" : STATUS[a.status].label}</Badge>
            {a.createdBy === "studio" && <Badge>Vom Studio eingetragen</Badge>}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <Icon name="clock" className="size-3.5" /> {time(a.startsAt)} – {time(a.endsAt)} Uhr
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Avatar name={person.name} src={person.src} className="size-5 text-[9px] ring-1" />
              <span className="truncate">
                {person.name}
                {perspective === "trainer" && !a.client && " (Gast)"}
              </span>
            </span>
          </p>
          {a.clientNote && (
            <p className="mt-2 text-sm text-fg-muted">
              <span className="font-medium text-fg">{perspective === "client" && a.createdBy === "client" ? "Deine Nachricht" : "Notiz"}:</span> {a.clientNote}
            </p>
          )}
          {a.responseNote && (
            <p className="mt-1 text-sm text-fg-muted">
              <span className="font-medium text-fg">{a.cancelledBy ? answerFrom[a.cancelledBy] : answerFrom.provider}:</span> {a.responseNote}
            </p>
          )}
        </div>
      </div>
      {(onOpen || (actions && !past)) && (
        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
          {!past && actions}
          {onOpen && (
            <Button size="sm" variant="ghost" onClick={onOpen}>
              <Icon name="chat" className="size-3.5" /> {a.commentCount ? `Kommentare (${a.commentCount})` : "Details"}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

function History({ items, perspective, now, onOpen }: { items: Appointment[]; perspective: "client" | "trainer"; now: number; onOpen?: (a: Appointment) => void }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-fg-muted hover:text-fg">
        <Icon name="chevronLeft" className="size-4 -rotate-90 transition group-open:rotate-90" />
        Frühere, abgelehnte & abgesagte Termine ({items.length})
      </summary>
      <ul className="mt-3 space-y-3">
        {items.map((a) => (
          <AppointmentRow key={a.id} a={a} perspective={perspective} now={now} onOpen={onOpen && (() => onOpen(a))} />
        ))}
      </ul>
    </details>
  );
}

/* ------------------------------------------------------------------ */
/* Trainer                                                             */
/* ------------------------------------------------------------------ */

export function TrainerAppointments({
  appointments,
}: {
  appointments: { data?: { appointments: Appointment[] }; error?: Error; loading: boolean; reload: () => void };
}) {
  const settings = useApi<BookingSettings>("/booking/settings");
  const [view, setView] = useState<"calendar" | "list" | "settings">("calendar");
  const [detail, setDetail] = useState<Appointment | null>(null);
  const now = useNow();

  if (appointments.loading || settings.loading) return <Spinner />;
  if (!appointments.data) return <LoadError message={appointments.error?.message ?? "Termine konnten nicht geladen werden."} onRetry={appointments.reload} />;
  if (!settings.data) return <LoadError message={settings.error?.message ?? "Einstellungen konnten nicht geladen werden."} onRetry={settings.reload} />;

  const { upcoming, rest } = split(appointments.data.appointments, now);
  const requests = upcoming.filter((a) => a.status === "requested");
  const confirmed = upcoming.filter((a) => a.status === "confirmed");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-surface-3 p-1">
          {(
            [
              ["calendar", "Kalender", 0],
              ["list", "Anfragen & Liste", requests.length],
              ["settings", "Angebot & Zeiten", 0],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition",
                view === key ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
              )}
            >
              {label}
              {count > 0 && <span className="rounded-full bg-accent px-1.5 text-xs text-accent-fg">{count}</span>}
            </button>
          ))}
        </div>
        <span className={cx("inline-flex items-center gap-2 text-sm font-medium", settings.data.enabled ? "text-brand-ink" : "text-fg-muted")}>
          <span className={cx("size-2 rounded-full", settings.data.enabled ? "bg-brand-ink" : "bg-line-strong")} />
          {settings.data.enabled ? "Kunden können Termine anfragen" : "Terminanfragen ausgeschaltet"}
        </span>
      </div>

      {view === "calendar" ? (
        <>
          {requests.length > 0 && (
            <button
              type="button"
              onClick={() => setView("list")}
              className="flex w-full items-center gap-3 rounded-2xl bg-accent/10 p-4 text-left ring-1 ring-accent/30 transition hover:bg-accent/15"
            >
              <IconTile name="calendar" tone="accent" />
              <span className="flex-1 text-sm">
                <span className="font-semibold text-fg">
                  {requests.length} offene {requests.length === 1 ? "Anfrage wartet" : "Anfragen warten"} auf deine Antwort.
                </span>{" "}
                <span className="text-fg-muted">Im Kalender violett umrandet.</span>
              </span>
              <Icon name="arrow" className="size-4 text-fg-muted" />
            </button>
          )}
          <CalendarView role="trainer" onChanged={appointments.reload} />
        </>
      ) : view === "settings" ? (
        <BookingSettingsEditor
          initial={settings.data}
          onSaved={() => {
            settings.reload();
            setView("list");
          }}
        />
      ) : (
        <>
          {!settings.data.enabled && (
            <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <IconTile name="calendar" tone="accent" />
              <div className="flex-1">
                <p className="font-semibold text-fg">Lass Kunden Termine bei dir anfragen</p>
                <p className="mt-0.5 text-sm text-fg-muted">
                  Lege Angebote wie Personal Training oder Ernährungsberatung und deine Zeiten fest. Gehörst du zu einem Studio, können auch dessen
                  Kunden bei dir anfragen. Du bestätigst jede Anfrage selbst.
                </p>
              </div>
              <Button onClick={() => setView("settings")}>Jetzt einrichten</Button>
            </Card>
          )}

          <ListSection title="Offene Anfragen" count={requests.length} empty="Keine offenen Anfragen.">
            {requests.map((a) => (
              <TrainerRow key={a.id} a={a} now={now} onChanged={appointments.reload} onOpen={() => setDetail(a)} />
            ))}
          </ListSection>
          <ListSection title="Kommende Termine" count={confirmed.length} empty="Noch keine bestätigten Termine.">
            {confirmed.map((a) => (
              <TrainerRow key={a.id} a={a} now={now} onChanged={appointments.reload} onOpen={() => setDetail(a)} />
            ))}
          </ListSection>
          {rest.length > 0 && <History items={rest} perspective="trainer" now={now} onOpen={setDetail} />}
        </>
      )}
      {detail && <AppointmentDetail a={detail} role="trainer" now={now} onClose={() => setDetail(null)} onChanged={appointments.reload} />}
    </div>
  );
}

function ListSection({ title, count, empty, children }: { title: string; count: number; empty: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
        {title}
        <span className="rounded-full bg-surface-3 px-1.5 text-xs text-fg-muted">{count}</span>
      </h3>
      {count ? <ul className="space-y-3">{children}</ul> : <p className="rounded-2xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-fg-muted">{empty}</p>}
    </section>
  );
}

function TrainerRow({ a, now, onChanged, onOpen }: { a: Appointment; now: number; onChanged: () => void; onOpen: () => void }) {
  const [dialog, setDialog] = useState<"decline" | "cancel" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const who = partyName(a);

  async function act(action: "confirm" | "decline" | "cancel", message?: string) {
    await api(`/appointments/${a.id}`, { method: "PATCH", body: { action, message: message || undefined } });
    setDialog(null);
    onChanged();
  }

  return (
    <>
      <AppointmentRow
        a={a}
        perspective="trainer"
        now={now}
        onOpen={onOpen}
        actions={
          a.status === "requested" ? (
            <>
              <Button
                size="sm"
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  setError(null);
                  try {
                    await act("confirm");
                  } catch (err) {
                    setError(errorMessage(err));
                    onChanged();
                  } finally {
                    setPending(false);
                  }
                }}
              >
                <Icon name="check" className="size-3.5" /> Bestätigen
              </Button>
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => setDialog("decline")}>
                Ablehnen
              </Button>
            </>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setDialog("cancel")}>
              Absagen
            </Button>
          )
        }
      />
      {error && <Alert>{error}</Alert>}
      {dialog && (
        <ReasonDialog
          title={dialog === "decline" ? "Anfrage ablehnen" : "Termin absagen"}
          description={
            <>
              <span className="font-semibold text-fg">{a.title}</span> mit {who} am {longDate(a.startsAt)}, {time(a.startsAt)} Uhr.
              {a.client ? ` ${who} wird benachrichtigt.` : ""}
            </>
          }
          confirmLabel={dialog === "decline" ? "Ablehnen" : "Termin absagen"}
          placeholder={dialog === "decline" ? "z. B. Da bin ich leider im Urlaub – passt dir Donnerstag?" : "z. B. Ich bin leider krank."}
          onSubmit={(m) => act(dialog, m)}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}

/* ---------------------------- Einstellungen ---------------------------- */

type DraftService = Omit<BookingService, "id"> & { id?: string; key: string };

let draftKey = 0;
const newKey = () => `k${++draftKey}`;

const plus2h = (t: string) => {
  const m = Math.min(toMin(t) + 120, 23 * 60 + 45);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

function BookingSettingsEditor({ initial, onSaved }: { initial: BookingSettings; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(initial.enabled || (!initial.services.length && !initial.windows.length));
  const [services, setServices] = useState<DraftService[]>(() =>
    initial.services.length
      ? initial.services.map((s) => ({ ...s, key: newKey() }))
      : [{ key: newKey(), category: "personal_training", title: "Personal Training", durationMin: 60, description: null }],
  );
  const [windows, setWindows] = useState<BookingWindow[]>(initial.windows);
  const [minNoticeHours, setMinNotice] = useState(initial.minNoticeHours);
  const [horizonDays, setHorizon] = useState(initial.horizonDays);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateService = (key: string, patch: Partial<DraftService>) => setServices((list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  const dayWindows = (day: number) => windows.map((w, i) => ({ w, i })).filter(({ w }) => w.day === day);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const body = {
      enabled,
      services: services.map((s) => ({ id: s.id, category: s.category, title: s.title, durationMin: s.durationMin, description: s.description || null })),
      windows,
      minNoticeHours,
      horizonDays,
    };
    const parsed = bookingSettingsSchema.safeParse(body);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Bitte prüfe deine Eingaben.");
    if (enabled && !services.length) return setError("Lege mindestens ein Angebot an.");
    if (enabled && !windows.length) return setError("Lege mindestens ein Zeitfenster an.");
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
            Deine Kunden – und, wenn du zu einem Studio gehörst, auch dessen Kunden – können in deinen Zeiten anfragen. Du bestätigst jede Anfrage.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Terminanfragen annehmen"
          onClick={() => setEnabled((v) => !v)}
          className={cx("relative h-7 w-12 shrink-0 rounded-full transition", enabled ? "bg-brand-ink" : "bg-line-strong")}
        >
          <span className={cx("absolute top-1 size-5 rounded-full bg-white shadow transition-all", enabled ? "left-6" : "left-1")} />
        </button>
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-fg">Angebote</h3>
            <p className="mt-0.5 text-sm text-fg-muted">Was Kunden bei dir anfragen können.</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={services.length >= 12}
            onClick={() => setServices((l) => [...l, { key: newKey(), category: "other", title: "", durationMin: 30, description: null }])}
          >
            <Icon name="plus" className="size-3.5" /> Angebot
          </Button>
        </div>
        {services.length === 0 ? (
          <p className="mt-4 text-sm text-fg-muted">Noch keine Angebote.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {services.map((s) => (
              <li key={s.key} className="grid gap-3 rounded-xl bg-surface-2 p-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_7rem_auto] sm:items-end">
                <Field label="Kategorie">
                  <Select
                    value={s.category}
                    onChange={(e) => {
                      const category = e.target.value as AppointmentCategory;
                      const wasDefault = !s.title || s.title === CATEGORIES[s.category].label;
                      updateService(s.key, {
                        category,
                        ...(wasDefault ? { title: CATEGORIES[category].label, durationMin: CATEGORIES[category].duration } : {}),
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
                  <Input value={s.title} maxLength={80} required onChange={(e) => updateService(s.key, { title: e.target.value })} />
                </Field>
                <Field label="Dauer">
                  <Select value={s.durationMin} onChange={(e) => updateService(s.key, { durationMin: Number(e.target.value) })}>
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
                  onClick={() => setServices((l) => l.filter((x) => x.key !== s.key))}
                  className="justify-self-end"
                >
                  <Icon name="x" className="size-4" />
                </Button>
                <div className="sm:col-span-4">
                  <Input
                    value={s.description ?? ""}
                    maxLength={300}
                    placeholder="Kurzbeschreibung (optional), z. B. „inkl. Trainingsplan-Anpassung“"
                    onChange={(e) => updateService(s.key, { description: e.target.value })}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold text-fg">Deine Verfügbarkeit</h3>
        <p className="mt-0.5 text-sm text-fg-muted">Wöchentlich wiederkehrend. Bereits vergebene Zeiten werden automatisch ausgeblendet.</p>
        <ul className="mt-4 divide-y divide-line">
          {WEEKDAYS.map((name, day) => {
            const list = dayWindows(day);
            return (
              <li key={day} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
                <span className={cx("w-28 shrink-0 pt-2 text-sm font-medium", list.length ? "text-fg" : "text-fg-subtle")}>{name}</span>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {list.map(({ w, i }) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 p-1 ring-1 ring-line">
                      <Input
                        type="time"
                        step={900}
                        value={w.start}
                        aria-label={`${name} von`}
                        onChange={(e) => setWindows((ws) => ws.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                        className="w-28 bg-surface py-1"
                      />
                      <span className="text-fg-subtle">–</span>
                      <Input
                        type="time"
                        step={900}
                        value={w.end}
                        aria-label={`${name} bis`}
                        onChange={(e) => setWindows((ws) => ws.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                        className="w-28 bg-surface py-1"
                      />
                      <button
                        type="button"
                        aria-label="Zeitfenster entfernen"
                        onClick={() => setWindows((ws) => ws.filter((_, j) => j !== i))}
                        className="grid size-7 place-items-center rounded-md text-fg-subtle hover:bg-surface-3 hover:text-fg"
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
                      setWindows((ws) => [...ws, last ? { day, start: last.end, end: plus2h(last.end) } : { day, start: "09:00", end: "17:00" }]);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-semibold text-brand-ink hover:bg-surface-2"
                  >
                    <Icon name="plus" className="size-3.5" /> {list.length ? "Weiteres" : "Zeitfenster"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Mindestvorlauf" hint="So kurzfristig dürfen Kunden höchstens anfragen.">
            <Select value={minNoticeHours} onChange={(e) => setMinNotice(Number(e.target.value))}>
              {[0, 2, 6, 12, 24, 48, 72, 168].map((h) => (
                <option key={h} value={h}>
                  {h === 0 ? "Kein Vorlauf" : h < 24 ? `${h} Stunden` : h === 168 ? "1 Woche" : `${h / 24} ${h === 24 ? "Tag" : "Tage"}`}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Buchbar im Voraus" hint="So weit in der Zukunft können Kunden anfragen.">
            <Select value={horizonDays} onChange={(e) => setHorizon(Number(e.target.value))}>
              {[7, 14, 28, 42, 56, 90].map((d) => (
                <option key={d} value={d}>
                  {d % 7 === 0 ? `${d / 7} ${d === 7 ? "Woche" : "Wochen"}` : `${d} Tage`}
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

/* ------------------------------------------------------------------ */
/* Studio: Wochenübersicht                                             */
/* ------------------------------------------------------------------ */

const HOUR_PX = 44;

/** Überlappende Termine eines Tages nebeneinander anordnen (Spuren). */
function layoutDay<T extends { startsAt: string; endsAt: string }>(items: T[]) {
  const sorted = [...items].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const lanes: number[] = []; // Ende je Spur
  const placed = sorted.map((item) => {
    const s = Date.parse(item.startsAt);
    let lane = lanes.findIndex((end) => end <= s);
    if (lane === -1) lane = lanes.push(0) - 1;
    lanes[lane] = Date.parse(item.endsAt);
    return { item, lane };
  });
  return { placed, lanes: Math.max(lanes.length, 1) };
}

type CourseBlock = Schedule["courseSessions"][number];
type CalendarItem = { kind: "appointment"; a: Appointment; startsAt: string; endsAt: string } | { kind: "course"; c: CourseBlock; startsAt: string; endsAt: string };

const minutesOfDay = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};

/**
 * Wochenkalender. Studio: alle Trainer (filterbar) · Trainer: eigene Termine und Zeiten.
 * Klick auf einen Termin öffnet Details mit Kommentaren, Klick auf einen Tag trägt einen Termin ein.
 */
export function CalendarView({ role, onChanged }: { role: "trainer" | "studio"; onChanged: () => void }) {
  const [week, setWeek] = useState(() => localDate(new Date()));
  const schedule = useApi<Schedule>(`/schedule?week=${week}`);
  const [filter, setFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [course, setCourse] = useState<CourseBlock | null>(null);
  const [create, setCreate] = useState<{ date: string } | null>(null);
  const now = useNow();
  const today = localDate(new Date(now));

  if (schedule.loading && !schedule.data) return <Spinner />;
  if (!schedule.data) return <LoadError message={schedule.error?.message ?? "Termine konnten nicht geladen werden."} onRetry={schedule.reload} />;

  const data = schedule.data;
  const reload = () => {
    schedule.reload();
    onChanged();
  };
  const multi = role === "studio";
  const days = Array.from({ length: 7 }, (_, i) => addDays(data.weekStart, i));
  const trainers = data.trainers.filter((t) => !filter || t.id === filter);
  const visible = data.appointments.filter((a) => (a.status === "requested" || a.status === "confirmed") && (!filter || a.trainer.id === filter));
  const cancelledCount = data.appointments.filter((a) => (a.status === "cancelled" || a.status === "declined") && (!filter || a.trainer.id === filter)).length;
  const courses = (data.courseSessions ?? []).filter((c) => !filter || c.trainerId === filter);
  const items: CalendarItem[] = [
    ...visible.map((a) => ({ kind: "appointment" as const, a, startsAt: a.startsAt, endsAt: a.endsAt })),
    ...courses.map((c) => ({ kind: "course" as const, c, startsAt: c.startsAt, endsAt: c.endsAt })),
  ];

  // Sichtbarer Zeitraum: mindestens 7–21 Uhr, erweitert um Zeitfenster und Termine
  const mins = [7 * 60, ...trainers.flatMap((t) => t.windows.map((w) => toMin(w.start))), ...items.map((x) => minutesOfDay(x.startsAt))];
  const maxs = [21 * 60, ...trainers.flatMap((t) => t.windows.map((w) => toMin(w.end))), ...items.map((x) => minutesOfDay(x.endsAt) || 24 * 60)];
  const startH = Math.floor(Math.min(...mins) / 60);
  const endH = Math.min(24, Math.ceil(Math.max(...maxs) / 60));
  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i);
  const top = (min: number) => ((min - startH * 60) / 60) * HOUR_PX;
  const rangeLabel = `${fmt(`${days[0]}T12:00:00`, { day: "numeric", month: "short" })} – ${fmt(`${days[6]}T12:00:00`, { day: "numeric", month: "short", year: "numeric" })}`;
  const requested = visible.filter((a) => a.status === "requested").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Vorherige Woche"
            onClick={() => setWeek(addDays(data.weekStart, -7))}
            className="grid size-9 place-items-center rounded-lg ring-1 ring-line hover:bg-surface-2"
          >
            <Icon name="chevronLeft" className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Nächste Woche"
            onClick={() => setWeek(addDays(data.weekStart, 7))}
            className="grid size-9 place-items-center rounded-lg ring-1 ring-line hover:bg-surface-2"
          >
            <Icon name="chevronLeft" className="size-4 rotate-180" />
          </button>
          <p className="ml-1 font-semibold text-fg">{rangeLabel}</p>
          {!days.includes(today) && (
            <Button size="sm" variant="ghost" onClick={() => setWeek(today)}>
              Heute
            </Button>
          )}
          {schedule.loading && <span className="size-4 animate-spin rounded-full border-2 border-line border-t-brand-ink" aria-label="Lädt" />}
        </div>
        <Button onClick={() => setCreate({ date: days.includes(today) ? today : days[0] })} disabled={!data.trainers.length}>
          <Icon name="plus" className="size-4" /> Termin eintragen
        </Button>
      </div>

      {data.trainers.length === 0 ? (
        <EmptyState title="Noch keine Trainer" text="Lade Trainer ein – sie pflegen ihre Zeiten selbst und erscheinen dann hier." />
      ) : (
        <>
          {multi && (
            <div className="flex flex-wrap gap-2">
              <FilterChip active={!filter} onClick={() => setFilter(null)}>
                Alle Trainer
              </FilterChip>
              {data.trainers.map((t) => (
                <FilterChip key={t.id} active={filter === t.id} onClick={() => setFilter(filter === t.id ? null : t.id)}>
                  <Avatar name={t.name} src={t.avatarUrl} className="size-5 text-[9px] ring-1" />
                  {t.name}
                  {!t.enabled && <span className="text-xs font-normal opacity-70">· keine Zeiten</span>}
                </FilterChip>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded bg-brand" /> Bestätigt
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded bg-surface ring-1 ring-accent" /> Angefragt{requested ? ` (${requested})` : ""}
            </span>
            {courses.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded bg-brand-fg" /> Kurs
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded bg-brand/25" /> {multi ? "Verfügbar – je kräftiger, desto mehr Trainer" : "Deine Verfügbarkeit"}
            </span>
            {cancelledCount > 0 && <span>{cancelledCount} abgesagt/abgelehnt (ausgeblendet)</span>}
          </div>

          <Card className="overflow-x-auto p-0">
            <div className="min-w-[760px]">
              {/* Kopfzeile: Wochentage mit Anzahl Termine (und verfügbarer Trainer) */}
              <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-line">
                <div />
                {days.map((d, i) => {
                  const count = items.filter((x) => localDate(new Date(x.startsAt)) === d).length;
                  const available = trainers.filter((t) => t.enabled && t.windows.some((w) => w.day === i)).length;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCreate({ date: d })}
                      title="Termin an diesem Tag eintragen"
                      className={cx("border-l border-line px-2 py-3 text-left transition hover:bg-surface-2", d === today && "bg-brand/20")}
                    >
                      <span className="block text-xs font-semibold text-fg-muted uppercase">{WEEKDAYS[i].slice(0, 2)}</span>
                      <span className="block text-lg leading-6 font-extrabold text-fg">{fmt(`${d}T12:00:00`, { day: "numeric", month: "numeric" })}</span>
                      <span className="block truncate text-[11px] text-fg-subtle">
                        {count} {count === 1 ? "Termin" : "Termine"}
                        {multi && ` · ${available} Trainer`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Zeitraster */}
              <div className="relative grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]" style={{ height: hours.length * HOUR_PX }}>
                <div className="relative">
                  {hours.map((h) => (
                    <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] text-fg-subtle tabular-nums" style={{ top: top(h * 60) }}>
                      {h > startH ? `${String(h).padStart(2, "0")}:00` : ""}
                    </span>
                  ))}
                </div>
                {days.map((d, i) => {
                  const { placed, lanes } = layoutDay(items.filter((x) => localDate(new Date(x.startsAt)) === d));
                  const nowLine = d === today ? minutesOfDay(new Date(now).toISOString()) : null;
                  return (
                    <div key={d} className={cx("relative border-l border-line", d === today && "bg-brand/5")}>
                      {hours.map((h) => (
                        <div key={h} className="absolute inset-x-0 border-t border-line/70" style={{ top: top(h * 60) }} />
                      ))}
                      {/* Verfügbarkeit: übereinanderliegende Fenster werden kräftiger */}
                      {trainers
                        .filter((t) => t.enabled)
                        .flatMap((t) => t.windows.filter((w) => w.day === i).map((w, k) => ({ t, w, k })))
                        .map(({ t, w, k }) => (
                          <div
                            key={`${t.id}-${k}`}
                            title={`${t.name}: ${w.start}–${w.end}`}
                            className="pointer-events-none absolute inset-x-0 bg-brand/15"
                            style={{ top: top(toMin(w.start)), height: ((toMin(w.end) - toMin(w.start)) / 60) * HOUR_PX }}
                          />
                        ))}
                      {nowLine != null && nowLine >= startH * 60 && nowLine <= endH * 60 && (
                        <div className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-accent" style={{ top: top(nowLine) }}>
                          <span className="absolute -top-1 -left-1 size-2 rounded-full bg-accent" />
                        </div>
                      )}
                      {placed.map(({ item, lane }) => {
                        const start = minutesOfDay(item.startsAt);
                        const duration = Math.max(15, Math.round((Date.parse(item.endsAt) - Date.parse(item.startsAt)) / 60000));
                        const height = (duration / 60) * HOUR_PX;
                        const position = {
                          top: top(start) + 1,
                          height: height - 2,
                          left: `calc(${(lane / lanes) * 100}% + 2px)`,
                          width: `calc(${100 / lanes}% - 4px)`,
                        };
                        if (item.kind === "course") {
                          const c = item.c;
                          const trainerName = data.trainers.find((t) => t.id === c.trainerId)?.name;
                          return (
                            <button
                              key={`course-${c.courseId}-${c.startsAt}`}
                              type="button"
                              onClick={() => setCourse(c)}
                              title={`${time(c.startsAt)}–${time(c.endsAt)} ${c.title} · ${c.booked}/${c.capacity} Plätze${trainerName ? ` · ${trainerName}` : ""}`}
                              className="absolute overflow-hidden rounded-md bg-brand-fg px-1.5 py-1 text-left text-[11px] leading-tight text-white shadow-sm transition hover:z-10 hover:shadow-md"
                              style={position}
                            >
                              <span className="flex items-center gap-1 truncate font-semibold">
                                {time(c.startsAt)} {c.title}
                                <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-brand">
                                  <Icon name="users" className="size-2.5" />
                                  {c.booked}/{c.capacity}
                                </span>
                              </span>
                              {height > 34 && (
                                <span className="block truncate opacity-75">
                                  {[multi && trainerName ? trainerName.split(" ")[0] : null, c.location].filter(Boolean).join(" · ") || "Kurs"}
                                </span>
                              )}
                            </button>
                          );
                        }
                        const a = item.a;
                        const who = multi ? `${a.trainer.name.split(" ")[0]} · ${partyName(a)}` : partyName(a);
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setSelected(a)}
                            title={`${time(a.startsAt)}–${time(a.endsAt)} ${a.title} · ${multi ? `${a.trainer.name} · ` : ""}${partyName(a)}`}
                            className={cx(
                              "absolute overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition hover:z-10 hover:shadow-md",
                              a.status === "confirmed" ? "bg-brand text-brand-fg" : "bg-surface text-fg ring-1 ring-accent ring-inset",
                            )}
                            style={position}
                          >
                            <span className="flex items-center gap-1 truncate font-semibold">
                              {time(a.startsAt)} {a.title}
                              {a.commentCount > 0 && (
                                <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 opacity-80">
                                  <Icon name="chat" className="size-2.5" />
                                  {a.commentCount}
                                </span>
                              )}
                            </span>
                            {height > 34 && <span className="block truncate opacity-80">{who}</span>}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </>
      )}

      {selected && (
        <AppointmentDetail
          a={selected}
          role={role}
          now={now}
          onClose={() => setSelected(null)}
          onChanged={reload}
        />
      )}
      {course && (
        <CourseSessionModal
          session={{ courseId: course.courseId, title: course.title, startsAt: course.startsAt, endsAt: course.endsAt, booked: course.booked, capacity: course.capacity, location: course.location }}
          onClose={() => setCourse(null)}
        />
      )}
      {create && (
        <BookDialog
          schedule={data}
          role={role}
          initialDate={create.date}
          onClose={() => setCreate(null)}
          onCreated={() => {
            setCreate(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition",
        active ? "bg-brand-fg text-white ring-brand-fg" : "text-fg ring-line hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

const ROLE_LABEL = { client: "Kunde", trainer: "Trainer", studio: "Studio" } as const;

/**
 * Termin-Details für alle Beteiligten: Infos, Aktionen (bestätigen/ablehnen/absagen),
 * Kommentare und – nur für den Trainer – eine private Notiz.
 */
function AppointmentDetail({
  a: initial,
  role,
  now,
  onClose,
  onChanged,
}: {
  a: Appointment;
  role: "client" | "trainer" | "studio";
  now: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [a, setA] = useState(initial);
  const comments = useApi<{ comments: AppointmentComment[] }>(`/appointments/${a.id}/comments`);
  const [reason, setReason] = useState<"decline" | "cancel" | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(initial.trainerNote ?? "");
  const [noteState, setNoteState] = useState<"idle" | "saving" | "saved">("idle");

  const active = (a.status === "requested" || a.status === "confirmed") && Date.parse(a.endsAt) > now;
  const who = partyName(a);

  async function act(action: "confirm" | "decline" | "cancel", message?: string) {
    const updated = await api<Appointment>(`/appointments/${a.id}`, { method: "PATCH", body: { action, message: message || undefined } });
    setA({ ...updated, commentCount: a.commentCount });
    setReason(null);
    onChanged();
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api(`/appointments/${a.id}/comments`, { body: { body: draft.trim() } });
      setDraft("");
      comments.reload();
      setA((x) => ({ ...x, commentCount: x.commentCount + 1 }));
      onChanged();
    } catch (err) {
      setError(errorMessage(err, "Kommentar konnte nicht gesendet werden."));
    } finally {
      setSending(false);
    }
  }

  async function saveNote() {
    if ((a.trainerNote ?? "") === note.trim()) return;
    setNoteState("saving");
    setError(null);
    try {
      const updated = await api<Appointment>(`/appointments/${a.id}/note`, { method: "PUT", body: { note: note.trim() || null } });
      setA((x) => ({ ...x, trainerNote: updated.trainerNote }));
      setNoteState("saved");
    } catch (err) {
      setError(errorMessage(err, "Notiz konnte nicht gespeichert werden."));
      setNoteState("idle");
    }
  }

  if (reason) {
    const notify = role === "client" ? `${a.trainer.name} wird benachrichtigt.` : a.client ? `${a.client.name} wird benachrichtigt.` : "";
    return (
      <ReasonDialog
        title={reason === "decline" ? "Anfrage ablehnen" : role === "client" && a.status === "requested" ? "Anfrage zurückziehen" : "Termin absagen"}
        description={
          <>
            <span className="font-semibold text-fg">{a.title}</span> am {longDate(a.startsAt)}, {time(a.startsAt)} Uhr. {notify}
          </>
        }
        confirmLabel={reason === "decline" ? "Ablehnen" : "Bestätigen"}
        placeholder={reason === "decline" ? "z. B. Da bin ich leider im Urlaub – passt dir Donnerstag?" : "z. B. Mir ist leider etwas dazwischengekommen."}
        onSubmit={(m) => act(reason, m)}
        onClose={() => setReason(null)}
      />
    );
  }

  const list = comments.data?.comments ?? [];

  return (
    <Modal label={a.title} onClose={onClose} busy={pending || sending} wide>
      <ModalHeader title={a.title} subtitle={`${longDate(a.startsAt)} · ${time(a.startsAt)} – ${time(a.endsAt)} Uhr`} onClose={onClose} />

      <div className="mt-5 space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge tone={STATUS[a.status].tone}>{Date.parse(a.endsAt) <= now && a.status === "confirmed" ? "Stattgefunden" : STATUS[a.status].label}</Badge>
          <Badge>{CATEGORIES[a.category].label}</Badge>
          {a.createdBy === "studio" && <Badge>Vom Studio eingetragen</Badge>}
          {a.createdBy === "trainer" && <Badge>Vom Trainer eingetragen</Badge>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <PersonBox label="Trainer" name={a.trainer.name} src={a.trainer.avatarUrl} />
          <PersonBox label={a.client ? "Kunde" : "Gast"} name={who} src={a.client?.avatarUrl ?? null} />
        </div>
        {a.contact && (
          <ContactBlock
            a={a}
            onSaved={(updated) => {
              setA((x) => ({ ...x, contact: updated.contact }));
              onChanged();
            }}
          />
        )}
        {a.clientNote && (
          <p className="rounded-xl bg-surface-2 p-3 text-fg-muted">
            <span className="font-medium text-fg">{a.createdBy === "client" ? `Nachricht von ${who}` : "Notiz"}:</span> {a.clientNote}
          </p>
        )}
        {a.responseNote && (
          <p className="rounded-xl bg-surface-2 p-3 text-fg-muted">
            <span className="font-medium text-fg">{a.cancelledBy === "system" ? "Hinweis" : a.cancelledBy === "studio" ? "Studio" : a.cancelledBy === "client" ? who : a.trainer.name}:</span>{" "}
            {a.responseNote}
          </p>
        )}
        {a.status === "requested" && role !== "trainer" && <Alert tone="info">Die Anfrage wartet auf die Bestätigung durch {a.trainer.name}.</Alert>}

        {role === "trainer" && (
          <div>
            <label htmlFor="trainer-note" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-fg">
              <Icon name="lock" className="size-3.5 text-fg-subtle" /> Private Notiz
              <span className="font-normal text-fg-subtle">– nur für dich sichtbar</span>
            </label>
            <Textarea
              id="trainer-note"
              rows={2}
              maxLength={2000}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setNoteState("idle");
              }}
              onBlur={saveNote}
              placeholder="z. B. Fokus Knie – Kniebeugen mit weniger Gewicht, Mobility vorab."
            />
            <p className="mt-1 h-4 text-xs text-fg-subtle">{noteState === "saving" ? "Wird gespeichert …" : noteState === "saved" ? "Gespeichert ✓" : ""}</p>
          </div>
        )}

        {/* Kommentare */}
        <div className="border-t border-line pt-4">
          <p className="flex items-center gap-2 font-semibold text-fg">
            <Icon name="chat" className="size-4" /> Kommentare
            {list.length > 0 && <span className="rounded-full bg-surface-3 px-1.5 text-xs text-fg-muted">{list.length}</span>}
          </p>
          <p className="mt-0.5 text-xs text-fg-muted">
            {role === "client"
              ? `Sichtbar für dich, ${a.trainer.name} und ggf. das Studio.`
              : role === "trainer"
                ? `Sichtbar für dich${a.client ? `, ${a.client.name}` : ""} und ggf. das Studio.`
                : `Sichtbar für ${a.trainer.name}${a.client ? `, ${a.client.name}` : ""} und dich.`}
          </p>
          {comments.loading ? (
            <Spinner />
          ) : comments.error && !comments.data ? (
            <div className="mt-3">
              <LoadError message={comments.error.message} onRetry={comments.reload} />
            </div>
          ) : list.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-line-strong px-4 py-4 text-center text-xs text-fg-muted">
              Noch keine Kommentare – z. B. „Bitte Laufschuhe mitbringen“ oder „Ich komme 5 Minuten später“.
            </p>
          ) : (
            <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
              {list.map((c) => (
                <li key={c.id} className={cx("flex gap-2", c.mine && "flex-row-reverse")}>
                  <Avatar name={c.author.name} src={c.author.avatarUrl} className="size-7 text-[10px] ring-1" />
                  <div className={cx("max-w-[80%] rounded-2xl px-3 py-2", c.mine ? "bg-brand/40 text-fg" : "bg-surface-2 text-fg")}>
                    <p className="text-[11px] text-fg-muted">
                      <span className="font-semibold text-fg">{c.mine ? "Du" : c.author.name}</span> · {ROLE_LABEL[c.author.role]} ·{" "}
                      {fmt(c.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="mt-0.5 text-sm whitespace-pre-line">{c.body}</p>
                    {c.mine && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await api(`/appointments/${a.id}/comments/${c.id}`, { method: "DELETE" });
                            comments.reload();
                            setA((x) => ({ ...x, commentCount: Math.max(0, x.commentCount - 1) }));
                            onChanged();
                          } catch (err) {
                            setError(errorMessage(err));
                          }
                        }}
                        className="mt-1 text-[11px] font-medium text-fg-subtle hover:text-fg"
                      >
                        Löschen
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={send} className="mt-3 flex items-end gap-2">
            <Textarea
              rows={1}
              maxLength={1000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
              }}
              placeholder="Kommentar schreiben …"
              aria-label="Kommentar"
              className="min-h-10 flex-1 resize-y"
            />
            <Button type="submit" disabled={sending || !draft.trim()} aria-label="Kommentar senden">
              <Icon name="send" className="size-4" />
            </Button>
          </form>
        </div>
        {error && <Alert>{error}</Alert>}
      </div>

      {active && (
        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          {role === "trainer" && a.status === "requested" && (
            <>
              <Button variant="secondary" disabled={pending} onClick={() => setReason("decline")}>
                Ablehnen
              </Button>
              <Button
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  setError(null);
                  try {
                    await act("confirm");
                  } catch (err) {
                    setError(errorMessage(err));
                  } finally {
                    setPending(false);
                  }
                }}
              >
                <Icon name="check" className="size-4" /> Bestätigen
              </Button>
            </>
          )}
          {!(role === "trainer" && a.status === "requested") && (
            <Button variant="secondary" onClick={() => setReason("cancel")}>
              {role === "client" && a.status === "requested" ? "Anfrage zurückziehen" : "Termin absagen"}
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Kontaktdaten des Kunden/Gastes (nur Trainer & Studio). Pflegbar für den, der den Termin eingetragen hat. */
function ContactBlock({ a, onSaved }: { a: Appointment; onSaved: (a: Appointment) => void }) {
  const c = a.contact!;
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(c.overrideEmail ?? "");
  const [phone, setPhone] = useState(c.overridePhone ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profileHint = a.client ? "aus dem Profil" : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const updated = await api<Appointment>(`/appointments/${a.id}/contact`, { method: "PUT", body: { email: email.trim() || null, phone: phone.trim() || null } });
      onSaved(updated);
      setEditing(false);
    } catch (err) {
      setError(errorMessage(err, "Kontaktdaten konnten nicht gespeichert werden."));
    } finally {
      setPending(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={save} className="space-y-3 rounded-xl bg-surface-2 p-3">
        <p className="text-xs text-fg-muted">
          {a.client ? "Leer lassen, um die Daten aus dem Profil des Kunden zu verwenden." : "Kontaktdaten des Gastes."}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="E-Mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} placeholder={c.emailFromProfile ? (c.email ?? "") : ""} />
          </Field>
          <Field label="Telefon">
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} placeholder={c.phoneFromProfile ? (c.phone ?? "") : ""} />
          </Field>
        </div>
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
            Abbrechen
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Speichern …" : "Speichern"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-fg-muted">Kontakt</p>
        {a.canEditContact && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-brand-ink hover:underline">
            {c.overrideEmail || c.overridePhone ? "Bearbeiten" : "Hinterlegen"}
          </button>
        )}
      </div>
      {!c.email && !c.phone ? (
        <p className="mt-1 text-sm text-fg-subtle">Keine Kontaktdaten hinterlegt.</p>
      ) : (
        <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
          {c.email && (
            <a href={`mailto:${c.email}`} className="flex min-w-0 items-center gap-2 text-sm font-medium text-fg hover:text-brand-ink">
              <Icon name="mail" className="size-4 shrink-0 text-brand-ink" />
              <span className="truncate">{c.email}</span>
              {c.emailFromProfile && profileHint && <span className="shrink-0 text-[11px] font-normal text-fg-subtle">{profileHint}</span>}
            </a>
          )}
          {c.phone && (
            <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="flex min-w-0 items-center gap-2 text-sm font-medium text-fg hover:text-brand-ink">
              <Icon name="phone" className="size-4 shrink-0 text-brand-ink" />
              <span className="truncate">{c.phone}</span>
              {c.phoneFromProfile && profileHint && <span className="shrink-0 text-[11px] font-normal text-fg-subtle">{profileHint}</span>}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function PersonBox({ label, name, src }: { label: string; name: string; src: string | null }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface-2 p-3">
      <Avatar name={name} src={src} />
      <span className="min-w-0">
        <span className="block text-xs text-fg-muted">{label}</span>
        <span className="block truncate font-semibold text-fg">{name}</span>
      </span>
    </div>
  );
}

/** Termin direkt eintragen (sofort bestätigt). Studio wählt den Trainer, Trainer trägt bei sich ein. */
function BookDialog({
  schedule,
  role,
  initialDate,
  onClose,
  onCreated,
}: {
  schedule: Schedule;
  role: "trainer" | "studio";
  initialDate: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const clients = schedule.clients;
  const [trainerId, setTrainerId] = useState(schedule.trainers[0]?.id ?? "");
  const trainer = schedule.trainers.find((t) => t.id === trainerId);
  const [party, setParty] = useState<"client" | "guest">(clients.length ? "client" : "guest");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [guestName, setGuestName] = useState("");
  const [serviceId, setServiceId] = useState<string>(trainer?.services[0]?.id ?? "custom");
  const [custom, setCustom] = useState({ category: "trial" as AppointmentCategory, title: CATEGORIES.trial.label, durationMin: CATEGORIES.trial.duration });
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState("10:00");
  const [note, setNote] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedClient = clients.find((c) => c.id === clientId);

  const service = trainer?.services.find((s) => s.id === serviceId);
  const details = service ? { category: service.category, title: service.title, durationMin: service.durationMin } : custom;
  const dayIndex = (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
  const windows = trainer?.enabled ? trainer.windows.filter((w) => w.day === dayIndex) : [];
  const startMin = toMin(startTime || "00:00");
  const outside = !windows.some((w) => startMin >= toMin(w.start) && startMin + details.durationMin <= toMin(w.end));
  const isStudio = role === "studio";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("/schedule", {
        body: {
          trainerId: isStudio ? trainerId : undefined,
          clientId: party === "client" ? clientId : null,
          guestName: party === "guest" ? guestName : undefined,
          ...details,
          startsAt: new Date(`${date}T${startTime}:00`).toISOString(),
          note: note.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
        },
      });
      onCreated();
    } catch (err) {
      setError(errorMessage(err, "Termin konnte nicht eingetragen werden."));
      setPending(false);
    }
  }

  return (
    <Modal label="Termin eintragen" onClose={onClose} busy={pending} wide>
      <form onSubmit={submit} className="space-y-5">
        <ModalHeader
          title="Termin eintragen"
          subtitle={isStudio ? "Wird sofort bestätigt. Trainer und Kunde werden benachrichtigt." : "Wird sofort bestätigt. Der Kunde wird benachrichtigt."}
          onClose={onClose}
        />

        <div className={cx("grid gap-4", isStudio && "sm:grid-cols-2")}>
          {isStudio && (
            <Field label="Trainer">
              <Select
                value={trainerId}
                onChange={(e) => {
                  setTrainerId(e.target.value);
                  setServiceId(schedule.trainers.find((t) => t.id === e.target.value)?.services[0]?.id ?? "custom");
                }}
              >
                {schedule.trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-fg">Für</span>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-3 p-1">
              {(
                [
                  ["client", "Kunde"],
                  ["guest", "Gast ohne Konto"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  disabled={key === "client" && !clients.length}
                  onClick={() => setParty(key)}
                  className={cx("rounded-md py-1.5 text-sm font-semibold transition disabled:opacity-40", party === key ? "bg-surface text-fg shadow-sm" : "text-fg-muted")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {party === "client" ? (
          <Field label="Kunde">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Name des Gastes" hint="z. B. für ein Probetraining von Interessenten.">
            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={100} required placeholder="Vor- und Nachname" />
          </Field>
        )}

        <Field label="Angebot">
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {trainer?.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} · {durationLabel(s.durationMin)}
              </option>
            ))}
            <option value="custom">Eigener Termin …</option>
          </Select>
        </Field>
        {serviceId === "custom" && (
          <div className="grid gap-4 rounded-xl bg-surface-2 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_7rem]">
            <Field label="Kategorie">
              <Select
                value={custom.category}
                onChange={(e) => {
                  const category = e.target.value as AppointmentCategory;
                  setCustom({ category, title: CATEGORIES[category].label, durationMin: CATEGORIES[category].duration });
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
              <Input value={custom.title} maxLength={80} required onChange={(e) => setCustom({ ...custom, title: e.target.value })} />
            </Field>
            <Field label="Dauer">
              <Select value={custom.durationMin} onChange={(e) => setCustom({ ...custom, durationMin: Number(e.target.value) })}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {durationLabel(d)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Datum">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Uhrzeit">
            <Input type="time" step={900} value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </Field>
        </div>
        <p className={cx("text-xs", outside ? "text-accent-soft" : "text-fg-muted")}>
          {isStudio ? trainer?.name : "Du"}{" "}
          {windows.length
            ? `${isStudio ? "ist" : "bist"} an diesem Tag verfügbar: ${windows.map((w) => `${w.start}–${w.end}`).join(", ")} Uhr.`
            : `${isStudio ? "hat" : "hast"} an diesem Tag keine Zeiten hinterlegt.`}
          {outside && " Der Termin liegt außerhalb – eintragen geht trotzdem."}
        </p>

        <div>
          <p className="text-sm font-medium text-fg">Kontakt</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            {party === "client"
              ? `Aus dem Profil: ${[selectedClient?.email, selectedClient?.phone ?? "keine Telefonnummer"].filter(Boolean).join(" · ")}. Nur ausfüllen, wenn für diesen Termin abweichend.`
              : "Damit ihr den Gast erreicht, z. B. bei Verspätung oder Absage."}
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              maxLength={254}
              aria-label="E-Mail"
              placeholder={party === "client" ? (selectedClient?.email ?? "E-Mail") : "E-Mail (optional)"}
            />
            <Input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              maxLength={40}
              aria-label="Telefon"
              placeholder={party === "client" ? (selectedClient?.phone ?? "Telefon") : "Telefon (optional)"}
            />
          </div>
        </div>

        <Field label="Notiz für den Kunden (optional)">
          <Textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Bitte Handtuch mitbringen." />
        </Field>

        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={pending || !trainerId}>
            {pending ? "Wird eingetragen …" : "Termin eintragen"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Kunden                                                              */
/* ------------------------------------------------------------------ */

/** Abschnitt „Meine Termine“ im Kunden-Dashboard inkl. Buchungsdialog. */
export function ClientAppointments({
  providers,
  booking,
  setBooking,
}: {
  providers: BookingProvider[];
  /** Trainer-ID oder "any" = Dialog offen */
  booking: string | null;
  setBooking: (v: string | null) => void;
}) {
  const appointments = useApi<{ appointments: Appointment[] }>("/appointments");
  const now = useNow();
  const [cancel, setCancel] = useState<Appointment | null>(null);
  const [detail, setDetail] = useState<Appointment | null>(null);

  const list = appointments.data?.appointments ?? [];
  if (!providers.length && !list.length && !appointments.loading) return null;
  const { upcoming, rest } = split(list, now);

  return (
    <section id="termine" className="scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-fg">Meine Termine</h2>
          <p className="mt-1 text-sm text-fg-muted">Personal Training, Beratung & Co. – angefragt und bestätigt.</p>
        </div>
        {providers.length > 0 && (
          <Button onClick={() => setBooking("any")}>
            <Icon name="calendar" className="size-4" /> Termin anfragen
          </Button>
        )}
      </div>

      {appointments.loading ? (
        <Spinner />
      ) : appointments.error && !appointments.data ? (
        <LoadError message={appointments.error.message} onRetry={appointments.reload} />
      ) : (
        <div className="space-y-4">
          {upcoming.length ? (
            <ul className="space-y-3">
              {upcoming.map((a) => (
                <AppointmentRow
                  key={a.id}
                  a={a}
                  perspective="client"
                  now={now}
                  onOpen={() => setDetail(a)}
                  actions={
                    <Button size="sm" variant="secondary" onClick={() => setCancel(a)}>
                      {a.status === "requested" ? "Zurückziehen" : "Absagen"}
                    </Button>
                  }
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Keine anstehenden Termine"
              text={providers.length ? "Frag einfach einen Termin an – du bekommst Bescheid, sobald er bestätigt ist." : "Aktuell bietet kein Trainer Terminanfragen an."}
            />
          )}
          {rest.length > 0 && <History items={rest} perspective="client" now={now} onOpen={setDetail} />}
        </div>
      )}
      {detail && <AppointmentDetail a={detail} role="client" now={now} onClose={() => setDetail(null)} onChanged={appointments.reload} />}

      {booking && providers.length > 0 && (
        <BookingDialog providers={providers} initialTrainerId={booking === "any" ? null : booking} onClose={() => setBooking(null)} onBooked={appointments.reload} />
      )}
      {cancel && (
        <ReasonDialog
          title={cancel.status === "requested" ? "Anfrage zurückziehen" : "Termin absagen"}
          description={
            <>
              <span className="font-semibold text-fg">{cancel.title}</span> bei {cancel.trainer.name} am {longDate(cancel.startsAt)}, {time(cancel.startsAt)} Uhr.{" "}
              {cancel.trainer.name} wird benachrichtigt.
            </>
          }
          confirmLabel={cancel.status === "requested" ? "Zurückziehen" : "Termin absagen"}
          placeholder="z. B. Mir ist leider etwas dazwischengekommen."
          onSubmit={async (message) => {
            await cancelAppointment(cancel, message);
            setCancel(null);
            appointments.reload();
          }}
          onClose={() => setCancel(null)}
        />
      )}
    </section>
  );
}

/** „Mi., 18. Nov., 16:00 Uhr“ bzw. „Gerade ausgebucht“ */
export const nextFreeLabel = (iso: string | null) =>
  iso ? `${fmt(iso, { weekday: "short", day: "numeric", month: "short" })}, ${time(iso)} Uhr` : "Gerade ausgebucht";

export function BookingDialog({
  providers,
  initialTrainerId,
  onClose,
  onBooked,
}: {
  providers: BookingProvider[];
  initialTrainerId: string | null;
  onClose: () => void;
  onBooked: () => void;
}) {
  const [trainerId, setTrainerId] = useState<string | null>(initialTrainerId ?? (providers.length === 1 ? providers[0].trainerId : null));
  const provider = providers.find((p) => p.trainerId === trainerId) ?? null;
  const [serviceId, setServiceId] = useState<string | null>(provider?.services.length === 1 ? provider.services[0].id : null);
  const [done, setDone] = useState<Appointment | null>(null);
  const service = provider?.services.find((s) => s.id === serviceId) ?? null;

  if (done) {
    return (
      <Modal label="Anfrage gesendet" onClose={onClose}>
        <div className="space-y-4 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand text-brand-fg">
            <Icon name="check" className="size-7" />
          </span>
          <h2 className="text-lg font-bold text-fg">Anfrage gesendet!</h2>
          <p className="text-sm text-fg-muted">
            {done.title} bei {done.trainer.name} am {longDate(done.startsAt)} um {time(done.startsAt)} Uhr. Sobald der Termin bestätigt ist, bekommst du
            Bescheid – den Status siehst du unter „Meine Termine“.
          </p>
          <Button onClick={onClose} className="w-full">
            Fertig
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal label="Termin anfragen" onClose={onClose} wide>
      <ModalHeader title="Termin anfragen" subtitle="Wähle Trainer, Angebot, Tag und Uhrzeit. Der Termin gilt, sobald er bestätigt ist." onClose={onClose} />

      {providers.length > 1 && (
        <>
          <p className="mt-6 text-sm font-semibold text-fg">Trainer</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {providers.map((p) => (
              <button
                key={p.trainerId}
                type="button"
                onClick={() => {
                  setTrainerId(p.trainerId);
                  setServiceId(p.services.length === 1 ? p.services[0].id : null);
                }}
                className={cx(
                  "flex items-center gap-3 rounded-xl p-3 text-left ring-1 transition",
                  p.trainerId === trainerId ? "bg-brand/25 ring-brand-ink" : "ring-line hover:bg-surface-2",
                )}
              >
                <Avatar name={p.name} src={p.avatarUrl} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-fg">{p.name}</span>
                    {p.ownCoach && <Badge tone="brand">Dein Coach</Badge>}
                  </span>
                  <span className="block truncate text-xs text-fg-muted">{p.nextFree ? `Frei ab ${nextFreeLabel(p.nextFree)}` : "Gerade ausgebucht"}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {provider && (
        <>
          <p className="mt-6 text-sm font-semibold text-fg">Angebot</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {provider.services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setServiceId(s.id)}
                className={cx(
                  "flex items-start gap-3 rounded-xl p-3 text-left ring-1 transition",
                  s.id === serviceId ? "bg-brand/25 ring-brand-ink" : "ring-line hover:bg-surface-2",
                )}
              >
                <IconTile name={CATEGORIES[s.category].icon} tone={s.id === serviceId ? "brand" : "neutral"} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-fg">{s.title}</span>
                  <span className="block text-xs text-fg-muted">
                    {durationLabel(s.durationMin)}
                    {s.title !== CATEGORIES[s.category].label && ` · ${CATEGORIES[s.category].label}`}
                  </span>
                  {s.description && <span className="mt-1 block text-xs text-fg-subtle">{s.description}</span>}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {provider && service && (
        <SlotPicker key={`${provider.trainerId}:${service.id}`} provider={provider} service={service} onBooked={(a) => (setDone(a), onBooked())} />
      )}
    </Modal>
  );
}

function SlotPicker({ provider, service, onBooked }: { provider: BookingProvider; service: BookingService; onBooked: (a: Appointment) => void }) {
  const slots = useApi<{ days: BookingSlotDay[] }>(
    `/booking/slots?trainerId=${encodeURIComponent(provider.trainerId)}&serviceId=${encodeURIComponent(service.id)}`,
  );
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (slots.loading) return <Spinner />;
  if (!slots.data) return <LoadError message={slots.error?.message ?? "Freie Zeiten konnten nicht geladen werden."} onRetry={slots.reload} />;

  const days = slots.data.days;
  const available = days.filter((d) => d.slots.length);
  const selectedDate = date && days.some((d) => d.date === date) ? date : (available[0]?.date ?? null);
  const day = days.find((d) => d.date === selectedDate);

  if (!available.length) {
    return (
      <div className="mt-6">
        <EmptyState title="Gerade keine freien Zeiten" text={`${provider.name} ist in den nächsten Wochen ausgebucht. Schau später noch einmal vorbei oder schreib eine Nachricht.`} />
      </div>
    );
  }

  async function submit() {
    if (!slot) return;
    setPending(true);
    setError(null);
    try {
      const a = await api<Appointment>("/appointments", {
        body: { trainerId: provider.trainerId, serviceId: service.id, startsAt: slot, note: note.trim() || undefined },
      });
      onBooked(a);
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
      if (err instanceof ApiClientError && err.status === 409) {
        setSlot(null);
        slots.reload();
      }
    }
  }

  return (
    <>
      <p className="mt-6 text-sm font-semibold text-fg">Tag</p>
      <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-2">
        {days.map((d) => {
          const dt = `${d.date}T12:00:00`;
          const active = d.date === selectedDate;
          return (
            <button
              key={d.date}
              type="button"
              disabled={!d.slots.length}
              onClick={() => {
                setDate(d.date);
                setSlot(null);
              }}
              className={cx(
                "grid w-16 shrink-0 place-items-center rounded-xl py-2 text-center ring-1 transition disabled:opacity-35",
                active ? "bg-brand text-brand-fg ring-brand-ink" : "ring-line enabled:hover:bg-surface-2",
              )}
            >
              <span className="text-[11px] font-semibold uppercase">{fmt(dt, { weekday: "short" }).replace(".", "")}</span>
              <span className="text-lg leading-6 font-extrabold">{fmt(dt, { day: "numeric" })}</span>
              <span className="text-[11px]">{fmt(dt, { month: "short" }).replace(".", "")}</span>
            </button>
          );
        })}
      </div>

      {day && (
        <>
          <p className="mt-4 text-sm font-semibold text-fg">Uhrzeit · {fmt(`${day.date}T12:00:00`, { weekday: "long", day: "numeric", month: "long" })}</p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {day.slots.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlot(s)}
                className={cx(
                  "rounded-lg py-2 text-sm font-semibold tabular-nums ring-1 transition",
                  s === slot ? "bg-brand-fg text-white ring-brand-fg" : "text-fg ring-line hover:bg-surface-2",
                )}
              >
                {time(s)}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-6">
        <Field label="Nachricht (optional)">
          <Textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Ich möchte an meiner Kniebeuge-Technik arbeiten." />
        </Field>
      </div>
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <Button className="mt-6 w-full" disabled={!slot || pending} onClick={submit}>
        {pending ? "Wird gesendet …" : slot ? `${service.title} am ${fmt(slot, { day: "numeric", month: "short" })} um ${time(slot)} Uhr anfragen` : "Uhrzeit wählen"}
      </Button>
    </>
  );
}
