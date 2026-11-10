"use client";

import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { authErrorMessage } from "@/lib/client/errors";
import { hardNavigate } from "@/lib/client/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useState } from "react";
import { AuthLike, Feedback, Msg } from "./settings-section";

export function SessionsSection() {
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-md text-sm text-fg-muted">
          Meldet dich überall ab: im Browser, in der App und auf allen anderen
          Geräten. Danach musst du dich neu anmelden.
        </p>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            setMsg(null);
            try {
              const { error } = await supabaseBrowser().auth.signOut({
                scope: "global",
              });
              if (error) throw error;
              hardNavigate("/login");
            } catch (err) {
              setMsg({
                tone: "error",
                text: authErrorMessage(err as AuthLike),
              });
              setPending(false);
            }
          }}
        >
          <Icon name="logout" className="size-4" />{" "}
          {pending ? "Wird abgemeldet …" : "Überall abmelden"}
        </Button>
      </div>
      <Feedback msg={msg} />
    </>
  );
}
