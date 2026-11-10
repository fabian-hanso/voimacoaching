"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useMe } from "@/components/dashboard/shell";
import { Avatar, Button, Input } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/errors";
import { useState } from "react";
import { Feedback, Msg } from "./settings-section";

export function CoachSection() {
  const { me, reload } = useMe();
  const [confirm, setConfirm] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<Msg>(null);

  if (!me.trainer) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg(null);
          try {
            await api("/me/trainer", { body: { inviteCode: code } });
            setCode("");
            reload();
          } catch (err) {
            setMsg({ tone: "error", text: errorMessage(err) });
          }
        }}
      >
        <p className="text-sm text-fg-muted">
          Du bist aktuell mit keinem Coach verbunden.
        </p>
        <div className="mt-4 flex max-w-sm gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().trim())}
            placeholder="Einladungscode"
            aria-label="Einladungscode"
            className="font-mono tracking-widest uppercase"
            required
          />
          <Button type="submit" className="shrink-0">
            Verbinden
          </Button>
        </div>
        <Feedback msg={msg} />
      </form>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={me.trainer.name} src={me.trainer.avatarUrl} size="2xl" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-fg">{me.trainer.name}</p>
          <p className="truncate text-sm text-fg-muted">{me.trainer.email}</p>
        </div>
        <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
          Verbindung trennen
        </Button>
      </div>
      {confirm && (
        <ConfirmDialog
          title={`Verbindung zu ${me.trainer.name} trennen?`}
          description={
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Die Pläne von {me.trainer.name} werden dir nicht mehr angezeigt.
              </li>
              <li>Ihr könnt euch keine Nachrichten mehr schreiben.</li>
              <li>{me.trainer.name} sieht deinen Fortschritt nicht mehr.</li>
              <li>Deine eigenen Workouts und Messwerte bleiben erhalten.</li>
              <li>{me.trainer.name} wird darüber informiert.</li>
            </ul>
          }
          confirmWord="trennen"
          confirmLabel="Verbindung trennen"
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            await api("/me/trainer", { method: "DELETE" });
            setConfirm(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
