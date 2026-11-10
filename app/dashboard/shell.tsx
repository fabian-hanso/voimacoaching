"use client";

import Link from "next/link";
import { hardNavigate } from "@/lib/client/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useApi } from "@/lib/client/api";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Avatar, cx, LoadError, Logo, Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { MeResponse } from "@/lib/types";
import { MessagesButton, MessagingProvider } from "./messaging";
import { NotificationsButton } from "./notices";
import { FeatureWishButton, FeatureWishProvider, useFeatureWish } from "./feature-wish";
import { StudioLogo } from "@/components/studio-logo";

/**
 * Gemeinsamer Rahmen aller /dashboard-Seiten: lädt den Nutzer, Header mit Chat und Avatar-Menü,
 * Realtime-Messaging. Seiten lesen den Nutzer über `useMe()`.
 */

const MeContext = createContext<{ me: MeResponse; reload: () => void } | null>(null);

export function useMe() {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error("useMe muss innerhalb von <DashboardShell> verwendet werden.");
  return ctx;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const me = useApi<MeResponse>("/me");
  const reloadMe = me.reload;
  const userId = me.data?.user.id;

  // Wächter: Abmeldung oder Kontowechsel (z. B. in einem anderen Tab) → sofort neu laden,
  // damit nie Daten eines anderen Kontos sichtbar bleiben.
  useEffect(() => {
    if (!userId) return;
    const { data } = supabaseBrowser().auth.onAuthStateChange((event, session) => {
      // Nur auf eindeutige Ereignisse reagieren (nicht auf „noch keine Sitzung gelesen“ beim Start),
      // sonst drohen Weiterleitungsschleifen zwischen Login und Dashboard.
      if (event === "SIGNED_OUT") hardNavigate("/login");
      else if (session && session.user.id !== userId) hardNavigate("/dashboard");
    });
    return () => data.subscription.unsubscribe();
  }, [userId]);

  // Zurück im Tab → Profil neu laden (z. B. Coach hat Verbindung beendet oder Konto gelöscht)
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && reloadMe();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reloadMe]);

  async function logout() {
    // Auch wenn Supabase nicht erreichbar ist: lokal abmelden und weiterleiten
    await supabaseBrowser()
      .auth.signOut()
      .catch(() => supabaseBrowser().auth.signOut({ scope: "local" }))
      .catch(() => {});
    hardNavigate("/"); // vollständiger Seitenwechsel – nichts vom Konto bleibt im Speicher
  }

  const layout = (
    <div className="flex min-h-full flex-1 flex-col bg-surface-2">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Logo href="/dashboard" />
            {/* Studio-Branding: Trainer & Kunden sehen das Logo ihres Studios */}
            {me.data?.studio && (
              <Link
                href="/dashboard/studio"
                title={`${me.data.studio.name} – Infos & Öffnungszeiten`}
                className="flex min-w-0 items-center gap-2 border-l border-line pl-3 text-fg-muted transition hover:text-fg"
              >
                <StudioLogo name={me.data.studio.name} logoUrl={me.data.studio.logoUrl} size="sm" />
                <span className="hidden truncate text-sm font-semibold sm:inline">{me.data.studio.name}</span>
              </Link>
            )}
          </div>
          {me.data && (
            <div className="flex items-center gap-2">
              <FeatureWishButton />
              <NotificationsButton />
              {me.data.user.role !== "studio" && <MessagesButton />}
              <UserMenu me={me.data} onLogout={logout} />
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        {me.loading ? (
          <Spinner />
        ) : !me.data ? (
          <LoadError message={me.error?.message ?? "Dein Profil konnte nicht geladen werden."} onRetry={me.reload} />
        ) : (
          <MeContext.Provider value={{ me: me.data, reload: me.reload }}>{children}</MeContext.Provider>
        )}
      </main>
    </div>
  );

  if (!me.data) return layout;
  // Feature-Wünsche: Trainer & Studios. Chat (Realtime): nur Trainer & Kunden – Studios sehen keine Chats.
  const role = me.data.user.role;
  const withWishes = <FeatureWishProvider enabled={role === "trainer" || role === "studio"}>{layout}</FeatureWishProvider>;
  return role === "studio" ? withWishes : <MessagingProvider me={me.data}>{withWishes}</MessagingProvider>;
}

/** Name + Avatar im Header; Klick öffnet ein Overlay mit Konto-Infos und „Abmelden“. */
function UserMenu({ me, onLogout }: { me: MeResponse; onLogout: () => void }) {
  const wish = useFeatureWish();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user, trainer } = me;
  const roleLabel =
    user.role === "studio"
      ? `Studio${me.studio ? `: ${me.studio.name}` : ""}`
      : user.role === "trainer"
        ? me.studio
          ? `Trainer · ${me.studio.name}`
          : "Trainer"
        : trainer
          ? `Coach: ${trainer.name}`
          : "Kunde";

  // Schließen bei Klick außerhalb oder Escape
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cx(
          "flex items-center gap-3 rounded-full py-1 pr-3 pl-1 transition hover:bg-surface-3 sm:rounded-xl",
          open && "bg-surface-3",
        )}
      >
        <Avatar name={user.name} src={user.avatarUrl} />
        <span className="hidden text-left sm:block">
          <span className="block text-sm leading-tight font-semibold text-fg">{user.name}</span>
          <span className="block text-xs leading-tight text-fg-muted">{roleLabel}</span>
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className={cx("size-4 text-fg-subtle transition", open && "rotate-180")}
        >
          <path fillRule="evenodd" d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl bg-surface shadow-xl ring-1 ring-line-strong"
        >
          <div className="flex items-center gap-3 border-b border-line p-4">
            <Avatar name={user.name} src={user.avatarUrl} size="xl" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
              <p className="truncate text-xs text-fg-muted">{user.email}</p>
              <p className="mt-0.5 truncate text-xs text-brand-ink">{roleLabel}</p>
            </div>
          </div>
          <div className="space-y-0.5 p-2">
            <Link
              href="/dashboard/einstellungen"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-fg transition hover:bg-surface-3 hover:text-fg"
            >
              <Icon name="settings" className="size-4" />
              Einstellungen
            </Link>
            {wish && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  wish.open("Avatar-Menü");
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-fg transition hover:bg-surface-3 hover:text-fg"
              >
                <Icon name="lightbulb" className="size-4" />
                Feature wünschen
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-fg transition hover:bg-danger/10 hover:text-danger"
            >
              <Icon name="logout" className="size-4" />
              Abmelden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
