import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { createStaff } from "@/lib/server/repo";
import { staffInputSchema } from "@/lib/schemas";

/** Weitere Mitarbeitende anlegen (Leitung, Service & Empfang, Weitere) – ohne eigenes Konto. */
export const POST = handler(async (req) => {
  const owner = await requireUser(req, "studio");
  return Response.json(await createStaff(owner, await parseBody(req, staffInputSchema)), { status: 201 });
});
