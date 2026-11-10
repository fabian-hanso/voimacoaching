/**
 * Übungskatalog – geteilt von Web und API (GET /api/v1/exercises für Apps).
 * Übungen sind frei benennbar; der Katalog liefert Vorschläge und legt für
 * Ausdauergeräte fest, welche Messwerte beim Loggen abgefragt werden.
 */

export type ExerciseType = "strength" | "cardio";

export type CardioMetric = "durationMin" | "distanceKm" | "avgHeartRate" | "calories" | "inclinePct" | "avgWatts" | "level";

export interface CatalogExercise {
  name: string;
  type: ExerciseType;
  category: string;
  /** Nur Cardio: welche Werte beim Loggen angeboten werden. */
  metrics?: CardioMetric[];
}

export const CARDIO_METRICS: Record<CardioMetric, { label: string; unit: string; step: number; max: number }> = {
  durationMin: { label: "Dauer", unit: "min", step: 1, max: 1440 },
  distanceKm: { label: "Distanz", unit: "km", step: 0.01, max: 1000 },
  avgHeartRate: { label: "Ø Puls", unit: "bpm", step: 1, max: 250 },
  calories: { label: "Kalorien", unit: "kcal", step: 1, max: 10000 },
  inclinePct: { label: "Steigung", unit: "%", step: 0.5, max: 40 },
  avgWatts: { label: "Ø Leistung", unit: "W", step: 1, max: 2000 },
  level: { label: "Stufe", unit: "", step: 1, max: 50 },
};

export const DEFAULT_CARDIO_METRICS: CardioMetric[] = ["durationMin", "distanceKm", "avgHeartRate", "calories"];

const cardio = (name: string, category: string, metrics: CardioMetric[]): CatalogExercise => ({
  name,
  type: "cardio",
  category,
  metrics,
});
const strength = (category: string, names: string[]): CatalogExercise[] =>
  names.map((name) => ({ name, type: "strength", category }));

export const EXERCISE_CATALOG: CatalogExercise[] = [
  // Ausdauer – Geräte
  cardio("Laufband", "Ausdauer", ["durationMin", "distanceKm", "inclinePct", "avgHeartRate", "calories"]),
  cardio("Fahrradergometer", "Ausdauer", ["durationMin", "distanceKm", "avgWatts", "avgHeartRate", "calories"]),
  cardio("Indoor Cycling", "Ausdauer", ["durationMin", "avgWatts", "level", "avgHeartRate", "calories"]),
  cardio("Crosstrainer", "Ausdauer", ["durationMin", "distanceKm", "level", "avgHeartRate", "calories"]),
  cardio("Rudergerät", "Ausdauer", ["durationMin", "distanceKm", "avgWatts", "avgHeartRate", "calories"]),
  cardio("Stepper / Treppensteiger", "Ausdauer", ["durationMin", "level", "avgHeartRate", "calories"]),
  cardio("Ski-Ergometer", "Ausdauer", ["durationMin", "distanceKm", "avgWatts", "avgHeartRate"]),
  cardio("Air Bike", "Ausdauer", ["durationMin", "calories", "avgWatts", "avgHeartRate"]),
  // Ausdauer – draußen & sonstiges
  cardio("Laufen", "Ausdauer", ["durationMin", "distanceKm", "avgHeartRate", "calories"]),
  cardio("Walking", "Ausdauer", ["durationMin", "distanceKm", "avgHeartRate"]),
  cardio("Radfahren", "Ausdauer", ["durationMin", "distanceKm", "avgHeartRate", "calories"]),
  cardio("Schwimmen", "Ausdauer", ["durationMin", "distanceKm", "avgHeartRate"]),
  cardio("Seilspringen", "Ausdauer", ["durationMin", "avgHeartRate", "calories"]),
  // Kraft
  ...strength("Beine", [
    "Kniebeuge",
    "Frontkniebeuge",
    "Beinpresse",
    "Ausfallschritte",
    "Bulgarian Split Squat",
    "Hip Thrust",
    "Beinstrecker",
    "Beinbeuger",
    "Wadenheben",
  ]),
  ...strength("Rücken", ["Kreuzheben", "Rumänisches Kreuzheben", "Klimmzüge", "Latzug", "Langhantelrudern", "Kabelrudern", "Face Pulls"]),
  ...strength("Brust", ["Bankdrücken", "Schrägbankdrücken", "Kurzhantel-Bankdrücken", "Liegestütze", "Dips", "Butterfly"]),
  ...strength("Schultern", ["Schulterdrücken", "Seitheben", "Reverse Flys"]),
  ...strength("Arme", ["Bizepscurls", "Hammercurls", "Trizepsdrücken am Kabel", "French Press"]),
  ...strength("Rumpf", ["Plank", "Crunches", "Hanging Leg Raises", "Russian Twists"]),
];

const byName = new Map(EXERCISE_CATALOG.map((e) => [e.name.toLowerCase(), e]));

export const findExercise = (name: string) => byName.get(name.trim().toLowerCase());

/** Messwerte, die für eine Cardio-Übung abgefragt werden (Katalog oder Standard). */
export const cardioMetricsFor = (name: string): CardioMetric[] => findExercise(name)?.metrics ?? DEFAULT_CARDIO_METRICS;
