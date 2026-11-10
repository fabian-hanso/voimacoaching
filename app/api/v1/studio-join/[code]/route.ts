import { handler } from "@/lib/server/http";
import { checkStudioJoinCode } from "@/lib/server/repo";

type Ctx = RouteContext<"/api/v1/studio-join/[code]">;

/** Öffentlich: Mitglieds-Code prüfen (für Registrierung/QR) → { valid, studioName }. */
export const GET = handler<Ctx>(async (_req, ctx) => Response.json(await checkStudioJoinCode((await ctx.params).code)));
