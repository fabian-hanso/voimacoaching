"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cx } from "../ui";
import { Icon, type IconName } from "../icons";

/* ================================================================== */
/* Inhalt: 12 Features, erzählt als Chat zwischen Coach und Kundin     */
/* ================================================================== */

type Sender = "coach" | "client";
type CardKind =
  | "invite"
  | "photo"
  | "plan"
  | "log"
  | "cardio"
  | "pr"
  | "progress"
  | "measure"
  | "status"
  | "chat"
  | "apps"
  | "privacy";

interface Msg {
  from: Sender;
  text?: string;
  card?: CardKind;
}

interface Chapter {
  id: string;
  feature: string;
  description: string;
  icon: IconName;
  achievement: string;
  /** Kleiner Hinweis über dem Kapitel, z. B. „Trainer-Ansicht“ */
  aside?: string;
  messages: Msg[];
}

const CHAPTERS: Chapter[] = [
  {
    id: "einladung",
    feature: "Einladung per Link oder Code",
    description: "Trainer laden Kunden mit einem Link oder 8-stelligen Code ein – verknüpft in Sekunden.",
    icon: "mail",
    achievement: "Team gebildet",
    messages: [
      { from: "coach", text: "Hey Lena! 👋 Hier ist deine Einladung zu Voima Coach:" },
      { from: "coach", card: "invite" },
      { from: "client", text: "Bin drin! Das ging ja schnell 😄" },
    ],
  },
  {
    id: "profil",
    feature: "Profil mit Foto",
    description: "Trainer und Kunden hinterlegen ein Profilbild – Gesichter merkt man sich besser als Namen.",
    icon: "camera",
    achievement: "Gesicht zeigen",
    messages: [
      { from: "client", text: "Hab gleich ein Profilbild hochgeladen, damit du mich erkennst." },
      { from: "client", card: "photo" },
      { from: "coach", text: "Perfekt – jetzt sehe ich dich auch in meiner Kundenliste." },
    ],
  },
  {
    id: "plan",
    feature: "Trainingspläne für Kraft & Ausdauer",
    description: "Pläne mit Trainingstagen, Sätzen, Wiederholungen, Gewicht – und Ausdauer wie Laufband oder Rad.",
    icon: "list",
    achievement: "Plan-Profi",
    messages: [
      { from: "coach", text: "Dein Plan für die nächsten Wochen ist da:" },
      { from: "coach", card: "plan" },
      { from: "client", text: "Sogar mit Laufband-Einheiten 🔥 Los geht's!" },
    ],
  },
  {
    id: "logging",
    feature: "Workouts loggen",
    description: "Kunden haken Sätze direkt ab, passen Wiederholungen und Gewichte an – auch ohne Plan möglich.",
    icon: "dumbbell",
    achievement: "Erstes Workout",
    messages: [
      { from: "client", text: "Unterkörper A erledigt! Alles direkt in der App abgehakt ✅" },
      { from: "client", card: "log" },
      { from: "coach", text: "Stark! Dein Trainingsvolumen ist schon deutlich gestiegen." },
    ],
  },
  {
    id: "ausdauer",
    feature: "Ausdauer-Tracking",
    description: "Laufband, Rad, Rudergerät & Co.: Dauer, Distanz, Steigung, Watt und Puls – je nach Gerät.",
    icon: "heart",
    achievement: "Ausdauer-Ass",
    messages: [
      { from: "client", text: "Danach noch 20 Minuten aufs Laufband:" },
      { from: "client", card: "cardio" },
      { from: "coach", text: "Zone 2 perfekt getroffen 👌" },
    ],
  },
  {
    id: "bestwerte",
    feature: "Automatische Bestwerte",
    description: "Neue Rekorde werden automatisch erkannt – für Kraftübungen und Ausdauer.",
    icon: "trophy",
    achievement: "Rekordjagd",
    messages: [
      { from: "client", card: "pr" },
      { from: "client", text: "WAS?! 😱 Neuer Bestwert bei der Kniebeuge!" },
      { from: "coach", text: "Hab's direkt gesehen – Glückwunsch, verdient! 🎉" },
    ],
  },
  {
    id: "fortschritt",
    feature: "Fortschritt & Streaks",
    description: "Wochenvolumen, Ausdauerminuten und Trainings-Streaks – für Kunde und Trainer sichtbar.",
    icon: "flame",
    achievement: "Durchstarter",
    messages: [
      { from: "coach", text: "Wirf mal einen Blick auf deine Fortschrittsseite:" },
      { from: "coach", card: "progress" },
      { from: "client", text: "6 Wochen am Stück – ich bleib dran! 💪" },
    ],
  },
  {
    id: "messwerte",
    feature: "Messwerte",
    description: "Körpergewicht, Körperfett und Taillenumfang erfassen und als Verlauf ansehen.",
    icon: "scale",
    achievement: "Messbar besser",
    messages: [
      { from: "client", text: "Und auf der Waage tut sich auch was:" },
      { from: "client", card: "measure" },
      { from: "coach", text: "Genau so soll es sein. Weiter so!" },
    ],
  },
  {
    id: "kundenstatus",
    feature: "Kundenübersicht mit Status",
    description: "Trainer sehen auf einen Blick, wer aktiv, inaktiv, neu angemeldet oder noch eingeladen ist.",
    icon: "users",
    achievement: "Voller Überblick",
    aside: "Währenddessen in der Trainer-Ansicht …",
    messages: [
      { from: "coach", card: "status" },
      { from: "coach", text: "So sehe ich sofort, wen ich mal wieder anschreiben sollte 😉" },
    ],
  },
  {
    id: "chat",
    feature: "Echtzeit-Chat",
    description: "Private Nachrichten zwischen Coach und Kunde – live, mit Lesebestätigung.",
    icon: "chat",
    achievement: "Immer erreichbar",
    messages: [
      { from: "client", text: "Kurze Frage: Wie weit darf das Knie beim Split Squat nach vorn?" },
      { from: "coach", text: "Etwas nach vorn ist okay – Hauptsache, es bleibt über dem Fuß 👍" },
      { from: "coach", card: "chat" },
    ],
  },
  {
    id: "apps",
    feature: "Web & Apps",
    description: "Trainer planen bequem im Browser, Kunden trainieren mit dem Handy – alles synchron über eine API.",
    icon: "phone",
    achievement: "Überall dabei",
    messages: [
      { from: "coach", text: "Ich plane am Laptop, du trainierst mit dem Handy – alles bleibt synchron." },
      { from: "coach", card: "apps" },
    ],
  },
  {
    id: "datenschutz",
    feature: "Datenschutz & Kontrolle",
    description: "Kunden können die Verbindung trennen oder ihr Konto selbst vollständig löschen.",
    icon: "shield",
    achievement: "Sicher unterwegs",
    messages: [
      { from: "client", text: "Und falls ich irgendwann aufhöre?" },
      { from: "coach", text: "Dann löschst du dein Konto selbst – vollständig. Ich bekomme nur einen kurzen Hinweis." },
      { from: "coach", card: "privacy" },
    ],
  },
];

const XP_PER_FEATURE = 100;
const XP_PER_LEVEL = 200;
const MAX_XP = CHAPTERS.length * XP_PER_FEATURE;
const levelOf = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1;

/* ================================================================== */
/* Hauptkomponente                                                     */
/* ================================================================== */

type MsgState = "hidden" | "typing" | "shown";
interface Toast {
  id: number;
  title: string;
  icon: IconName;
  levelUp?: number;
}

export function FeatureTour() {
  // Alle Nachrichten flach mit Index, damit sie der Reihe nach erscheinen
  const flat = useMemo(
    () => CHAPTERS.flatMap((c, ci) => c.messages.map((m, mi) => ({ ...m, key: `${c.id}-${mi}`, chapter: ci }))),
    [],
  );
  const [states, setStates] = useState<Record<string, MsgState>>({});
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const reducedMotion = useReducedMotion();
  const nodes = useRef(new Map<string, HTMLElement>());
  const queue = useRef<string[]>([]);
  const busy = useRef(false);
  const unlockedRef = useRef(new Set<string>());

  // Achievement freischalten, sobald die letzte Nachricht eines Kapitels erscheint (läuft im Timer, nicht beim Rendern)
  const unlockIfChapterDone = useCallback(
    (key: string) => {
      const chapter = CHAPTERS.find((c) => key === `${c.id}-${c.messages.length - 1}`);
      if (!chapter || unlockedRef.current.has(chapter.id)) return;
      const before = levelOf(unlockedRef.current.size * XP_PER_FEATURE);
      unlockedRef.current.add(chapter.id);
      const after = levelOf(unlockedRef.current.size * XP_PER_FEATURE);
      setUnlocked(new Set(unlockedRef.current));
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-2), { id, title: chapter.achievement, icon: chapter.icon, levelUp: after > before ? after : undefined }]);
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
    },
    [],
  );

  const xp = unlocked.size * XP_PER_FEATURE;
  const level = levelOf(xp);
  const complete = unlocked.size === CHAPTERS.length;

  // Nachrichten nacheinander zeigen: erst „tippt …“, dann die Nachricht
  // Warteschlange abarbeiten. Als Ref, damit sich die Funktion selbst erneut anstoßen kann.
  const pumpRef = useRef<() => void>(() => {});
  useEffect(() => {
    const pump = () => {
      if (busy.current) return;
      const key = queue.current.shift();
      if (!key) return;
      if (reducedMotion) {
        setStates((s) => ({ ...s, [key]: "shown" }));
        unlockIfChapterDone(key);
        pump();
        return;
      }
      busy.current = true;
      const msg = flat.find((m) => m.key === key);
      setStates((s) => ({ ...s, [key]: "typing" }));
      const delay = msg?.card ? 650 : msg?.from === "client" ? 450 : 750;
      window.setTimeout(() => {
        setStates((s) => ({ ...s, [key]: "shown" }));
        unlockIfChapterDone(key);
        busy.current = false;
        window.setTimeout(pump, 120);
      }, delay);
    };
    pumpRef.current = pump;
    pump(); // falls während eines Wechsels (z. B. reduced motion) schon etwas wartet
  }, [flat, reducedMotion, unlockIfChapterDone]);

  // Sichtbar gescrollte Nachrichten (und alle davor) in die Warteschlange
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        let maxIndex = -1;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = Number((e.target as HTMLElement).dataset.index);
          maxIndex = Math.max(maxIndex, i);
        }
        if (maxIndex < 0) return;
        for (let i = 0; i <= maxIndex; i++) {
          const key = flat[i].key;
          if (!queue.current.includes(key) && !(nodes.current.get(key)?.dataset.seen === "1")) {
            nodes.current.get(key)?.setAttribute("data-seen", "1");
            queue.current.push(key);
          }
        }
        pumpRef.current();
      },
      { rootMargin: "0px 0px -18% 0px", threshold: 0.4 },
    );
    nodes.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [flat]);

  const register = (key: string, index: number) => (el: HTMLElement | null) => {
    if (!el) return;
    el.dataset.index = String(index);
    nodes.current.set(key, el);
  };

  let flatIndex = 0;

  return (
    <>
      <Hud xp={xp} level={level} unlocked={unlocked} />

      <div className="mx-auto max-w-2xl px-4 pb-24 sm:px-6">
        {/* Start */}
        <div className="flex flex-col items-center pt-10 pb-6 text-center">
          <div className="flex -space-x-3">
            <ChatAvatar from="coach" size="lg" />
            <ChatAvatar from="client" size="lg" />
          </div>
          <p className="mt-3 text-sm font-semibold text-fg">Coach Marco & Lena</p>
          <p className="text-xs text-fg-subtle">Ein ganz normaler Trainingsmonat mit Voima Coach</p>
          <p className="mt-6 flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-xs font-medium text-fg-muted ring-1 ring-line">
            <span className="motion-safe:animate-bounce">↓</span> Scroll, um die Unterhaltung zu starten
          </p>
        </div>

        {CHAPTERS.map((c, ci) => {
          const done = unlocked.has(c.id);
          return (
            <section key={c.id} aria-labelledby={`feature-${c.id}`} className="pt-10">
              {/* Kapitel-Marker */}
              <div className="flex flex-col items-center text-center">
                <span
                  className={cx(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 transition-colors",
                    done ? "bg-brand text-brand-fg ring-brand" : "bg-surface text-fg-muted ring-line",
                  )}
                >
                  <Icon name={done ? "check" : c.icon} className="size-3.5" />
                  Feature {ci + 1}/{CHAPTERS.length}
                </span>
                <h2 id={`feature-${c.id}`} className="mt-3 text-xl font-extrabold tracking-tight text-fg sm:text-2xl">
                  {c.feature}
                </h2>
                <p className="mt-1 max-w-md text-sm text-fg-muted">{c.description}</p>
                {c.aside && <p className="mt-4 text-xs font-medium text-accent-soft italic">{c.aside}</p>}
              </div>

              {/* Nachrichten */}
              <div className="mt-6 space-y-2">
                {c.messages.map((m, mi) => {
                  const key = `${c.id}-${mi}`;
                  const index = flatIndex++;
                  const prev = c.messages[mi - 1];
                  return (
                    <MessageRow
                      key={key}
                      ref={register(key, index)}
                      msg={m}
                      state={states[key] ?? "hidden"}
                      showAvatar={!prev || prev.from !== m.from}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}

        <Finale complete={complete} level={level} xp={xp} />
      </div>

      <Toasts toasts={toasts} />
    </>
  );
}

/* ================================================================== */
/* HUD: XP-Leiste, Level, Abzeichen                                    */
/* ================================================================== */

function Hud({ xp, level, unlocked }: { xp: number; level: number; unlocked: Set<string> }) {
  const pct = (xp / MAX_XP) * 100;
  return (
    <div className="sticky top-16 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-2">
          <span
            key={level}
            className="grid size-9 place-items-center rounded-control bg-brand-fg text-sm font-extrabold text-brand motion-safe:animate-pop"
            aria-label={`Level ${level}`}
          >
            {level}
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="text-xs font-semibold text-fg">Feature-Tour</p>
            <p className="text-[11px] text-fg-subtle">Level {level}</p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div
            className="h-2.5 overflow-hidden rounded-full bg-surface-3"
            role="progressbar"
            aria-label="Entdeckte Features"
            aria-valuemin={0}
            aria-valuemax={CHAPTERS.length}
            aria-valuenow={unlocked.size}
          >
            <div className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 flex justify-between text-[11px] text-fg-subtle">
            <span>
              {unlocked.size}/{CHAPTERS.length} Features entdeckt
            </span>
            <span className="font-semibold text-fg tabular-nums">{xp} XP</span>
          </p>
        </div>

        <ul className="hidden shrink-0 items-center gap-1 lg:flex" aria-label="Abzeichen">
          {CHAPTERS.map((c) => {
            const on = unlocked.has(c.id);
            return (
              <li key={c.id} title={on ? `${c.achievement} – freigeschaltet` : "Noch nicht entdeckt"}>
                <span
                  className={cx(
                    "grid size-7 place-items-center rounded-full transition-colors",
                    on ? "bg-brand text-brand-fg motion-safe:animate-pop" : "bg-surface-3 text-fg-subtle/60",
                  )}
                >
                  <Icon name={on ? c.icon : "lock"} className="size-3.5" />
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Nachrichten                                                         */
/* ================================================================== */

function ChatAvatar({ from, size = "sm" }: { from: Sender; size?: "sm" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "grid shrink-0 place-items-center rounded-full font-bold ring-2 ring-bg",
        size === "lg" ? "size-12 text-base" : "size-8 text-xs",
        from === "coach" ? "bg-accent text-accent-fg" : "bg-brand text-brand-fg",
      )}
    >
      {from === "coach" ? "M" : "L"}
    </span>
  );
}

function MessageRow({
  ref,
  msg,
  state,
  showAvatar,
}: {
  ref: (el: HTMLElement | null) => void;
  msg: Msg;
  state: MsgState;
  showAvatar: boolean;
}) {
  const mine = msg.from === "client"; // Perspektive: Lena (rechts, Lime) – wie in der App
  return (
    <div ref={ref} className={cx("relative flex items-end gap-2", mine ? "flex-row-reverse" : "flex-row")}>
      <div className="w-8 shrink-0">{showAvatar && state !== "hidden" && <ChatAvatar from={msg.from} />}</div>

      <div className={cx("relative max-w-[85%] sm:max-w-[75%]", msg.card && "w-full sm:w-auto sm:min-w-80")}>
        {/* Platz bleibt reserviert, damit beim Erscheinen nichts springt */}
        <div
          className={cx(state === "shown" ? "motion-safe:animate-msg-in" : "invisible")}
          aria-hidden={state !== "shown"}
        >
          {msg.card ? <RichCard kind={msg.card} mine={mine} /> : <Bubble mine={mine}>{msg.text}</Bubble>}
        </div>
        {state === "typing" && (
          <div className={cx("absolute bottom-0", mine ? "right-0" : "left-0")}>
            <TypingBubble mine={mine} />
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({ mine, children }: { mine: boolean; children: ReactNode }) {
  return (
    <p
      className={cx(
        "rounded-tile px-4 py-2.5 text-[15px] leading-snug shadow-sm",
        mine ? "rounded-br-md bg-brand text-brand-fg" : "rounded-bl-md bg-surface text-fg ring-1 ring-line",
      )}
    >
      {children}
    </p>
  );
}

function TypingBubble({ mine }: { mine: boolean }) {
  return (
    <div
      role="status"
      aria-label="schreibt …"
      className={cx(
        "flex items-center gap-1 rounded-tile px-4 py-3",
        mine ? "rounded-br-md bg-brand" : "rounded-bl-md bg-surface ring-1 ring-line",
      )}
    >
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className={cx("size-1.5 rounded-full motion-safe:animate-typing", mine ? "bg-brand-fg" : "bg-fg-subtle")}
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </div>
  );
}

/* ================================================================== */
/* Rich Messages: kleine Vorschauen der echten App-Funktionen          */
/* ================================================================== */

function CardShell({ mine, title, icon, children }: { mine: boolean; title: string; icon: IconName; children: ReactNode }) {
  return (
    <div
      className={cx(
        "overflow-hidden rounded-tile bg-surface shadow-sm ring-1",
        mine ? "rounded-br-md ring-brand" : "rounded-bl-md ring-line",
      )}
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5 text-xs font-semibold text-fg-muted">
        <Icon name={icon} className="size-3.5 text-brand-ink" />
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brand" | "accent" | "dark" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "neutral" && "bg-surface-3 text-fg-muted",
        tone === "brand" && "bg-brand text-brand-fg",
        tone === "accent" && "bg-accent text-accent-fg",
        tone === "dark" && "bg-brand-fg text-white",
      )}
    >
      {children}
    </span>
  );
}

function RichCard({ kind, mine }: { kind: CardKind; mine: boolean }) {
  switch (kind) {
    case "invite":
      return (
        <CardShell mine={mine} title="Einladung" icon="mail">
          <p className="text-sm text-fg-muted">Coach Marco lädt dich ein</p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-[0.3em] text-fg">K7MX2QPA</p>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-tile bg-surface-2 px-3 py-2 text-xs">
            <span className="truncate text-fg-subtle">voimacoach.de/registrieren?code=K7MX2QPA</span>
            <Pill tone="brand">gültig 14 Tage</Pill>
          </div>
        </CardShell>
      );
    case "photo":
      return (
        <CardShell mine={mine} title="Profil bearbeiten" icon="camera">
          <div className="flex items-center gap-4">
            <span className="relative grid size-16 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-ink text-xl font-bold text-brand-fg">
              L
              <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full bg-brand-fg text-brand ring-2 ring-surface">
                <Icon name="camera" className="size-3" />
              </span>
            </span>
            <div>
              <p className="font-semibold text-fg">Lena Müller</p>
              <p className="text-xs text-fg-subtle">Foto gespeichert · 512 × 512 px</p>
            </div>
          </div>
        </CardShell>
      );
    case "plan":
      return (
        <CardShell mine={mine} title="Trainingsplan · Kraftaufbau Phase 1" icon="list">
          <div className="flex flex-wrap gap-1.5">
            <Pill tone="dark">Unterkörper A</Pill>
            <Pill>Oberkörper</Pill>
            <Pill>Unterkörper B</Pill>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              ["Kniebeuge", "4 × 6 @ 80 kg"],
              ["Rumän. Kreuzheben", "3 × 8 @ 70 kg"],
              ["Bulgarian Split Squat", "3 × 10"],
            ].map(([n, d]) => (
              <li key={n} className="flex justify-between gap-3">
                <span className="text-fg">{n}</span>
                <span className="font-mono text-xs text-fg-subtle">{d}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3">
              <span className="flex items-center gap-1.5 text-fg">
                Laufband <Pill tone="accent">Cardio</Pill>
              </span>
              <span className="font-mono text-xs text-fg-subtle">20 min · Zone 2</span>
            </li>
          </ul>
        </CardShell>
      );
    case "log":
      return (
        <CardShell mine={mine} title="Workout · Unterkörper A" icon="dumbbell">
          <div className="mb-3 h-2 rounded-full bg-surface-3">
            <div className="h-2 w-full rounded-full bg-brand" />
          </div>
          {[
            ["#1", "6 Wdh.", "80 kg"],
            ["#2", "6 Wdh.", "82,5 kg"],
            ["#3", "6 Wdh.", "85 kg"],
            ["#4", "5 Wdh.", "85 kg"],
          ].map(([n, r, w]) => (
            <div key={n} className="flex items-center gap-3 py-1 text-sm">
              <span className="w-6 text-fg-subtle">{n}</span>
              <span className="flex-1 text-fg">{r}</span>
              <span className="font-mono text-xs text-fg-muted">{w}</span>
              <span className="grid size-6 place-items-center rounded-inner bg-brand text-brand-fg">
                <Icon name="check" className="size-3.5" />
              </span>
            </div>
          ))}
          <p className="mt-2 text-xs font-semibold text-brand-ink">4/4 Sätze · 1.996 kg Volumen</p>
        </CardShell>
      );
    case "cardio":
      return (
        <CardShell mine={mine} title="Laufband" icon="heart">
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Dauer", "22", "min"],
              ["Distanz", "3,1", "km"],
              ["Steigung", "8", "%"],
              ["Ø Puls", "138", "bpm"],
            ].map(([l, v, u]) => (
              <div key={l} className="rounded-tile bg-surface-2 px-3 py-2">
                <p className="text-[11px] text-fg-subtle">{l}</p>
                <p className="text-lg font-bold text-fg">
                  {v} <span className="text-xs font-medium text-fg-muted">{u}</span>
                </p>
              </div>
            ))}
          </div>
        </CardShell>
      );
    case "pr":
      return (
        <div className={cx("flex items-center gap-3 rounded-tile bg-brand p-4 text-brand-fg shadow-sm", mine ? "rounded-br-md" : "rounded-bl-md")}>
          <span className="grid size-11 shrink-0 place-items-center rounded-control bg-brand-fg text-brand motion-safe:animate-pop">
            <Icon name="trophy" className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold opacity-70">Neuer Bestwert</p>
            <p className="text-lg font-extrabold">Kniebeuge · 90 kg × 5</p>
            <p className="text-xs opacity-70">+12,5 kg seit dem Start</p>
          </div>
        </div>
      );
    case "progress":
      return (
        <CardShell mine={mine} title="Mein Fortschritt" icon="chart">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-fg-subtle">Wochen-Streak</p>
              <p className="flex items-center gap-1 text-2xl font-extrabold text-fg">
                6 <Icon name="flame" className="size-5 text-brand-ink" />
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-fg-subtle">Workouts (30 Tage)</p>
              <p className="text-2xl font-extrabold text-fg">14</p>
            </div>
          </div>
          <div className="mt-4 flex h-20 items-end gap-1.5">
            {[35, 48, 44, 60, 66, 72, 80, 92].map((h, i, a) => (
              <div
                key={i}
                className={cx("flex-1 rounded-t", i === a.length - 1 ? "bg-brand-fg" : "bg-brand")}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-fg-subtle">Kraftvolumen der letzten 8 Wochen</p>
        </CardShell>
      );
    case "measure":
      return (
        <CardShell mine={mine} title="Messwerte" icon="scale">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] text-fg-subtle">Körpergewicht</p>
              <p className="text-2xl font-extrabold text-fg">70,1 kg</p>
              <p className="text-xs font-semibold text-brand-ink">−2,3 kg in 6 Wochen</p>
            </div>
            <svg viewBox="0 0 120 50" className="h-14 w-32" aria-hidden="true">
              <polyline
                points="0,8 20,12 40,15 60,22 80,28 100,36 120,42"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-brand-ink"
              />
            </svg>
          </div>
        </CardShell>
      );
    case "status":
      return (
        <CardShell mine={mine} title="Meine Kunden" icon="users">
          <ul className="space-y-2.5">
            {(
              [
                ["Lena M.", "Aktiv", "brand"],
                ["Jonas K.", "Inaktiv", "neutral"],
                ["Aylin S.", "Neu angemeldet", "accent"],
                ["tim@…", "Eingeladen", "neutral"],
              ] as const
            ).map(([n, s, t]) => (
              <li key={n} className="flex items-center gap-3 text-sm">
                <span className="grid size-7 place-items-center rounded-full bg-surface-3 text-[11px] font-bold text-fg-muted">
                  {n[0].toUpperCase()}
                </span>
                <span className="flex-1 text-fg">{n}</span>
                <Pill tone={t}>{s}</Pill>
              </li>
            ))}
          </ul>
        </CardShell>
      );
    case "chat":
      return (
        <div className="flex items-center justify-end gap-1.5 pr-1 text-[11px] text-fg-subtle">
          <Icon name="check" className="size-3 text-brand-ink" />
          Gelesen · gerade eben · in Echtzeit
        </div>
      );
    case "apps":
      return (
        <CardShell mine={mine} title="Eine Plattform" icon="phone">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Web", "settings", "Trainer planen"],
              ["iOS", "phone", "Kunden trainieren"],
              ["Android", "phone", "Kunden trainieren"],
            ].map(([n, i, d]) => (
              <div key={n} className="rounded-tile bg-surface-2 px-2 py-3">
                <Icon name={i as IconName} className="mx-auto size-5 text-fg" />
                <p className="mt-1 text-sm font-semibold text-fg">{n}</p>
                <p className="text-[10px] text-fg-subtle">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-fg-muted">Alles synchron über eine gemeinsame API</p>
        </CardShell>
      );
    case "privacy":
      return (
        <CardShell mine={mine} title="Konto & Datenschutz" icon="shield">
          <ul className="space-y-2 text-sm text-fg">
            {["Verbindung zum Coach jederzeit trennen", "Konto selbst vollständig löschen", "Coach erhält nur einen kurzen Hinweis"].map(
              (t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-brand text-brand-fg">
                    <Icon name="check" className="size-3" />
                  </span>
                  {t}
                </li>
              ),
            )}
          </ul>
        </CardShell>
      );
  }
}

/* ================================================================== */
/* Finale, Toasts, Konfetti                                            */
/* ================================================================== */

function Finale({ complete, level, xp }: { complete: boolean; level: number; xp: number }) {
  return (
    <section className="relative mt-16" aria-live="polite">
      <div
        className={cx(
          "relative isolate overflow-hidden rounded-box p-8 text-center transition-colors duration-500 sm:p-12",
          complete ? "bg-brand-fg text-white" : "bg-surface text-fg ring-1 ring-line",
        )}
      >
        {complete && <Confetti />}
        <span
          className={cx(
            "mx-auto grid size-16 place-items-center rounded-tile",
            complete ? "bg-brand text-brand-fg motion-safe:animate-pop" : "bg-surface-3 text-fg-subtle",
          )}
        >
          <Icon name={complete ? "trophy" : "lock"} className="size-8" />
        </span>
        {complete ? (
          <>
            <p className="mt-6 text-sm font-semibold text-brand">Level {level} erreicht · {xp} XP</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Alle {CHAPTERS.length} Features entdeckt! 🏆</h2>
            <p className="mx-auto mt-3 max-w-md text-white/70">
              Du kennst jetzt Voima Coach. Zeit, es selbst auszuprobieren – 14 Tage kostenlos.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/registrieren?rolle=trainer"
                className="flex h-12 items-center justify-center gap-2 rounded-control bg-brand px-6 font-semibold text-brand-fg transition hover:bg-brand-hover"
              >
                Als Trainer starten <Icon name="arrow" className="size-4" />
              </Link>
              <Link
                href="/registrieren?rolle=kunde"
                className="flex h-12 items-center justify-center rounded-control bg-white/10 px-6 font-semibold text-white ring-1 ring-white/20 transition ring-inset hover:bg-white/15"
              >
                Als Kunde beitreten
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-6 text-2xl font-extrabold tracking-tight">Fast geschafft …</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-fg-muted">
              Scroll weiter, bis alle Features entdeckt sind – dann wartet hier eine Belohnung.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function Confetti() {
  // Deterministisch verteilt (kein Math.random beim Rendern)
  const pieces = Array.from({ length: 36 }, (_, i) => {
    const angle = (i / 36) * Math.PI * 2;
    const dist = 140 + ((i * 37) % 120);
    return {
      dx: `${Math.round(Math.cos(angle) * dist)}px`,
      dy: `${Math.round(Math.sin(angle) * dist * 0.8 + 60)}px`,
      rot: `${(i * 47) % 360}deg`,
      color: ["bg-brand", "bg-accent", "bg-white"][i % 3],
      delay: `${(i % 6) * 40}ms`,
      shape: i % 2 ? "h-3 w-1.5" : "size-2 rounded-full",
    };
  });
  return (
    <div aria-hidden="true" className="pointer-events-none absolute top-24 left-1/2 -z-10">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={cx("absolute opacity-0 motion-safe:animate-confetti", p.color, p.shape)}
          style={{ "--dx": p.dx, "--dy": p.dy, "--rot": p.rot, animationDelay: p.delay } as CSSProperties}
        />
      ))}
    </div>
  );
}

function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-72 flex-col gap-2 sm:right-6 sm:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 rounded-box bg-brand-fg p-3 pr-4 text-white shadow-2xl motion-safe:animate-toast-in"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-brand text-brand-fg">
            <Icon name={t.icon} className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-white/60">Achievement freigeschaltet</p>
            <p className="truncate text-sm font-bold">{t.title}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-extrabold text-brand">+{XP_PER_FEATURE} XP</p>
            {t.levelUp && <p className="mt-0.5 rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-fg">Level {t.levelUp}!</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}
