#!/usr/bin/env node
/**
 * Voima Coach – Demo-/Mockdaten anlegen (2 Studios, 4 Trainer, 5 Kunden inkl. Pläne, Workouts, Termine, Kurse, Chats).
 *
 * Läuft über die echte API, damit alle Verknüpfungen und Regeln wie in der App entstehen.
 * Vorher werden alle bisherigen Demo-Konten (demo.…@example.com) gelöscht – das Skript ist also wiederholbar.
 *
 * Voraussetzungen:
 *   - .env.local mit NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY
 *   - laufende App, z. B. `npm run dev` (Standard: http://localhost:3000) – anderer Port über BASE_URL
 *
 * Aufruf:  BASE_URL=http://localhost:3000 node scripts/seed-mock.mjs
 * Löschen: node scripts/seed-mock.mjs --nur-loeschen
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SECRET = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = `${(process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/v1`;
export const PASSWORD = "VoimaDemo!2026";
const DOMAIN = "@example.com";
const PREFIX = "demo.";

const admin = createClient(SUPABASE_URL, SECRET, { auth: { persistSession: false } });

async function call(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body && { "content-type": "application/json" }) },
    body: body && JSON.stringify(body),
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${data?.error?.message ?? "Fehler"}`);
  return data;
}

async function removeDemoAccounts() {
  let removed = 0;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const demo = data.users.filter((u) => u.email?.startsWith(PREFIX) && u.email.endsWith(DOMAIN));
    // Studios zuletzt löschen, damit Trainer/Kunden nicht unnötig „Studio aufgelöst“-Hinweise erzeugen
    demo.sort((a, b) => Number(a.user_metadata?.role === "studio") - Number(b.user_metadata?.role === "studio"));
    for (const u of demo) {
      await admin.auth.admin.deleteUser(u.id);
      removed++;
    }
    if (data.users.length < 1000) break;
  }
  return removed;
}

/** Konto anlegen (bestätigt) und einloggen. */
async function account(local, meta) {
  const email = `${PREFIX}${local}${DOMAIN}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: meta });
  if (error) throw new Error(`${email}: ${error.message}`);
  const anon = createClient(SUPABASE_URL, PUBLISHABLE, { auth: { persistSession: false } });
  const { data: s, error: e2 } = await anon.auth.signInWithPassword({ email, password: PASSWORD });
  if (e2) throw new Error(`Login ${email}: ${e2.message}`);
  return { id: data.user.id, email, name: meta.name, token: s.session.access_token };
}

const daysAgo = (n, hour = 18) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const weekdays = (days, start, end) => days.map((day) => ({ day, start, end }));
const pickSlot = async (client, trainerId, serviceId, dayIndex, slotIndex = 0) => {
  const { days } = await call("GET", `/booking/slots?trainerId=${trainerId}&serviceId=${serviceId}`, client.token);
  const withSlots = days.filter((d) => d.slots.length);
  const day = withSlots[Math.min(dayIndex, withSlots.length - 1)];
  return day.slots[Math.min(slotIndex, day.slots.length - 1)];
};

async function seed() {
  /* ---------------------------- Studios ---------------------------- */
  const ironOwner = await account("iron-gym", { role: "studio", name: "Julia Hoffmann", studio_name: "Iron Gym Köln" });
  const flowOwner = await account("flow-loft", { role: "studio", name: "Sven Lorenz", studio_name: "Flow Yoga Loft" });

  await call("PATCH", "/studio", ironOwner.token, {
    description: "Familiäres Kraft- und Fitnessstudio mitten in Ehrenfeld – mit persönlicher Betreuung, Kursen und Sauna.",
    street: "Venloer Straße 210",
    postalCode: "50823",
    city: "Köln",
    phone: "+49 221 1234567",
    email: "hallo@iron-gym.example",
    website: "https://iron-gym.example",
    instagram: "irongym.koeln",
    openingHours: [0, 1, 2, 3, 4].map((day) => ({ day, closed: false, open: "06:00", close: "23:00" })).concat([
      { day: 5, closed: false, open: "08:00", close: "20:00" },
      { day: 6, closed: false, open: "09:00", close: "18:00" },
    ]),
    amenities: ["Freihantelbereich", "Kursraum", "Sauna", "Duschen", "Parkplätze", "Getränkebar"],
  });
  await call("POST", "/studio/staff", ironOwner.token, { name: "Anna Berger", category: "management", position: "Studioleitung", bio: "Ansprechpartnerin für Verträge und Feedback." });
  await call("POST", "/studio/staff", ironOwner.token, { name: "Ben Krüger", category: "service", position: "Rezeption" });

  await call("PATCH", "/studio", flowOwner.token, {
    description: "Helles Yoga-Loft für Vinyasa, Yin und Mobility – kleine Gruppen, viel Ruhe.",
    street: "Brückenstraße 5",
    postalCode: "50667",
    city: "Köln",
    openingHours: [0, 1, 2, 3, 4, 5].map((day) => ({ day, closed: false, open: "07:00", close: "21:00" })).concat([{ day: 6, closed: true, open: "09:00", close: "12:00" }]),
    amenities: ["Matten & Blöcke", "Umkleiden", "Tee-Ecke"],
  });

  /* ---------------------------- Trainer ---------------------------- */
  const ironInvite = async () => (await call("POST", "/studio/invitations", ironOwner.token, {})).code;
  const marco = await account("marco", { role: "trainer", name: "Marco Weber", studio_code: await ironInvite() });
  const sara = await account("sara", { role: "trainer", name: "Sara Klein", studio_code: await ironInvite() });
  const nina = await account("nina", { role: "trainer", name: "Nina Brandt", studio_code: (await call("POST", "/studio/invitations", flowOwner.token, {})).code });
  const tom = await account("tom", { role: "trainer", name: "Tom Richter" }); // eigenständig, ohne Studio

  const marcoSettings = await call("PUT", "/booking/settings", marco.token, {
    enabled: true,
    services: [
      { category: "personal_training", title: "Personal Training", durationMin: 60, description: "Technik, Trainingsplan-Check und Motivation." },
      { category: "nutrition", title: "Ernährungsberatung", durationMin: 45 },
    ],
    windows: [...weekdays([0, 1, 2, 3, 4], "07:00", "12:00"), ...weekdays([0, 2, 4], "16:00", "20:00")],
    minNoticeHours: 2,
    horizonDays: 28,
  });
  const saraSettings = await call("PUT", "/booking/settings", sara.token, {
    enabled: true,
    services: [
      { category: "introduction", title: "Geräteeinweisung", durationMin: 45 },
      { category: "trial", title: "Probetraining", durationMin: 60 },
    ],
    windows: weekdays([1, 3, 5], "09:00", "18:00"),
    minNoticeHours: 2,
    horizonDays: 28,
  });
  await call("PUT", "/booking/settings", nina.token, {
    enabled: true,
    services: [{ category: "personal_training", title: "Private Yoga Session", durationMin: 60 }],
    windows: weekdays([0, 2, 4], "10:00", "16:00"),
    minNoticeHours: 12,
    horizonDays: 28,
  });
  await call("PUT", "/booking/settings", tom.token, {
    enabled: true,
    services: [{ category: "personal_training", title: "Outdoor Personal Training", durationMin: 60 }],
    windows: weekdays([0, 1, 2, 3, 4, 5], "06:00", "10:00"),
    minNoticeHours: 12,
    horizonDays: 21,
  });

  /* ---------------------------- Kunden ----------------------------- */
  const invite = async (trainer) => (await call("POST", "/invitations", trainer.token, {})).code;
  const lena = await account("lena", { role: "client", name: "Lena Schmidt", invite_code: await invite(marco) });
  const jonas = await account("jonas", { role: "client", name: "Jonas Becker", invite_code: await invite(marco) });
  const ironCode = (await call("GET", "/studio", ironOwner.token)).studio.joinCode;
  const mia = await account("mia", { role: "client", name: "Mia Wagner", studio_join_code: ironCode }); // Mitglied ohne Coach
  const paul = await account("paul", { role: "client", name: "Paul Neumann", invite_code: await invite(tom) });
  const elif = await account("elif", { role: "client", name: "Elif Yılmaz", invite_code: await invite(nina) });
  await call("PATCH", "/me", lena.token, { phone: "+49 170 1112233" });
  await call("PATCH", "/me", mia.token, { phone: "+49 151 4445566" });

  /* ------------------------ Pläne & Training ------------------------ */
  const ganzkoerper = await call("POST", "/plans", marco.token, {
    title: "Ganzkörper Grundlagen",
    description: "3× pro Woche, saubere Technik vor Gewicht.",
    days: [
      {
        name: "Tag A",
        exercises: [
          { name: "Kniebeuge", type: "strength", sets: 3, reps: "8-10", weightKg: 40, restSec: 120, notes: "Knie aktiv nach außen drücken, unten kurz halten." },
          { name: "Bankdrücken", type: "strength", sets: 3, reps: "8-10", weightKg: 35, restSec: 120 },
          { name: "Kabelrudern", type: "strength", sets: 3, reps: "10-12", weightKg: 30 },
        ],
      },
      {
        name: "Tag B",
        exercises: [
          { name: "Kreuzheben", type: "strength", sets: 3, reps: "6-8", weightKg: 50, restSec: 150 },
          { name: "Schulterdrücken", type: "strength", sets: 3, reps: "8-10", weightKg: 14 },
          { name: "Laufband", type: "cardio", durationMin: 15, intensity: "locker, 6,5 km/h" },
        ],
      },
    ],
  });
  await call("POST", `/plans/${ganzkoerper.id}/assignments`, marco.token, { clientId: lena.id });
  await call("POST", `/plans/${ganzkoerper.id}/assignments`, marco.token, { clientId: jonas.id });

  const laufplan = await call("POST", "/plans", tom.token, {
    title: "Ausdauer & Kraft draußen",
    days: [
      {
        name: "Lauf + Core",
        exercises: [
          { name: "Laufen", type: "cardio", durationMin: 30, distanceKm: 5 },
          { name: "Plank", type: "strength", sets: 3, reps: "45s" },
        ],
      },
    ],
  });
  await call("POST", `/plans/${laufplan.id}/assignments`, tom.token, { clientId: paul.id });

  for (const [ago, weight] of [[9, 37.5], [6, 40], [2, 42.5]]) {
    await call("POST", "/workouts", lena.token, {
      title: "Ganzkörper Grundlagen · Tag A",
      planId: ganzkoerper.id,
      performedAt: daysAgo(ago),
      durationMin: 55,
      exercises: [
        { name: "Kniebeuge", type: "strength", sets: [{ reps: 10, weightKg: weight }, { reps: 9, weightKg: weight }, { reps: 8, weightKg: weight }] },
        { name: "Bankdrücken", type: "strength", sets: [{ reps: 10, weightKg: 32.5 }, { reps: 8, weightKg: 32.5 }, { reps: 8, weightKg: 32.5 }] },
      ],
    });
  }
  await call("POST", "/workouts", lena.token, {
    title: "Freies Training",
    performedAt: daysAgo(4, 7),
    durationMin: 32,
    exercises: [{ name: "Laufband", type: "cardio", durationMin: 30, distanceKm: 4.2, avgHeartRate: 142 }],
  });
  await call("POST", "/measurements", lena.token, { measuredAt: daysAgo(20, 8), bodyWeightKg: 68.4, bodyFatPct: 26 });
  await call("POST", "/measurements", lena.token, { measuredAt: daysAgo(1, 8), bodyWeightKg: 67.1, bodyFatPct: 25 });
  await call("POST", "/workouts", jonas.token, {
    title: "Ganzkörper Grundlagen · Tag B",
    planId: ganzkoerper.id,
    performedAt: daysAgo(12),
    exercises: [{ name: "Kreuzheben", type: "strength", sets: [{ reps: 8, weightKg: 60 }, { reps: 8, weightKg: 60 }] }],
  }); // Jonas: seit > 7 Tagen nicht trainiert → „Inaktiv“
  await call("POST", "/workouts", paul.token, {
    title: "Lauf + Core",
    planId: laufplan.id,
    performedAt: daysAgo(3, 7),
    exercises: [{ name: "Laufen", type: "cardio", durationMin: 31, distanceKm: 5.1 }],
  });

  /* ------------------------------ Chats ------------------------------ */
  await call("POST", `/conversations/${marco.id}/messages`, lena.token, { body: "Hi Marco! Die Kniebeugen fühlen sich mit 42,5 kg richtig gut an 💪" });
  await call("POST", `/conversations/${lena.id}/messages`, marco.token, { body: "Stark! Nächste Woche gehen wir auf 45 kg. Achte weiter auf die Tiefe." });
  await call("POST", `/conversations/${tom.id}/messages`, paul.token, { body: "Treffen wir uns Samstag wieder am Aachener Weiher?" });

  /* ----------------------------- Termine ----------------------------- */
  const [marcoPT] = marcoSettings.services;
  const lenaPT = await call("POST", "/appointments", lena.token, {
    trainerId: marco.id,
    serviceId: marcoPT.id,
    startsAt: await pickSlot(lena, marco.id, marcoPT.id, 1, 2),
    note: "Ich möchte an meiner Kniebeuge-Technik arbeiten.",
  });
  await call("PATCH", `/appointments/${lenaPT.id}`, marco.token, { action: "confirm", message: "Passt! Bring bitte flache Schuhe mit." });
  await call("POST", `/appointments/${lenaPT.id}/comments`, lena.token, { body: "Super, ich bin 5 Minuten früher da." });
  await call("PUT", `/appointments/${lenaPT.id}/note`, marco.token, { note: "Knie fällt bei tiefer Position nach innen – Mobility vorab." });

  await call("POST", "/appointments", jonas.token, {
    trainerId: marco.id,
    serviceId: marcoSettings.services[1].id,
    startsAt: await pickSlot(jonas, marco.id, marcoSettings.services[1].id, 3, 1),
    note: "Ich will 5 kg abnehmen – was sollte ich essen?",
  }); // offene Anfrage

  await call("POST", "/appointments", mia.token, {
    trainerId: sara.id,
    serviceId: saraSettings.services[0].id,
    startsAt: await pickSlot(mia, sara.id, saraSettings.services[0].id, 0, 1),
    note: "Ich bin neu und kenne die Geräte noch nicht.",
  }); // Mitglied ohne Coach fragt Einweisung an

  const guestDay = new Date();
  guestDay.setDate(guestDay.getDate() + ((3 - ((guestDay.getDay() + 6) % 7) + 7) % 7 || 7)); // nächster Donnerstag
  guestDay.setHours(17, 0, 0, 0);
  await call("POST", "/schedule", ironOwner.token, {
    trainerId: sara.id,
    guestName: "Max Interessent",
    category: "trial",
    title: "Probetraining",
    durationMin: 60,
    startsAt: guestDay.toISOString(),
    contactEmail: "max.interessent@example.com",
    contactPhone: "+49 176 9998877",
    note: "Hat sich telefonisch gemeldet, möchte Mitglied werden.",
  });

  /* ------------------------------ Kurse ------------------------------ */
  const yoga = await call("POST", "/studio/courses", ironOwner.token, {
    title: "Power Yoga",
    category: "Yoga",
    description: "Dynamisches Yoga für Kraft und Beweglichkeit. Für alle Level – Matten sind vorhanden.",
    location: "Kursraum 1",
    trainerId: sara.id,
    capacity: 12,
    durationMin: 60,
    schedule: [{ day: 0, start: "18:30" }, { day: 2, start: "18:30" }],
    active: true,
  });
  const ruecken = await call("POST", "/studio/courses", ironOwner.token, {
    title: "Rücken-Fit",
    category: "Gesundheit",
    description: "Kräftigung und Mobilisation für einen starken Rücken – ideal nach dem Bürotag.",
    location: "Kursraum 1",
    trainerId: marco.id,
    capacity: 8,
    durationMin: 45,
    schedule: [{ day: 1, start: "09:00" }, { day: 3, start: "19:00" }],
    active: true,
  });
  const vinyasa = await call("POST", "/studio/courses", flowOwner.token, {
    title: "Vinyasa Flow am Morgen",
    category: "Yoga",
    location: "Loft",
    trainerId: nina.id,
    capacity: 10,
    durationMin: 60,
    schedule: [0, 2, 4].map((day) => ({ day, start: "07:30" })),
    active: true,
  });
  await call("POST", `/courses/${yoga.id}/bookings`, mia.token, { startsAt: yoga.sessions[0].startsAt });
  await call("POST", `/courses/${yoga.id}/bookings`, lena.token, { startsAt: yoga.sessions[0].startsAt });
  await call("POST", `/courses/${ruecken.id}/bookings`, mia.token, { startsAt: ruecken.sessions[1].startsAt });
  await call("POST", `/courses/${vinyasa.id}/bookings`, elif.token, { startsAt: vinyasa.sessions[0].startsAt });

  return { ironOwner, flowOwner, marco, sara, nina, tom, lena, jonas, mia, paul, elif, ironCode };
}

const removed = await removeDemoAccounts();
console.log(`Alte Demo-Konten gelöscht: ${removed}`);
if (!process.argv.includes("--nur-loeschen")) {
  const r = await seed();
  console.log("Demo-Daten angelegt:");
  for (const [k, v] of Object.entries(r)) if (v?.email) console.log(`  ${k.padEnd(10)} ${v.email}`);
  console.log(`  Passwort für alle: ${PASSWORD}`);
  console.log(`  Mitglieds-Code Iron Gym: ${r.ironCode}`);
}
