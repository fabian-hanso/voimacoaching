"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Badge, Button, cx, Input } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useApi } from "@/lib/client/api";
import {
  EXERCISE_CATALOG,
  findExercise,
  type CatalogExercise,
} from "@/lib/exercises";
import type { ExerciseGuide } from "@/lib/exercise-guide";
import { Modal, ModalHeader } from "./modal";

/* ------------------------------------------------------------------ */
/* Anleitungen laden (rollenabhängig vom Server)                       */
/* ------------------------------------------------------------------ */

const GuidesContext = createContext<Map<string, ExerciseGuide>>(new Map());

/**
 * Lädt die Anleitungen einmal fürs Dashboard. Der Server entscheidet, welche:
 * Trainer und Studios alle, Kunden nur die Übungen aus ihren zugewiesenen Plänen.
 */
export function ExerciseGuidesProvider({ children }: { children: ReactNode }) {
  const { data } = useApi<{ guides: Record<string, ExerciseGuide> }>(
    "/exercises/guides",
  );
  const map = useMemo(
    () =>
      new Map(
        Object.entries(data?.guides ?? {}).map(([name, g]) => [
          name.trim().toLowerCase(),
          g,
        ]),
      ),
    [data],
  );
  return (
    <GuidesContext.Provider value={map}>{children}</GuidesContext.Provider>
  );
}

/** Anleitung zu einem Übungsnamen (Groß-/Kleinschreibung egal), sonst `undefined`. */
function useFindGuide() {
  const map = useContext(GuidesContext);
  return useCallback(
    (name: string) => map.get(name.trim().toLowerCase()),
    [map],
  );
}

/* ------------------------------------------------------------------ */
/* Erklärung einer Übung                                               */
/* ------------------------------------------------------------------ */

/**
 * Erklärung als Modal: Katalog-Anleitung (falls vorhanden) plus persönlicher Hinweis des Trainers.
 * `note` = Hinweis aus dem Plan, `noteAuthor` = wer ihn geschrieben hat (für die Überschrift).
 */
export function ExerciseGuideModal({
  name,
  note,
  noteAuthor,
  onClose,
}: {
  name: string;
  note?: string | null;
  noteAuthor?: string | null;
  onClose: () => void;
}) {
  const guide = useFindGuide()(name);
  const known = findExercise(name);
  return (
    <Modal label={`Übung ${name}`} onClose={onClose} wide>
      <ModalHeader
        title={name}
        subtitle={guide?.summary ?? known?.category}
        onClose={onClose}
      />

      {note && (
        <div className="mt-5 rounded-tile bg-brand/30 p-4 ring-1 ring-brand-fg/10 ring-inset">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-fg uppercase">
            <Icon name="chat" className="size-3.5" />{" "}
            {noteAuthor
              ? `Hinweis von ${noteAuthor}`
              : "Hinweis deines Coaches"}
          </p>
          <p className="mt-1.5 text-sm whitespace-pre-line text-fg">{note}</p>
        </div>
      )}

      {guide ? (
        <>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-tile bg-surface-2 p-3 sm:col-span-2">
              <dt className="text-xs text-fg-subtle">Muskeln</dt>
              <dd className="mt-0.5 font-medium text-fg">
                {guide.muscles.join(", ")}
              </dd>
            </div>
            <div className="rounded-tile bg-surface-2 p-3">
              <dt className="text-xs text-fg-subtle">Niveau</dt>
              <dd className="mt-0.5 font-medium text-fg">{guide.level}</dd>
            </div>
            <div className="rounded-tile bg-surface-2 p-3 sm:col-span-3">
              <dt className="text-xs text-fg-subtle">Equipment</dt>
              <dd className="mt-0.5 font-medium text-fg">{guide.equipment}</dd>
            </div>
          </dl>

          <h3 className="mt-6 font-semibold text-fg">So geht’s</h3>
          <ol className="mt-3 space-y-3">
            {guide.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-fg">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-fg text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>

          {guide.tips.length > 0 && (
            <>
              <h3 className="mt-6 font-semibold text-fg">Darauf achten</h3>
              <ul className="mt-3 space-y-2">
                {guide.tips.map((t, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-fg-muted">
                    <Icon
                      name="alert"
                      className="mt-0.5 size-4 shrink-0 text-accent-soft"
                    />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="mt-6 text-xs text-fg-subtle">
            Allgemeine Anleitung – ersetzt keine persönliche Einweisung. Bei
            Schmerzen abbrechen und mit deinem Coach sprechen.
          </p>
        </>
      ) : (
        !note && (
          <p className="mt-5 rounded-tile bg-surface-2 p-4 text-sm text-fg-muted">
            Zu dieser Übung gibt es noch keine Erklärung im Katalog. Frag am
            besten deinen Coach.
          </p>
        )
      )}
    </Modal>
  );
}

/** Kleiner „Erklären“-Button – erscheint nur, wenn es eine Katalog-Erklärung oder einen Hinweis gibt. */
export function ExplainButton({
  name,
  note,
  noteAuthor,
  label = false,
  className,
}: {
  name: string;
  note?: string | null;
  noteAuthor?: string | null;
  /** true: mit Text „Erklärung“, sonst nur Icon */
  label?: boolean;
  className?: string;
}) {
  const findGuide = useFindGuide();
  const [open, setOpen] = useState(false);
  if (!name.trim() || (!findGuide(name) && !note)) return null;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`${name} erklären`}
        title="Übung erklären"
        className={cx(
          "inline-flex shrink-0 items-center gap-1 rounded-control text-fg-subtle transition hover:bg-surface-3 hover:text-fg",
          label ? "px-2 py-1 text-xs font-semibold" : "size-7 justify-center",
          className,
        )}
      >
        <Icon name="info" className="size-4" />
        {label && "Erklärung"}
        {note && (
          <span
            className="size-1.5 rounded-full bg-accent"
            aria-hidden="true"
          />
        )}
      </button>
      {open && (
        <ExerciseGuideModal
          name={name}
          note={note}
          noteAuthor={noteAuthor}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Katalog durchsuchen                                                 */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  "Alle",
  ...Array.from(new Set(EXERCISE_CATALOG.map((e) => e.category))),
];

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Durchsuchbarer Übungskatalog. Ohne `onPick` nur zum Nachschlagen (Klick öffnet die Erklärung),
 * mit `onPick` zusätzlich „Hinzufügen“ je Übung (Plan-Editor).
 */
export function ExerciseCatalog({
  onPick,
}: {
  onPick?: (e: CatalogExercise) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Alle");
  const [open, setOpen] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, number>>({});
  const findGuide = useFindGuide();

  const list = useMemo(() => {
    const q = normalize(query.trim());
    return EXERCISE_CATALOG.filter((e) => {
      if (category !== "Alle" && e.category !== category) return false;
      if (!q) return true;
      const g = findGuide(e.name);
      return normalize(
        [e.name, e.category, ...(g?.muscles ?? []), g?.equipment ?? ""].join(
          " ",
        ),
      ).includes(q);
    });
  }, [query, category, findGuide]);

  return (
    <div>
      <div className="relative">
        <Icon
          name="search"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen: Übung, Muskel oder Gerät …"
          className="pl-9"
          aria-label="Übungen durchsuchen"
        />
      </div>
      <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto p-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cx(
              "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition",
              category === c
                ? "bg-brand-fg text-white ring-brand-fg"
                : "text-fg-muted ring-line-strong hover:bg-surface-2 hover:text-fg",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="mt-6 rounded-tile border border-dashed border-line-strong px-4 py-8 text-center text-sm text-fg-muted">
          Keine Übung gefunden.{" "}
          {onPick && "Du kannst sie trotzdem frei im Plan eintragen."}
        </p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {list.map((e) => {
            const g = findGuide(e.name);
            const count = added[e.name] ?? 0;
            return (
              <li
                key={e.name}
                className="group relative flex items-center gap-2 rounded-tile bg-surface-2 p-1 pr-2 ring-1 ring-line transition hover:bg-surface-3 hover:ring-line-strong"
              >
                {/* Die ganze Kachel öffnet die Erklärung (Klickfläche per ::after), „Hinzufügen“ liegt darüber */}
                <button
                  type="button"
                  onClick={() => setOpen(e.name)}
                  aria-label={`${e.name} erklären`}
                  className="flex min-w-0 flex-1 flex-col items-start px-2.5 py-2 text-left after:absolute after:inset-0 after:rounded-tile after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand-ink"
                >
                  <span className="flex items-center gap-2 font-semibold text-fg">
                    {e.name}
                    {g?.level === "Fortgeschritten" && (
                      <Badge>Fortgeschritten</Badge>
                    )}
                  </span>
                  <span className="mt-0.5 line-clamp-1 text-xs text-fg-muted">
                    {g ? g.muscles.slice(0, 3).join(" · ") : e.category}
                  </span>
                </button>
                {onPick ? (
                  <button
                    type="button"
                    onClick={() => {
                      onPick(e);
                      setAdded((a) => ({
                        ...a,
                        [e.name]: (a[e.name] ?? 0) + 1,
                      }));
                    }}
                    className={cx(
                      "relative z-10 inline-flex shrink-0 items-center gap-1 rounded-control px-3 py-2 text-sm font-semibold transition",
                      count
                        ? "bg-brand text-brand-fg hover:bg-brand-hover"
                        : "bg-surface text-fg ring-1 ring-line-strong hover:ring-fg-subtle",
                    )}
                  >
                    <Icon name={count ? "check" : "plus"} className="size-4" />
                    {count ? (count > 1 ? `${count}×` : "Drin") : "Hinzufügen"}
                  </button>
                ) : (
                  <Icon
                    name="info"
                    className="size-4 shrink-0 text-fg-subtle transition group-hover:text-fg"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      {open && <ExerciseGuideModal name={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** Katalog als Auswahl-Dialog (Plan-Editor: Übungen zu einem Trainingstag hinzufügen). */
export function ExerciseCatalogModal({
  dayName,
  onPick,
  onClose,
}: {
  dayName: string;
  onPick: (e: CatalogExercise) => void;
  onClose: () => void;
}) {
  return (
    <Modal label="Übungskatalog" onClose={onClose} wide>
      <ModalHeader
        title="Übungen aus dem Katalog"
        subtitle={`Zu „${dayName}“ hinzufügen – Erklärungen sehen deine Kunden automatisch.`}
        onClose={onClose}
      />
      <div className="mt-5">
        <ExerciseCatalog onPick={onPick} />
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={onClose}>Fertig</Button>
      </div>
    </Modal>
  );
}
