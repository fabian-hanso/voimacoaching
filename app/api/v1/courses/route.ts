import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { listCourses } from "@/lib/server/courses";

/** Kurse des eigenen Studios inkl. der nächsten Termine (4 Wochen). Kunden: mit `bookedByMe`. */
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  return Response.json({ courses: await listCourses(user) });
});
