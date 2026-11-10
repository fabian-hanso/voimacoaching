"use client";

import { Modal, ModalHeader } from "@/components/dashboard/modal";
import { MoveDialog } from "./move-dialog";
import { Icon } from "@/components/icons";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  cx,
  Field,
  Input,
  LoadError,
  Spinner,
  Textarea,
} from "@/components/ui";
import { api, useApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import type { Appointment, AppointmentComment } from "@/lib/types";
import { useState } from "react";
import { ReasonDialog } from "./reason-dialog";
import { CATEGORIES, fmt, longDate, partyName, STATUS, time } from "./utils";

const ROLE_LABEL = {
  client: "Kunde",
  trainer: "Trainer",
  studio: "Studio",
} as const;

/**
 * Termin-Details für alle Beteiligten: Infos, Aktionen (bestätigen/ablehnen/absagen),
 * Kommentare und – nur für den Trainer – eine private Notiz.
 */
export function AppointmentDetail({
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
  const comments = useApi<{ comments: AppointmentComment[] }>(
    `/appointments/${a.id}/comments`,
  );
  const [reason, setReason] = useState<"decline" | "cancel" | null>(null);
  const [moving, setMoving] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(initial.trainerNote ?? "");
  const [noteState, setNoteState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  const active =
    (a.status === "requested" || a.status === "confirmed") &&
    Date.parse(a.endsAt) > now;
  const who = partyName(a);

  async function act(
    action: "confirm" | "decline" | "cancel",
    message?: string,
  ) {
    const updated = await api<Appointment>(`/appointments/${a.id}`, {
      method: "PATCH",
      body: { action, message: message || undefined },
    });
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
      await api(`/appointments/${a.id}/comments`, {
        body: { body: draft.trim() },
      });
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
      const updated = await api<Appointment>(`/appointments/${a.id}/note`, {
        method: "PUT",
        body: { note: note.trim() || null },
      });
      setA((x) => ({ ...x, trainerNote: updated.trainerNote }));
      setNoteState("saved");
    } catch (err) {
      setError(errorMessage(err, "Notiz konnte nicht gespeichert werden."));
      setNoteState("idle");
    }
  }

  if (reason) {
    const notify =
      role === "client"
        ? `${a.trainer.name} wird benachrichtigt.`
        : a.client
          ? `${a.client.name} wird benachrichtigt.`
          : "";
    return (
      <ReasonDialog
        title={
          reason === "decline"
            ? "Anfrage ablehnen"
            : role === "client" && a.status === "requested"
              ? "Anfrage zurückziehen"
              : "Termin absagen"
        }
        description={
          <>
            <span className="font-semibold text-fg">{a.title}</span> am{" "}
            {longDate(a.startsAt)}, {time(a.startsAt)} Uhr. {notify}
          </>
        }
        confirmLabel={reason === "decline" ? "Ablehnen" : "Bestätigen"}
        placeholder={
          reason === "decline"
            ? "z. B. Da bin ich leider im Urlaub – passt dir Donnerstag?"
            : "z. B. Mir ist leider etwas dazwischengekommen."
        }
        onSubmit={(m) => act(reason, m)}
        onClose={() => setReason(null)}
      />
    );
  }

  const list = comments.data?.comments ?? [];

  return (
    <Modal label={a.title} onClose={onClose} busy={pending || sending} wide>
      <ModalHeader
        title={a.title}
        subtitle={`${longDate(a.startsAt)} · ${time(a.startsAt)} – ${time(a.endsAt)} Uhr`}
        onClose={onClose}
      />

      <div className="mt-5 space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge tone={STATUS[a.status].tone}>
            {Date.parse(a.endsAt) <= now && a.status === "confirmed"
              ? "Stattgefunden"
              : STATUS[a.status].label}
          </Badge>
          <Badge>{CATEGORIES[a.category].label}</Badge>
          {a.createdBy === "studio" && <Badge>Vom Studio eingetragen</Badge>}
          {a.createdBy === "trainer" && <Badge>Vom Trainer eingetragen</Badge>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <PersonBox
            label="Trainer"
            name={a.trainer.name}
            src={a.trainer.avatarUrl}
          />
          <PersonBox
            label={a.client ? "Kunde" : "Gast"}
            name={who}
            src={a.client?.avatarUrl ?? null}
          />
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
          <p className="rounded-tile bg-surface-2 p-3 text-fg-muted">
            <span className="font-medium text-fg">
              {a.createdBy === "client" ? `Nachricht von ${who}` : "Notiz"}:
            </span>{" "}
            {a.clientNote}
          </p>
        )}
        {a.responseNote && (
          <p className="rounded-tile bg-surface-2 p-3 text-fg-muted">
            <span className="font-medium text-fg">
              {a.cancelledBy === "system"
                ? "Hinweis"
                : a.cancelledBy === "studio"
                  ? "Studio"
                  : a.cancelledBy === "client"
                    ? who
                    : a.trainer.name}
              :
            </span>{" "}
            {a.responseNote}
          </p>
        )}
        {a.status === "requested" && role !== "trainer" && (
          <Alert tone="info">
            Die Anfrage wartet auf die Bestätigung durch {a.trainer.name}.
          </Alert>
        )}

        {role === "trainer" && (
          <div>
            <label
              htmlFor="trainer-note"
              className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-fg"
            >
              <Icon name="lock" className="size-3.5 text-fg-subtle" /> Private
              Notiz
              <span className="font-normal text-fg-subtle">
                – nur für dich sichtbar
              </span>
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
            <p className="mt-1 h-4 text-xs text-fg-subtle">
              {noteState === "saving"
                ? "Wird gespeichert …"
                : noteState === "saved"
                  ? "Gespeichert ✓"
                  : ""}
            </p>
          </div>
        )}

        {/* Kommentare */}
        <div className="border-t border-line pt-4">
          <p className="flex items-center gap-2 font-semibold text-fg">
            <Icon name="chat" className="size-4" /> Kommentare
            {list.length > 0 && (
              <span className="rounded-full bg-surface-3 px-1.5 text-xs text-fg-muted">
                {list.length}
              </span>
            )}
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
              <LoadError
                message={comments.error.message}
                onRetry={comments.reload}
              />
            </div>
          ) : list.length === 0 ? (
            <p className="mt-3 rounded-tile border border-dashed border-line-strong px-4 py-4 text-center text-xs text-fg-muted">
              Noch keine Kommentare – z. B. „Bitte Laufschuhe mitbringen“ oder
              „Ich komme 5 Minuten später“.
            </p>
          ) : (
            <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
              {list.map((c) => (
                <li
                  key={c.id}
                  className={cx("flex gap-2", c.mine && "flex-row-reverse")}
                >
                  <Avatar
                    name={c.author.name}
                    src={c.author.avatarUrl}
                    className="size-7 text-[10px] ring-1"
                  />
                  <div
                    className={cx(
                      "max-w-[80%] rounded-tile px-3 py-2",
                      c.mine ? "bg-brand/40 text-fg" : "bg-surface-2 text-fg",
                    )}
                  >
                    <p className="text-[11px] text-fg-muted">
                      <span className="font-semibold text-fg">
                        {c.mine ? "Du" : c.author.name}
                      </span>{" "}
                      · {ROLE_LABEL[c.author.role]} ·{" "}
                      {fmt(c.createdAt, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="mt-0.5 text-sm whitespace-pre-line">
                      {c.body}
                    </p>
                    {c.mine && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await api(
                              `/appointments/${a.id}/comments/${c.id}`,
                              { method: "DELETE" },
                            );
                            comments.reload();
                            setA((x) => ({
                              ...x,
                              commentCount: Math.max(0, x.commentCount - 1),
                            }));
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
            <Button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Kommentar senden"
            >
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
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => setReason("decline")}
              >
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
          {role !== "client" && Date.parse(a.startsAt) > now && (
            <Button variant="secondary" onClick={() => setMoving(true)}>
              <Icon name="clock" className="size-4" /> Verschieben
            </Button>
          )}
          {!(role === "trainer" && a.status === "requested") && (
            <Button variant="secondary" onClick={() => setReason("cancel")}>
              {role === "client" && a.status === "requested"
                ? "Anfrage zurückziehen"
                : "Termin absagen"}
            </Button>
          )}
        </div>
      )}
      {moving && role !== "client" && (
        <MoveDialog
          a={a}
          role={role}
          onClose={() => setMoving(false)}
          onMoved={(updated) => {
            setA({ ...updated, commentCount: a.commentCount });
            setMoving(false);
            onChanged();
          }}
        />
      )}
    </Modal>
  );
}

/** Kontaktdaten des Kunden/Gastes (nur Trainer & Studio). Pflegbar für den, der den Termin eingetragen hat. */
function ContactBlock({
  a,
  onSaved,
}: {
  a: Appointment;
  onSaved: (a: Appointment) => void;
}) {
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
      const updated = await api<Appointment>(`/appointments/${a.id}/contact`, {
        method: "PUT",
        body: { email: email.trim() || null, phone: phone.trim() || null },
      });
      onSaved(updated);
      setEditing(false);
    } catch (err) {
      setError(
        errorMessage(err, "Kontaktdaten konnten nicht gespeichert werden."),
      );
    } finally {
      setPending(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={save} className="space-y-3 rounded-tile bg-surface-2 p-3">
        <p className="text-xs text-fg-muted">
          {a.client
            ? "Leer lassen, um die Daten aus dem Profil des Kunden zu verwenden."
            : "Kontaktdaten des Gastes."}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="E-Mail">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={254}
              placeholder={c.emailFromProfile ? (c.email ?? "") : ""}
            />
          </Field>
          <Field label="Telefon">
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={40}
              placeholder={c.phoneFromProfile ? (c.phone ?? "") : ""}
            />
          </Field>
        </div>
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            disabled={pending}
          >
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
    <div className="rounded-tile bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-fg-muted">Kontakt</p>
        {a.canEditContact && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-brand-ink hover:underline"
          >
            {c.overrideEmail || c.overridePhone ? "Bearbeiten" : "Hinterlegen"}
          </button>
        )}
      </div>
      {!c.email && !c.phone ? (
        <p className="mt-1 text-sm text-fg-subtle">
          Keine Kontaktdaten hinterlegt.
        </p>
      ) : (
        <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
          {c.email && (
            <a
              href={`mailto:${c.email}`}
              className="flex min-w-0 items-center gap-2 text-sm font-medium text-fg hover:text-brand-ink"
            >
              <Icon name="mail" className="size-4 shrink-0 text-brand-ink" />
              <span className="truncate">{c.email}</span>
              {c.emailFromProfile && profileHint && (
                <span className="shrink-0 text-[11px] font-normal text-fg-subtle">
                  {profileHint}
                </span>
              )}
            </a>
          )}
          {c.phone && (
            <a
              href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
              className="flex min-w-0 items-center gap-2 text-sm font-medium text-fg hover:text-brand-ink"
            >
              <Icon name="phone" className="size-4 shrink-0 text-brand-ink" />
              <span className="truncate">{c.phone}</span>
              {c.phoneFromProfile && profileHint && (
                <span className="shrink-0 text-[11px] font-normal text-fg-subtle">
                  {profileHint}
                </span>
              )}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function PersonBox({
  label,
  name,
  src,
}: {
  label: string;
  name: string;
  src: string | null;
}) {
  return (
    <div className="flex items-center gap-2 rounded-tile bg-surface-2 p-3">
      <Avatar name={name} src={src} />
      <span className="min-w-0">
        <span className="block text-xs text-fg-muted">{label}</span>
        <span className="block truncate font-semibold text-fg">{name}</span>
      </span>
    </div>
  );
}
