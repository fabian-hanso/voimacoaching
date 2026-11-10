import { requireUser } from "@/lib/server/auth";
import { badRequest, handler, parseBody } from "@/lib/server/http";
import { bookCourse, cancelCourseBooking } from "@/lib/server/courses";
import { courseBookingSchema } from "@/lib/schemas";

type Ctx = RouteContext<"/api/v1/courses/[id]/bookings">;

/** Für einen Kurstermin anmelden: { startsAt }. 409, wenn ausgebucht oder bereits angemeldet. */
export const POST = handler<Ctx>(async (req, ctx) => {
  const client = await requireUser(req, "client");
  const { startsAt } = await parseBody(req, courseBookingSchema);
  return Response.json(await bookCourse(client, (await ctx.params).id, startsAt), { status: 201 });
});

/** Abmelden: ?startsAt=… */
export const DELETE = handler<Ctx>(async (req, ctx) => {
  const client = await requireUser(req, "client");
  const startsAt = req.nextUrl.searchParams.get("startsAt");
  if (!startsAt || Number.isNaN(Date.parse(startsAt))) throw badRequest("startsAt fehlt oder ist ungültig.");
  return Response.json(await cancelCourseBooking(client, (await ctx.params).id, startsAt));
});
