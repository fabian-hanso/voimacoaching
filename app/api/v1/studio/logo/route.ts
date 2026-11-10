import { requireUser } from "@/lib/server/auth";
import { badRequest, handler } from "@/lib/server/http";
import { removeStudioLogo, setStudioLogo } from "@/lib/server/repo";

/** Studio-Logo hochladen: multipart/form-data mit Feld „file“ (JPEG/PNG/WebP, max. 5 MB). Sichtbar für Trainer & Kunden. */
export const POST = handler(async (req) => {
  const owner = await requireUser(req, "studio");
  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    throw badRequest("Erwarte multipart/form-data mit dem Feld „file“.");
  }
  if (!(file instanceof Blob)) throw badRequest("Feld „file“ fehlt.");
  return Response.json(await setStudioLogo(owner, new Uint8Array(await file.arrayBuffer())));
});

export const DELETE = handler(async (req) => {
  const owner = await requireUser(req, "studio");
  return Response.json(await removeStudioLogo(owner));
});
