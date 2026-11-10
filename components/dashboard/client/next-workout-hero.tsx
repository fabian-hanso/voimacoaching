"use client";

import { Icon } from "@/components/icons";
import trainingImage from "@/public/images/dashboard-training.jpg";
import Image from "next/image";
import { DayRef, estimateMinutes } from "./utils";

export function NextWorkoutHero({
  next,
  onStart,
}: {
  next: DayRef;
  onStart: () => void;
}) {
  const { plan, day, index } = next;
  const minutes = estimateMinutes(day);
  const shown = day.exercises.slice(0, 5);
  return (
    <div className="relative isolate h-full overflow-hidden rounded-box bg-brand-fg p-6 text-white shadow-xl sm:p-8">
      {/* Hintergrund: Gym-Foto unter einer dunklen Ebene – links dichter für den Text, rechts lichter fürs Foto */}
      <Image
        src={trainingImage}
        alt=""
        fill
        placeholder="blur"
        sizes="(min-width: 1024px) 66vw, 100vw"
        className="-z-20 object-cover object-right"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-r from-brand-fg/85 from-20% via-brand-fg/65 to-brand-fg/40"
      />

      <p className="text-sm font-medium text-white/70">
        Nächstes Training · {plan.title}
      </p>
      <h3 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
        {day.name}
      </h3>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
        <span className="flex items-center gap-1.5">
          <Icon name="list" className="size-4 text-brand" />{" "}
          {day.exercises.length} Übungen
        </span>
        {minutes > 0 && (
          <span className="flex items-center gap-1.5">
            <Icon name="clock" className="size-4 text-brand" /> ca. {minutes}{" "}
            min
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Icon name="calendar" className="size-4 text-brand" /> Tag {index + 1}{" "}
          von {plan.days.length}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {shown.length === 0 ? (
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm backdrop-blur-sm">
            Noch keine Übungen – du kannst beim Training welche hinzufügen
          </span>
        ) : (
          shown.map((e, i) => (
            <span
              key={i}
              className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium ring-1 ring-white/15 backdrop-blur-sm ring-inset"
            >
              {e.name}
            </span>
          ))
        )}
        {day.exercises.length > shown.length && (
          <span className="rounded-full px-3 py-1 text-sm text-white/70">
            +{day.exercises.length - shown.length} weitere
          </span>
        )}
      </div>

      <button
        onClick={onStart}
        className="mt-8 inline-flex items-center gap-2 rounded-control bg-brand px-6 py-3.5 font-semibold text-brand-fg shadow-sm transition hover:bg-brand-hover focus:ring-2 focus:ring-brand/50 focus:ring-offset-2 focus:ring-offset-brand-fg focus:outline-none"
      >
        <Icon name="play" className="size-4" /> Training starten
      </button>
    </div>
  );
}
