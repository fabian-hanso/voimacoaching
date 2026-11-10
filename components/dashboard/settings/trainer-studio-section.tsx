"use client";

import { useMe } from "@/components/dashboard/shell";
import { StudioLogo } from "@/components/studio-logo";
import { Button, Input } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { useState } from "react";
import { Feedback, Msg } from "./settings-section";

export function TrainerStudioSection() {
  const { me, reload } = useMe();
  // Vorausgefüllt, wenn ein angemeldeter Trainer einen Studio-Link geöffnet hat (?studio=…)
  const [code, setCode] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (
          new URLSearchParams(window.location.search).get("studio") ?? ""
        ).toUpperCase(),
  );
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, setPending] = useState(false);

  if (me.studio) {
    return (
      <div className="flex items-center gap-4">
        <StudioLogo
          name={me.studio.name}
          logoUrl={me.studio.logoUrl}
          size="lg"
        />
        <div className="min-w-0">
          <p className="font-semibold text-fg">{me.studio.name}</p>
          <p className="text-sm text-fg-muted">
            Du gehörst zu diesem Studio. Das Studio kann deine Kunden bei
            Ausfall an Kollegen übergeben.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setMsg(null);
        try {
          await api("/me/studio", { body: { code } });
          setCode("");
          reload();
        } catch (err) {
          setMsg({ tone: "error", text: errorMessage(err) });
        } finally {
          setPending(false);
        }
      }}
    >
      <p className="text-sm text-fg-muted">
        Du arbeitest eigenständig. Hat dich ein Studio eingeladen, gib hier den
        Code ein – deine Kunden kommen mit ins Studio.
      </p>
      <div className="mt-4 flex max-w-sm gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().trim())}
          placeholder="Studio-Code"
          aria-label="Studio-Code"
          className="font-mono tracking-widest uppercase"
          required
        />
        <Button type="submit" className="shrink-0" disabled={pending}>
          Beitreten
        </Button>
      </div>
      <Feedback msg={msg} />
    </form>
  );
}
