import { requireUser } from "@/lib/server/auth";
import { badRequest, handler } from "@/lib/server/http";
import { removeCourseImage, setCourseImage } from "@/lib/server/courses";

type Ctx = RouteContext<"/api/v1/studio/courses/[id]/image">;

/** Kursbild: multipart/form-data mit Feld „file“ (JPEG/PNG/WebP, max. 5 MB). */
export const POST = handler<Ctx>(async (req, ctx) => {
  const owner = await requireUser(req, "studio");
  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    throw badRequest("Erwarte multipart/form-data mit dem Feld „file“.");
  }
  if (!(file instanceof Blob)) throw badRequest("Feld „file“ fehlt.");
  return Response.json(await setCourseImage(owner, (await ctx.params).id, new Uint8Array(await file.arrayBuffer())));
});

export const DELETE = handler<Ctx>(async (req, ctx) => {
  const owner = await requireUser(req, "studio");
  return Response.json(await removeCourseImage(owner, (await ctx.params).id));
});
