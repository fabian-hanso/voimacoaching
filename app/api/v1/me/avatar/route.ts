import { requireUser } from "@/lib/server/auth";
import { badRequest, handler } from "@/lib/server/http";
import { meResponse, removeAvatar, setAvatar } from "@/lib/server/repo";

/**
 * Profilbild hochladen: `multipart/form-data` mit Feld `file` (JPEG/PNG/WebP, max. 5 MB).
 * Empfohlen: vorher quadratisch auf 512×512 zuschneiden (macht das Web automatisch).
 */
export const POST = handler(async (req) => {
  const user = await requireUser(req);
  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    throw badRequest("Erwarte multipart/form-data mit dem Feld „file“.");
  }
  if (!(file instanceof Blob)) throw badRequest("Feld „file“ fehlt.");
  const updated = await setAvatar(user, new Uint8Array(await file.arrayBuffer()));
  return Response.json(await meResponse(updated));
});

/** Profilbild entfernen. */
export const DELETE = handler(async (req) => {
  const user = await requireUser(req);
  const updated = await removeAvatar(user);
  return Response.json(await meResponse(updated));
});
