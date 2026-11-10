import { requireUser } from "@/lib/server/auth";
import { handler } from "@/lib/server/http";
import { myCourseBookings } from "@/lib/server/courses";

/** Eigene kommende Kursanmeldungen (Kunden). */
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  return Response.json({ bookings: await myCourseBookings(user) });
});
