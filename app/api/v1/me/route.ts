import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { NextResponse } from "next/server";
import { deleteAccount, meResponse, updateProfile } from "@/lib/server/repo";
import { updateMeSchema } from "@/lib/schemas";

export const GET = handler(async (req) => {
  const user = await requireUser(req);
  return Response.json(await meResponse(user));
});

export const PATCH = handler(async (req) => {
  const user = await requireUser(req);
  const updated = await updateProfile(user.id, await parseBody(req, updateMeSchema));
  return Response.json(await meResponse(updated));
});

/** Konto endgültig löschen (inkl. aller Trainingsdaten, Pläne, Nachrichten und Profilbild). */
export const DELETE = handler(async (req) => {
  const user = await requireUser(req);
  await deleteAccount(user);
  // Web: Supabase-Session-Cookies entfernen
  const res = new NextResponse(null, { status: 204 });
  for (const c of req.cookies.getAll()) if (c.name.startsWith("sb-")) res.cookies.delete(c.name);
  return res;
});
