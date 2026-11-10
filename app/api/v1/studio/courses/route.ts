import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { createCourse, listCourses } from "@/lib/server/courses";
import { courseInputSchema } from "@/lib/schemas";

/** Alle Kurse des eigenen Studios (auch pausierte) inkl. der nächsten Termine und Belegung. */
export const GET = handler(async (req) => {
  const owner = await requireUser(req, "studio");
  return Response.json({ courses: await listCourses(owner) });
});

/** Kurs anlegen. Ein zugewiesener Trainer wird benachrichtigt. */
export const POST = handler(async (req) => {
  const owner = await requireUser(req, "studio");
  return Response.json(await createCourse(owner, await parseBody(req, courseInputSchema)), { status: 201 });
});
