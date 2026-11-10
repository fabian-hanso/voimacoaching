import { requireUser } from "@/lib/server/auth";
import { handler, parseBody } from "@/lib/server/http";
import { getBookingSettings, saveBookingSettings } from "@/lib/server/booking";
import { bookingSettingsSchema } from "@/lib/schemas";

/** Angebote & Zeitfenster des Trainers (jeder Trainer pflegt seine eigenen). */
export const GET = handler(async (req) => {
  const user = await requireUser(req);
  return Response.json(await getBookingSettings(user));
});

export const PUT = handler(async (req) => {
  const user = await requireUser(req);
  return Response.json(await saveBookingSettings(user, await parseBody(req, bookingSettingsSchema)));
});
