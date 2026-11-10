"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/client/api";
import {
  Avatar,
  Card,
  cx,
  EmptyState,
  LoadError,
  Spinner,
} from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { StudioLogo } from "@/components/studio-logo";
import type {
  BookingProvider,
  OpeningHoursDay,
  StudioProfile,
} from "@/lib/types";
import { BookingDialog, nextFreeLabel } from "../appointments";
import { StudioCourseList } from "../courses";
import { useMe } from "../shell";

export const WEEKDAYS = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

/** 0 = Montag … 6 = Sonntag */
const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;
const minutes = (hhmm: string) =>
  Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** „Jetzt geöffnet bis 22:00“ bzw. „Öffnet morgen um 07:00“ – auf Basis der Gerätezeit. */
export function openingStatus(
  hours: OpeningHoursDay[],
  now: Date,
): { open: boolean; text: string } | null {
  if (!hours.length) return null;
  const byDay = new Map(hours.map((h) => [h.day, h]));
  const today = weekdayIndex(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const t = byDay.get(today);
  if (
    t &&
    !t.closed &&
    nowMin >= minutes(t.open) &&
    nowMin < minutes(t.close)
  ) {
    return { open: true, text: `Jetzt geöffnet · bis ${t.close} Uhr` };
  }
  if (t && !t.closed && nowMin < minutes(t.open))
    return { open: false, text: `Geschlossen · öffnet heute um ${t.open} Uhr` };
  for (let i = 1; i <= 7; i++) {
    const day = (today + i) % 7;
    const h = byDay.get(day);
    if (h && !h.closed) {
      const when = i === 1 ? "morgen" : WEEKDAYS[day];
      return {
        open: false,
        text: `Geschlossen · öffnet ${when} um ${h.open} Uhr`,
      };
    }
  }
  return { open: false, text: "Derzeit geschlossen" };
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function StudioPage() {
  const { me } = useMe();
  const profile = useApi<StudioProfile>(me.studio ? "/studio/profile" : null);
  const booking = useApi<{ providers: BookingProvider[] }>(
    me.studio && me.user.role === "client" ? "/booking/providers" : null,
  );
  const bookable = booking.data?.providers ?? [];
  // Trainer-ID oder "any" = Buchungsdialog offen
  const [bookingFor, setBookingFor] = useState<string | null>(null);
  const now = useNow();

  if (!me.studio) {
    return (
      <EmptyState
        title="Kein Studio"
        text="Du gehörst aktuell zu keinem Studio."
        action={
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-brand-ink"
          >
            Zurück zum Dashboard
          </Link>
        }
      />
    );
  }
  if (profile.loading) return <Spinner />;
  if (!profile.data)
    return (
      <LoadError
        message={
          profile.error?.message ?? "Studio konnte nicht geladen werden."
        }
        onRetry={profile.reload}
      />
    );

  const s = profile.data;
  const status = openingStatus(s.openingHours, now);
  const isOwner = me.user.role === "studio";
  const address = [
    s.address.street,
    [s.address.postalCode, s.address.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const hasContact = address || Object.values(s.contact).some(Boolean);
  const empty =
    !s.description &&
    !address &&
    !s.openingHours.length &&
    !s.amenities.length &&
    !s.trainers.length &&
    !s.staff.length &&
    !Object.values(s.contact).some(Boolean);
  const today = weekdayIndex(now);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"
      >
        <Icon name="chevronLeft" className="size-4" /> Zurück zum Dashboard
      </Link>

      {isOwner && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-box bg-accent/10 px-4 py-3 text-sm ring-1 ring-accent/30">
          <span className="text-fg">
            <span className="font-semibold">Vorschau:</span> So sehen deine
            Trainer und Kunden dein Studio.
          </span>
          <Link
            href="/dashboard#studio-profil"
            className="font-semibold text-accent-soft hover:underline"
          >
            Infos bearbeiten →
          </Link>
        </div>
      )}

      {/* Kopf */}
      <section className="relative isolate overflow-hidden rounded-box bg-brand-fg p-6 text-white sm:p-10">
        <div
          aria-hidden="true"
          className="absolute -top-32 -right-24 -z-10 size-96 rounded-full bg-brand opacity-20 blur-3xl"
        />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <StudioLogo
            name={s.name}
            logoUrl={s.logoUrl}
            size="xl"
            className="bg-white ring-white/20"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              {s.name}
            </h1>
            {s.address.city && (
              <p className="mt-1 flex items-center gap-1.5 text-white/65">
                <Icon name="building" className="size-4" /> {s.address.city}
              </p>
            )}
            {status && (
              <p
                className={cx(
                  "mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold",
                  status.open
                    ? "bg-brand text-brand-fg"
                    : "bg-white/10 text-white ring-1 ring-white/20",
                )}
              >
                <span
                  className={cx(
                    "size-2 rounded-full",
                    status.open
                      ? "bg-brand-fg motion-safe:animate-pulse"
                      : "bg-white/50",
                  )}
                />
                {status.text}
              </p>
            )}
          </div>
        </div>
        {s.description && (
          <p className="mt-6 max-w-3xl leading-relaxed whitespace-pre-line text-white/80">
            {s.description}
          </p>
        )}
        {bookable.length > 0 && (
          <a
            href="#trainer-termine"
            className="mt-6 inline-flex items-center gap-2 rounded-control bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg transition hover:bg-brand-hover"
          >
            <Icon name="calendar" className="size-4" /> Termin bei einem Trainer
            anfragen
          </a>
        )}
      </section>

      {empty ? (
        <EmptyState
          title="Noch keine Infos hinterlegt"
          text={
            isOwner
              ? "Ergänze Öffnungszeiten, Adresse und Ausstattung – deine Kunden sehen sie hier."
              : "Das Studio hat noch keine weiteren Infos hinterlegt."
          }
          action={
            isOwner ? (
              <Link
                href="/dashboard#studio-profil"
                className="text-sm font-semibold text-brand-ink hover:underline"
              >
                Infos ergänzen →
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {s.amenities.length > 0 && (
              <Card>
                <h2 className="font-semibold text-fg">Ausstattung</h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {s.amenities.map((a) => (
                    <li
                      key={a}
                      className="flex items-center gap-1.5 rounded-full bg-brand/30 px-3 py-1.5 text-sm font-medium text-brand-ink"
                    >
                      <Icon name="check" className="size-3.5" /> {a}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {(s.trainers.length > 0 || s.staff.length > 0) && (
              <Card>
                <h2 className="font-semibold text-fg">Unser Team</h2>
                <p className="mt-1 text-sm text-fg-muted">
                  Fällt ein Coach aus, übernimmt jemand aus dem Team.
                </p>
                {(
                  [
                    [
                      "Leitung",
                      s.staff.filter((m) => m.category === "management"),
                    ],
                    [
                      "Trainer",
                      s.trainers.map((t) => ({
                        id: t.id,
                        name: t.name,
                        photoUrl: t.avatarUrl,
                        position:
                          t.id === me.trainer?.id
                            ? "Dein Coach"
                            : t.id === me.user.id
                              ? "Du"
                              : "Coach",
                        bio: null,
                      })),
                    ],
                    [
                      "Service & Empfang",
                      s.staff.filter((m) => m.category === "service"),
                    ],
                    ["Weitere", s.staff.filter((m) => m.category === "other")],
                  ] as const
                )
                  .filter(([, people]) => people.length > 0)
                  .map(([group, people]) => (
                    <div key={group} className="mt-6">
                      <h3 className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">
                        {group}
                      </h3>
                      <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {people.map((p) => (
                          <li
                            key={p.id}
                            className="flex flex-col items-center rounded-tile bg-surface-2 p-4 text-center"
                          >
                            <Avatar name={p.name} src={p.photoUrl} size="2xl" />
                            <p className="mt-3 text-sm font-semibold text-fg">
                              {p.name}
                            </p>
                            {p.position && (
                              <p className="text-xs text-fg-subtle">
                                {p.position}
                              </p>
                            )}
                            {p.bio && (
                              <p className="mt-2 text-xs text-fg-muted">
                                {p.bio}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {s.openingHours.length > 0 && (
              <Card>
                <h2 className="font-semibold text-fg">Öffnungszeiten</h2>
                <ul className="mt-4 space-y-1 text-sm">
                  {WEEKDAYS.map((name, day) => {
                    const h = s.openingHours.find((x) => x.day === day);
                    const isToday = day === today;
                    return (
                      <li
                        key={day}
                        className={cx(
                          "flex justify-between rounded-inner px-3 py-1.5",
                          isToday
                            ? "bg-brand font-semibold text-brand-fg"
                            : "text-fg-muted",
                        )}
                      >
                        <span>
                          {name}
                          {isToday && " · heute"}
                        </span>
                        <span className="tabular-nums">
                          {!h
                            ? "–"
                            : h.closed
                              ? "geschlossen"
                              : `${h.open} – ${h.close}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}

            {hasContact && (
              <Card>
                <h2 className="font-semibold text-fg">Kontakt</h2>
                <div className="mt-4 grid gap-2">
                  {address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name}, ${address}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 rounded-tile px-3 py-2 text-sm text-fg ring-1 ring-line transition hover:bg-surface-2"
                    >
                      <Icon
                        name="building"
                        className="mt-0.5 size-4 shrink-0 text-brand-ink"
                      />
                      <span>
                        {s.address.street && (
                          <span className="block">{s.address.street}</span>
                        )}
                        <span className="block">
                          {[s.address.postalCode, s.address.city]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                        <span className="mt-1 block text-xs font-semibold text-brand-ink">
                          In Google Maps öffnen →
                        </span>
                      </span>
                    </a>
                  )}
                  {s.contact.phone && (
                    <ContactLink
                      href={`tel:${s.contact.phone.replace(/[^\d+]/g, "")}`}
                      icon="phone"
                      label={s.contact.phone}
                    />
                  )}
                  {s.contact.email && (
                    <ContactLink
                      href={`mailto:${s.contact.email}`}
                      icon="mail"
                      label={s.contact.email}
                    />
                  )}
                  {s.contact.website && (
                    <ContactLink
                      href={s.contact.website}
                      icon="arrow"
                      label={s.contact.website
                        .replace(/^https?:\/\//, "")
                        .replace(/\/$/, "")}
                      external
                    />
                  )}
                  {s.contact.instagram && (
                    <ContactLink
                      href={`https://instagram.com/${s.contact.instagram}`}
                      icon="camera"
                      label={`@${s.contact.instagram}`}
                      external
                    />
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {bookable.length > 0 && (
        <section id="trainer-termine" className="scroll-mt-24">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-fg">
                Freie Termine bei unseren Trainern
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                Wähle einen Trainer – er bestätigt deine Anfrage persönlich.
              </p>
            </div>
            <Link
              href="/dashboard#termine"
              className="text-sm font-semibold text-brand-ink hover:underline"
            >
              Meine Termine →
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {bookable.map((p) => (
              <li key={p.trainerId}>
                <button
                  type="button"
                  onClick={() => setBookingFor(p.trainerId)}
                  className="group flex h-full w-full flex-col rounded-box bg-surface p-5 text-left ring-1 ring-line transition hover:ring-brand-ink"
                >
                  <span className="flex items-center gap-3">
                    <Avatar name={p.name} src={p.avatarUrl} size="xl" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-fg">
                        {p.name}
                      </span>
                      {p.ownCoach && (
                        <span className="text-xs font-semibold text-brand-ink">
                          Dein Coach
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="mt-4 flex flex-wrap gap-1.5">
                    {p.services.map((x) => (
                      <span
                        key={x.id}
                        className="rounded-full bg-surface-3 px-2.5 py-1 text-xs font-medium text-fg-muted"
                      >
                        {x.title}
                      </span>
                    ))}
                  </span>
                  <span className="mt-auto flex items-center justify-between gap-2 pt-5 text-sm">
                    <span className={p.nextFree ? "text-fg" : "text-fg-subtle"}>
                      {p.nextFree ? (
                        <>
                          <span className="text-fg-muted">
                            Nächster freier Termin
                          </span>
                          <span className="block font-semibold">
                            {nextFreeLabel(p.nextFree)}
                          </span>
                        </>
                      ) : (
                        "Gerade ausgebucht"
                      )}
                    </span>
                    <span className="grid size-9 shrink-0 place-items-center rounded-control bg-brand text-brand-fg transition group-hover:translate-x-0.5">
                      <Icon name="arrow" className="size-4" />
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <StudioCourseList canBook={me.user.role === "client"} />
      {bookingFor && (
        <BookingDialog
          providers={bookable}
          initialTrainerId={bookingFor}
          onClose={() => setBookingFor(null)}
          onBooked={booking.reload}
        />
      )}
    </div>
  );
}

function ContactLink({
  href,
  icon,
  label,
  external,
}: {
  href: string;
  icon: IconName;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex items-center gap-3 rounded-tile px-3 py-2 text-sm font-medium text-fg ring-1 ring-line transition hover:bg-surface-2"
    >
      <Icon name={icon} className="size-4 shrink-0 text-brand-ink" />
      <span className="truncate">{label}</span>
    </a>
  );
}
