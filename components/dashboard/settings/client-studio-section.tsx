"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useMe } from "@/components/dashboard/shell";
import { StudioLogo } from "@/components/studio-logo";
import { Button, Input } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { useState } from "react";
import { Feedback, Msg } from "./settings-section";

/** Kunden: Studio per Mitglieds-Code beitreten (auch über QR-Link vorausgefüllt) oder verlassen. */
export function ClientStudioSection() {
  const { me, reload } = useMe();
  const [code, setCode] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (
          new URLSearchParams(window.location.search).get("mitglied") ?? ""
        ).toUpperCase(),
  );
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (me.studio) {
    const coachInStudio = !!me.trainer && !me.user.studioMember;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <StudioLogo
            name={me.studio.name}
            logoUrl={me.studio.logoUrl}
            size="lg"
          />
          <div className="min-w-0">
            <p className="font-semibold text-fg">{me.studio.name}</p>
            <p className="text-sm text-fg-muted">
              {me.user.studioMember
                ? me.trainer
                  ? `Du bist Mitglied – zusätzlich betreut dich ${me.trainer.name}.`
                  : "Du bist Mitglied – Kurse und 1:1-Termine bei allen Trainern stehen dir offen."
                : me.trainer
                  ? `Du gehörst über deinen Coach ${me.trainer.name} zum Studio.`
                  : "Du gehörst zum Studio."}
            </p>
          </div>
        </div>
        <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
          Studio verlassen
        </Button>
        <Feedback msg={msg} />
        {confirm && (
          <ConfirmDialog
            title={`${me.studio.name} verlassen?`}
            description={
              <>
                Deine künftigen Kursanmeldungen und Termine bei Trainern des
                Studios werden storniert.
                {me.trainer &&
                  (coachInStudio
                    ? ` Auch die Verbindung zu deinem Coach ${me.trainer.name} endet.`
                    : ` Gehört dein Coach ${me.trainer.name} zum Studio, endet auch diese Verbindung.`)}{" "}
                Deine Workouts und Messwerte bleiben erhalten.
              </>
            }
            confirmWord="verlassen"
            confirmLabel="Studio verlassen"
            onConfirm={async () => {
              await api("/me/studio", { method: "DELETE" });
              setConfirm(false);
              setMsg({
                tone: "success",
                text: "Du hast das Studio verlassen.",
              });
              reload();
            }}
            onClose={() => setConfirm(false)}
          />
        )}
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
          setMsg({
            tone: "success",
            text: "Willkommen im Studio! Kurse und Termine findest du auf der Studio-Seite.",
          });
          reload();
        } catch (err) {
          setMsg({ tone: "error", text: errorMessage(err) });
        } finally {
          setPending(false);
        }
      }}
    >
      <p className="text-sm text-fg-muted">
        Du gehörst zu keinem Studio. Den Code bekommst du an der Rezeption –
        oder scanne den QR-Code dort.
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
          Mitglied werden
        </Button>
      </div>
      <Feedback msg={msg} />
    </form>
  );
}
