"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon } from "@/components/icons";
import { Button, Card } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useEffect, useState } from "react";

export function MemberCodeCard({
  code,
  studioName,
  onRenewed,
}: {
  code: string;
  studioName: string;
  onRenewed: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [renew, setRenew] = useState(false);

  useEffect(() => {
    const url = `${window.location.origin}/registrieren?rolle=kunde&mitglied=${code}`;
    let cancelled = false;
    void import("qrcode").then((QR) =>
      QR.toDataURL(url, {
        width: 640,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#11120e", light: "#ffffff" },
      }).then((data) => {
        if (cancelled) return;
        setQr(data);
        setLink(url);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <Card className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="grid size-36 shrink-0 place-items-center self-center rounded-tile bg-white p-2 ring-1 ring-line">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element -- lokal erzeugter QR-Code (data:-URL)
          <img
            src={qr}
            alt={`QR-Code zum Beitritt bei ${studioName}`}
            className="size-full"
          />
        ) : (
          <span className="size-6 animate-spin rounded-full border-2 border-line border-t-brand-ink" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-fg">Mitglieder einladen</p>
        <p className="mt-1 text-sm text-fg-muted">
          Hänge den QR-Code an der Rezeption aus oder teile den Code. Mitglieder
          brauchen keinen festen Coach – sie sehen eure Kurse, buchen
          1:1-Termine bei allen Trainern und bekommen eure Benachrichtigungen.
        </p>
        <p className="mt-3 font-mono text-2xl font-bold tracking-[0.25em] text-fg">
          {code}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={!link}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                window.prompt("Link kopieren:", link);
              }
            }}
          >
            <Icon name={copied ? "check" : "arrow"} className="size-3.5" />{" "}
            {copied ? "Kopiert" : "Link kopieren"}
          </Button>
          {qr && (
            <a
              href={qr}
              download={`qr-${studioName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`}
              className="inline-flex items-center gap-2 rounded-control bg-surface-3 px-2.5 py-1.5 text-xs font-semibold text-fg ring-1 ring-line-strong transition hover:bg-line-strong"
            >
              <Icon name="camera" className="size-3.5" /> QR-Code herunterladen
            </a>
          )}
          <Button size="sm" variant="ghost" onClick={() => setRenew(true)}>
            Code erneuern
          </Button>
        </div>
      </div>
      {renew && (
        <ConfirmDialog
          title="Mitglieds-Code erneuern?"
          description="Der bisherige Code und ausgehängte QR-Codes funktionieren danach nicht mehr. Bestehende Mitglieder bleiben Mitglieder."
          confirmWord="erneuern"
          confirmLabel="Neuen Code erzeugen"
          onConfirm={async () => {
            await api("/studio/join-code", { method: "POST" });
            setRenew(false);
            onRenewed();
          }}
          onClose={() => setRenew(false)}
        />
      )}
    </Card>
  );
}
