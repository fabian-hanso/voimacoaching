"use client";

import { Icon, IconTile } from "@/components/icons";
import { Alert, Button, Card, cx, LoadError, Spinner } from "@/components/ui";
import { api, useApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import type { Appointment, BookingSettings } from "@/lib/types";
import { useState, type ReactNode } from "react";
import { AppointmentDetail } from "./appointment-detail";
import { AppointmentRow, History } from "./appointment-row";
import { BookingSettingsEditor } from "./booking-settings-editor";
import { CalendarView } from "./calendar-view";
import { ReasonDialog } from "./reason-dialog";
import { longDate, partyName, split, time, useNow } from "./utils";

export function TrainerAppointments({
  appointments,
}: {
  appointments: {
    data?: { appointments: Appointment[] };
    error?: Error;
    loading: boolean;
    reload: () => void;
  };
}) {
  const settings = useApi<BookingSettings>("/booking/settings");
  const [view, setView] = useState<"calendar" | "list" | "settings">(
    "calendar",
  );
  const [detail, setDetail] = useState<Appointment | null>(null);
  const now = useNow();

  if (appointments.loading || settings.loading) return <Spinner />;
  if (!appointments.data)
    return (
      <LoadError
        message={
          appointments.error?.message ?? "Termine konnten nicht geladen werden."
        }
        onRetry={appointments.reload}
      />
    );
  if (!settings.data)
    return (
      <LoadError
        message={
          settings.error?.message ??
          "Einstellungen konnten nicht geladen werden."
        }
        onRetry={settings.reload}
      />
    );

  const { upcoming, rest } = split(appointments.data.appointments, now);
  const requests = upcoming.filter((a) => a.status === "requested");
  const confirmed = upcoming.filter((a) => a.status === "confirmed");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-control bg-surface-3 p-1">
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
                "inline-flex items-center gap-1.5 rounded-inner px-3 py-1.5 text-sm font-semibold transition",
                view === key
                  ? "bg-surface text-fg shadow-sm"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {label}
              {count > 0 && (
                <span className="rounded-full bg-accent px-1.5 text-xs text-accent-fg">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
        <span
          className={cx(
            "inline-flex items-center gap-2 text-sm font-medium",
            settings.data.enabled ? "text-brand-ink" : "text-fg-muted",
          )}
        >
          <span
            className={cx(
              "size-2 rounded-full",
              settings.data.enabled ? "bg-brand-ink" : "bg-line-strong",
            )}
          />
          {settings.data.enabled
            ? "Kunden können Termine anfragen"
            : "Terminanfragen ausgeschaltet"}
        </span>
      </div>

      {view === "calendar" ? (
        <>
          {requests.length > 0 && (
            <button
              type="button"
              onClick={() => setView("list")}
              className="flex w-full items-center gap-3 rounded-box bg-accent/10 p-4 text-left ring-1 ring-accent/30 transition hover:bg-accent/15"
            >
              <IconTile name="calendar" tone="accent" />
              <span className="flex-1 text-sm">
                <span className="font-semibold text-fg">
                  {requests.length} offene{" "}
                  {requests.length === 1 ? "Anfrage wartet" : "Anfragen warten"}{" "}
                  auf deine Antwort.
                </span>{" "}
                <span className="text-fg-muted">
                  Im Kalender violett umrandet.
                </span>
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
                <p className="font-semibold text-fg">
                  Lass Kunden Termine bei dir anfragen
                </p>
                <p className="mt-0.5 text-sm text-fg-muted">
                  Lege Angebote wie Personal Training oder Ernährungsberatung
                  und deine Zeiten fest. Gehörst du zu einem Studio, können auch
                  dessen Kunden bei dir anfragen. Du bestätigst jede Anfrage
                  selbst.
                </p>
              </div>
              <Button onClick={() => setView("settings")}>
                Jetzt einrichten
              </Button>
            </Card>
          )}

          <ListSection
            title="Offene Anfragen"
            count={requests.length}
            empty="Keine offenen Anfragen."
          >
            {requests.map((a) => (
              <TrainerRow
                key={a.id}
                a={a}
                now={now}
                onChanged={appointments.reload}
                onOpen={() => setDetail(a)}
              />
            ))}
          </ListSection>
          <ListSection
            title="Kommende Termine"
            count={confirmed.length}
            empty="Noch keine bestätigten Termine."
          >
            {confirmed.map((a) => (
              <TrainerRow
                key={a.id}
                a={a}
                now={now}
                onChanged={appointments.reload}
                onOpen={() => setDetail(a)}
              />
            ))}
          </ListSection>
          {rest.length > 0 && (
            <History
              items={rest}
              perspective="trainer"
              now={now}
              onOpen={setDetail}
            />
          )}
        </>
      )}
      {detail && (
        <AppointmentDetail
          a={detail}
          role="trainer"
          now={now}
          onClose={() => setDetail(null)}
          onChanged={appointments.reload}
        />
      )}
    </div>
  );
}

function ListSection({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
        {title}
        <span className="rounded-full bg-surface-3 px-1.5 text-xs text-fg-muted">
          {count}
        </span>
      </h3>
      {count ? (
        <ul className="space-y-3">{children}</ul>
      ) : (
        <p className="rounded-box border border-dashed border-line-strong px-4 py-6 text-center text-sm text-fg-muted">
          {empty}
        </p>
      )}
    </section>
  );
}

function TrainerRow({
  a,
  now,
  onChanged,
  onOpen,
}: {
  a: Appointment;
  now: number;
  onChanged: () => void;
  onOpen: () => void;
}) {
  const [dialog, setDialog] = useState<"decline" | "cancel" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const who = partyName(a);

  async function act(
    action: "confirm" | "decline" | "cancel",
    message?: string,
  ) {
    await api(`/appointments/${a.id}`, {
      method: "PATCH",
      body: { action, message: message || undefined },
    });
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
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => setDialog("decline")}
              >
                Ablehnen
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setDialog("cancel")}
            >
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
              <span className="font-semibold text-fg">{a.title}</span> mit {who}{" "}
              am {longDate(a.startsAt)}, {time(a.startsAt)} Uhr.
              {a.client ? ` ${who} wird benachrichtigt.` : ""}
            </>
          }
          confirmLabel={dialog === "decline" ? "Ablehnen" : "Termin absagen"}
          placeholder={
            dialog === "decline"
              ? "z. B. Da bin ich leider im Urlaub – passt dir Donnerstag?"
              : "z. B. Ich bin leider krank."
          }
          onSubmit={(m) => act(dialog, m)}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
