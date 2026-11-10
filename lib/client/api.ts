"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiErrorBody } from "../types";
import { supabaseBrowser } from "../supabase/browser";
import { errorMessage, statusMessage } from "./errors";
import { hardNavigate } from "./navigation";

/**
 * Web-Client für die API v1. Authentifiziert über die Supabase-Session-Cookies
 * (gesetzt beim Login über supabaseBrowser()).
 */

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 30_000;

/**
 * Ruft die API auf und wirft bei JEDEM Problem einen `ApiClientError` mit deutscher Meldung:
 * Netzwerk weg (status 0), Zeitüberschreitung (408), Server-/Validierungsfehler (Status der API).
 * `body` als Objekt → JSON; als FormData → multipart (z. B. Bild-Upload).
 */
export async function api<T = unknown>(
  path: string,
  init?: { method?: string; body?: unknown; timeoutMs?: number },
): Promise<T> {
  const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method: init?.method ?? (init?.body ? "POST" : "GET"),
      headers: init?.body && !isForm ? { "content-type": "application/json" } : undefined,
      body: init?.body ? (isForm ? (init.body as FormData) : JSON.stringify(init.body)) : undefined,
      credentials: "same-origin",
      signal: AbortSignal.timeout(init?.timeoutMs ?? TIMEOUT_MS),
    });
  } catch (err) {
    const timeout = err instanceof DOMException && err.name === "TimeoutError";
    throw new ApiClientError(timeout ? 408 : 0, timeout ? "timeout" : "network", statusMessage(timeout ? 408 : 0));
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!res.ok) {
    const err = (data as ApiErrorBody | null)?.error;
    const details = Array.isArray(err?.details) ? (err.details as { path: string; message: string }[]) : undefined;
    // Eigene Meldung der API bevorzugen; generische 5xx-Meldungen durch freundliche ersetzen
    const base = res.status >= 500 || !err?.message ? statusMessage(res.status) : err.message;
    const message = details?.length ? `${base} ${details.map((d) => (d.path ? `${d.path}: ${d.message}` : d.message)).join(" · ")}` : base;
    throw new ApiClientError(res.status, err?.code ?? `http_${res.status}`, message, details);
  }
  return data as T;
}

/**
 * Lädt Daten von der API; `reload()` lädt neu (bisherige Daten bleiben dabei sichtbar).
 * Bei 401 (Sitzung abgelaufen/Konto gelöscht) → abmelden und zum Login.
 */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<{ data?: T; error?: ApiClientError; loading: boolean }>({ loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    api<T>(path)
      .then((data) => !cancelled && setState({ data, loading: false }))
      .catch((err: unknown) => {
        if (cancelled) return;
        const error = err instanceof ApiClientError ? err : new ApiClientError(0, "unknown", errorMessage(err));
        if (error.status === 401) {
          void supabaseBrowser()
            .auth.signOut({ scope: "local" })
            .catch(() => {})
            .finally(() => hardNavigate("/login?fehler=sitzung"));
        }
        setState((prev) => ({ data: prev.data, error, loading: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [path, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}

export const fmtDate = (iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) =>
  iso ? new Intl.DateTimeFormat("de-DE", opts).format(new Date(iso)) : "–";

export const fmtNumber = (n: number | null | undefined, digits = 0) =>
  n == null ? "–" : new Intl.NumberFormat("de-DE", { maximumFractionDigits: digits }).format(n);
