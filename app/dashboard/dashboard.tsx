"use client";

import { useState } from "react";
import { Badge } from "@/components/ui";
import { ClientView } from "./client-view";
import { useMe } from "./shell";
import { TrainerView } from "./trainer-view";
import { StudioView } from "./studio-view";

export function DashboardHome() {
  const { me, reload } = useMe();
  return (
    <>
      <div className="mb-10">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            Hallo, {me.user.name.split(" ")[0]} 👋
          </h1>
          <Badge tone="brand">{{ trainer: "Trainer", client: "Kunde", studio: "Studio" }[me.user.role]}</Badge>
        </div>
        <p className="mt-2 text-fg-muted">
          <Today />
          {
            {
              trainer: " · Hier ist der Überblick über deine Kunden.",
              client: " · Bereit für dein nächstes Training?",
              studio: " · Dein Team und eure Kunden auf einen Blick.",
            }[me.user.role]
          }
        </p>
      </div>
      {me.user.role === "studio" ? <StudioView /> : me.user.role === "trainer" ? <TrainerView /> : <ClientView me={me} onMeChange={reload} />}
    </>
  );
}

/** Heutiges Datum, z. B. „Montag, 9. November“. */
function Today() {
  const [label] = useState(() =>
    new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" }).format(new Date()),
  );
  return <>{label}</>;
}

