"use client";

import { Icon } from "@/components/icons";
import { Alert, Button, cx } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import type { FeatureRequestInput } from "@/lib/schemas";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { SITE_NAME_COMPOUND } from "@/lib/site";

/**
 * Feature-Wünsche für Trainer (später auch Studios).
 * Eingereichte Wünsche sind NUR für Admins sichtbar – Trainer sehen danach nur ein „Danke“.
 */

interface FeatureWishContext {
  /** Öffnet das Wunsch-Fenster; `context` = Herkunft, z. B. „Plan-Editor“ */
  open: (context?: string) => void;
}

const Ctx = createContext<FeatureWishContext | null>(null);

/** null, wenn der Nutzer keine Wünsche einreichen darf (z. B. Kunden). */
export const useFeatureWish = () => useContext(Ctx);

export function FeatureWishProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [state, setState] = useState<{ open: boolean; context: string | null }>(
    { open: false, context: null },
  );
  const pathname = usePathname();
  const open = useCallback(
    (context?: string) =>
      setState({ open: true, context: context ?? pathname }),
    [pathname],
  );

  if (!enabled) return <>{children}</>;
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {state.open && (
        <WishDrawer
          context={state.context}
          onClose={() => setState({ open: false, context: null })}
        />
      )}
    </Ctx.Provider>
  );
}

/** Dezenter Kontext-Link, z. B. unter dem Plan-Editor: „Fehlt dir hier etwas?“ */
export function WishLink({
  context,
  className,
}: {
  context: string;
  className?: string;
}) {
  const wish = useFeatureWish();
  if (!wish) return null;
  return (
    <button
      type="button"
      onClick={() => wish.open(context)}
      className={cx(
        "inline-flex items-center gap-1.5 text-sm text-fg-subtle transition hover:text-brand-ink",
        className,
      )}
    >
      <Icon name="lightbulb" className="size-4" />
      Fehlt dir hier etwas?{" "}
      <span className="font-semibold underline-offset-2 hover:underline">
        Feature wünschen
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */

const AREAS: {
  value: NonNullable<FeatureRequestInput["area"]>;
  label: string;
}[] = [
  { value: "plans", label: "Pläne" },
  { value: "clients", label: "Kunden" },
  { value: "tracking", label: "Tracking" },
  { value: "chat", label: "Chat" },
  { value: "billing", label: "Abrechnung" },
  { value: "other", label: "Sonstiges" },
];

const IMPORTANCE: {
  value: NonNullable<FeatureRequestInput["importance"]>;
  label: string;
}[] = [
  { value: "nice", label: "Wäre nett" },
  { value: "important", label: "Wichtig" },
  { value: "essential", label: "Unverzichtbar" },
];

function WishDrawer({
  context,
  onClose,
}: {
  context: string | null;
  onClose: () => void;
}) {
  const [body, setBody] = useState("");
  const [area, setArea] = useState<FeatureRequestInput["area"]>(null);
  const [importance, setImportance] =
    useState<FeatureRequestInput["importance"]>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && !pending && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 3) {
      setError("Beschreibe deinen Wunsch in ein paar Worten.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api("/feature-requests", {
        body: { body: body.trim(), area, importance, context },
      });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, "Dein Wunsch konnte nicht gesendet werden."));
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setBody("");
    setArea(null);
    setImportance(null);
    setSent(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        aria-label="Schließen"
        tabIndex={-1}
        onClick={() => !pending && onClose()}
        className="absolute inset-0 bg-fg/30 backdrop-blur-[2px]"
      />
      <div className="relative flex h-full w-full flex-col bg-surface shadow-2xl sm:max-w-md">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-4">
          <span className="grid size-9 place-items-center rounded-control bg-brand text-brand-fg">
            <Icon name="lightbulb" className="size-5" />
          </span>
          <p id={titleId} className="flex-1 font-semibold text-fg">
            Feature wünschen
          </p>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="grid size-9 place-items-center rounded-control text-fg-muted hover:bg-surface-3"
          >
            <Icon name="x" className="size-5" />
          </button>
        </header>

        {sent ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <span className="grid size-16 place-items-center rounded-tile bg-brand text-brand-fg motion-safe:animate-pop">
              <Icon name="check" className="size-8" />
            </span>
            <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-fg">
              Danke für deinen Wunsch!
            </h2>
            <p className="mt-2 max-w-xs text-sm text-fg-muted">
              Er ist direkt beim {SITE_NAME_COMPOUND}-Team gelandet. Wir lesen
              jeden Wunsch – versprochen.
            </p>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" onClick={reset}>
                Weiteren Wunsch senden
              </Button>
              <Button onClick={onClose}>Fertig</Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="flex flex-1 flex-col overflow-y-auto"
          >
            <div className="flex-1 space-y-6 p-5">
              <div>
                <label
                  htmlFor={bodyId}
                  className="block text-sm font-semibold text-fg"
                >
                  Was würde dir die Arbeit erleichtern?
                </label>
                <textarea
                  id={bodyId}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  maxLength={2000}
                  autoFocus
                  placeholder="z. B. „Ich hätte gern Supersätze im Plan-Editor, damit ich zwei Übungen direkt hintereinander planen kann.“"
                  className="mt-2 block w-full resize-y rounded-control border-0 bg-surface-2 px-3.5 py-3 text-sm text-fg ring-1 ring-line-strong ring-inset placeholder:text-fg-subtle focus:ring-2 focus:ring-brand-ink focus:outline-none"
                />
                <p className="mt-1 text-right text-xs text-fg-subtle tabular-nums">
                  {body.length}/2000
                </p>
              </div>

              <ChipGroup
                label="Bereich (optional)"
                options={AREAS}
                value={area}
                onChange={setArea}
              />
              <ChipGroup
                label="Wie wichtig ist dir das? (optional)"
                options={IMPORTANCE}
                value={importance}
                onChange={setImportance}
              />

              <p className="flex items-start gap-2 rounded-tile bg-surface-2 p-3 text-xs text-fg-muted">
                <Icon name="lock" className="mt-0.5 size-3.5 shrink-0" />
                Dein Wunsch ist nur für das {SITE_NAME_COMPOUND}-Team sichtbar –
                nicht für Kunden oder andere Trainer.
              </p>
              {error && <Alert>{error}</Alert>}
            </div>

            <div className="shrink-0 border-t border-line p-4">
              <Button
                type="submit"
                disabled={pending || body.trim().length < 3}
                className="w-full"
              >
                {pending ? "Wird gesendet …" : "Wunsch senden"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (v: T | null) => void;
}) {
  const id = useId();
  return (
    <div>
      <p id={id} className="text-sm font-semibold text-fg">
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className="mt-2 flex flex-wrap gap-2"
      >
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              // Erneutes Klicken hebt die Auswahl wieder auf
              onClick={() => onChange(active ? null : o.value)}
              className={cx(
                "rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition",
                active
                  ? "bg-brand text-brand-fg ring-brand"
                  : "bg-surface text-fg-muted ring-line-strong hover:bg-surface-3 hover:text-fg",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
