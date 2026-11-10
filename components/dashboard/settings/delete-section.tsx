"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useMe } from "@/components/dashboard/shell";
import { Button } from "@/components/ui";
import { api } from "@/lib/client/api";
import { hardNavigate } from "@/lib/client/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useState } from "react";

export function DeleteSection() {
  const { me } = useMe();
  const [confirm, setConfirm] = useState(false);
  const isTrainer = me.user.role === "trainer";

  return (
    <div>
      <p className="text-sm text-fg-muted">
        {me.user.role === "studio"
          ? "Löscht dein Konto und löst dein Studio auf. Deine Trainer und deren Kunden bleiben bestehen und arbeiten eigenständig weiter – die Trainer bekommen einen Hinweis."
          : isTrainer
            ? "Löscht dein Konto mit allen Plänen, Einladungen und Nachrichten. Deine Kunden behalten ihre Konten und Trainingsdaten, verlieren aber die Verbindung zu dir – sie bekommen einen Hinweis."
            : `Löscht dein Konto mit allen Workouts, Messwerten, Nachrichten und deinem Profilbild.${me.trainer ? ` ${me.trainer.name} bekommt einen Hinweis, dass du dein Konto gelöscht hast.` : ""}`}
      </p>
      <div className="mt-6 flex justify-end">
        <Button
          className="bg-danger text-danger-fg hover:bg-danger/90"
          onClick={() => setConfirm(true)}
        >
          Konto löschen
        </Button>
      </div>
      {confirm && (
        <ConfirmDialog
          title="Konto endgültig löschen?"
          description={
            <p>
              Alle Daten von <strong>{me.user.email}</strong> werden sofort und
              unwiderruflich gelöscht. Das kann nicht rückgängig gemacht werden.
            </p>
          }
          confirmLabel="Konto endgültig löschen"
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            await api("/me", { method: "DELETE" });
            await supabaseBrowser()
              .auth.signOut({ scope: "local" })
              .catch(() => {});
            hardNavigate("/");
          }}
        />
      )}
    </div>
  );
}
