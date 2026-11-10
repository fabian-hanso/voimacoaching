"use client";

import { Icon } from "@/components/icons";
import { Button, EmptyState, LoadError, Spinner } from "@/components/ui";
import { useApi } from "@/lib/client/api";
import type { Appointment, BookingProvider } from "@/lib/types";
import { useState } from "react";
import { AppointmentDetail } from "./appointment-detail";
import { AppointmentRow, History } from "./appointment-row";
import { BookingDialog } from "./booking-dialog";
import { ReasonDialog } from "./reason-dialog";
import { cancelAppointment, longDate, split, time, useNow } from "./utils";

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
          <h2 className="text-xl font-bold tracking-tight text-fg">
            Meine Termine
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            Personal Training, Beratung & Co. – angefragt und bestätigt.
          </p>
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
        <LoadError
          message={appointments.error.message}
          onRetry={appointments.reload}
        />
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
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setCancel(a)}
                    >
                      {a.status === "requested" ? "Zurückziehen" : "Absagen"}
                    </Button>
                  }
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Keine anstehenden Termine"
              text={
                providers.length
                  ? "Frag einfach einen Termin an – du bekommst Bescheid, sobald er bestätigt ist."
                  : "Aktuell bietet kein Trainer Terminanfragen an."
              }
            />
          )}
          {rest.length > 0 && (
            <History
              items={rest}
              perspective="client"
              now={now}
              onOpen={setDetail}
            />
          )}
        </div>
      )}
      {detail && (
        <AppointmentDetail
          a={detail}
          role="client"
          now={now}
          onClose={() => setDetail(null)}
          onChanged={appointments.reload}
        />
      )}

      {booking && providers.length > 0 && (
        <BookingDialog
          providers={providers}
          initialTrainerId={booking === "any" ? null : booking}
          onClose={() => setBooking(null)}
          onBooked={appointments.reload}
        />
      )}
      {cancel && (
        <ReasonDialog
          title={
            cancel.status === "requested"
              ? "Anfrage zurückziehen"
              : "Termin absagen"
          }
          description={
            <>
              <span className="font-semibold text-fg">{cancel.title}</span> bei{" "}
              {cancel.trainer.name} am {longDate(cancel.startsAt)},{" "}
              {time(cancel.startsAt)} Uhr. {cancel.trainer.name} wird
              benachrichtigt.
            </>
          }
          confirmLabel={
            cancel.status === "requested" ? "Zurückziehen" : "Termin absagen"
          }
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
