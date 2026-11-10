import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { deleteCourse, updateCourse } from "@/lib/server/courses";
import { courseInputSchema } from "@/lib/schemas";

type Ctx = RouteContext<"/api/v1/studio/courses/[id]">;

/** Kurs vollständig ersetzen. Angemeldete Termine, die es danach nicht mehr gibt, werden storniert (mit Hinweis). */
export const PUT = handler<Ctx>(async (req, ctx) => {
  const owner = await requireUser(req, "studio");
  return Response.json(await updateCourse(owner, (await ctx.params).id, await parseBody(req, courseInputSchema)));
});

/** Kurs löschen – alle künftigen Anmeldungen werden storniert (mit Hinweis an die Kunden). */
export const DELETE = handler<Ctx>(async (req, ctx) => {
  const owner = await requireUser(req, "studio");
  await deleteCourse(owner, (await ctx.params).id);
  return new Response(null, { status: 204 });
});
