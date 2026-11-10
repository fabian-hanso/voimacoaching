import "server-only";
import { connection, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { ConfigError } from "../supabase/env";

/** Fehler, der als JSON `{ error: { code, message, details? } }` an den Client geht. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) => new ApiError(400, "bad_request", message, details);
export const unauthorized = (message = "Nicht angemeldet.") => new ApiError(401, "unauthorized", message);
export const forbidden = (message = "Keine Berechtigung.") => new ApiError(403, "forbidden", message);
export const notFound = (message = "Nicht gefunden.") => new ApiError(404, "not_found", message);
export const conflict = (message: string) => new ApiError(409, "conflict", message);

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: "validation_error",
          message: "Ungültige Eingabe.",
          details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
      },
      { status: 422 },
    );
  }
  if (err instanceof ConfigError) {
    console.error("[api] Konfiguration fehlt:", err.message);
    return Response.json(
      { error: { code: "not_configured", message: "Server ist nicht konfiguriert (Supabase-Keys fehlen)." } },
      { status: 503 },
    );
  }
  if (err instanceof TypeError && /fetch failed/i.test(err.message)) {
    console.error("[api] Upstream nicht erreichbar:", err);
    return Response.json(
      { error: { code: "upstream_unavailable", message: "Ein benötigter Dienst ist gerade nicht erreichbar. Bitte versuche es gleich noch einmal." } },
      { status: 503 },
    );
  }
  console.error("[api] Unerwarteter Fehler:", err);
  return Response.json({ error: { code: "internal_error", message: "Interner Serverfehler." } }, { status: 500 });
}

/**
 * Wrapper für alle API-Route-Handler:
 * - markiert den Request als dynamisch (keine Vorab-Generierung beim Build, Cache Components)
 * - wandelt geworfene Fehler in einheitliche JSON-Antworten um
 */
export function handler<Ctx = unknown>(fn: (req: NextRequest, ctx: Ctx) => Promise<Response> | Response) {
  return async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    await connection();
    try {
      return await fn(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

/** Liest den JSON-Body und validiert ihn mit einem Zod-Schema. */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest("Request-Body muss gültiges JSON sein.");
  }
  return schema.parse(raw);
}
