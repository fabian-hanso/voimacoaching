import { CARDIO_METRICS, DEFAULT_CARDIO_METRICS, EXERCISE_CATALOG } from "@/lib/exercises";

/**
 * Öffentlich: Übungskatalog inkl. Messwerten für Ausdauergeräte.
 * Die Anleitungen gibt es nur angemeldet über GET /exercises/guides.
 */
export function GET() {
  return Response.json({
    exercises: EXERCISE_CATALOG,
    cardioMetrics: CARDIO_METRICS,
    defaultCardioMetrics: DEFAULT_CARDIO_METRICS,
  });
}
