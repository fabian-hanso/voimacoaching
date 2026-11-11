"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, ModalHeader } from "@/components/dashboard/modal";
import { Icon } from "@/components/icons";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { SITE_NAME } from "@/lib/site";
import logoMark from "@/public/logo.jpg";
import {
  downloadCanvas,
  drawPoster,
  loadPosterAssets,
  POSTER_DEFAULTS,
  POSTER_HEIGHT,
  POSTER_LIMITS,
  POSTER_WIDTH,
  pxToCm,
  type PosterAssets,
  type QrSize,
} from "./member-poster";

/**
 * Overlay „Aushang gestalten“: Titel und Beschreibung anpassen, Live-Vorschau, PNG herunterladen.
 * Die Vorschau ist dasselbe Canvas, das exportiert wird (per CSS verkleinert).
 */
export function PosterDialog({
  url,
  code,
  studioName,
  logoUrl,
  onClose,
}: {
  url: string;
  code: string;
  studioName: string;
  logoUrl: string | null;
  onClose: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [assets, setAssets] = useState<PosterAssets | null>(null);
  const [failed, setFailed] = useState(false);
  const [title, setTitle] = useState(POSTER_DEFAULTS.title);
  const [description, setDescription] = useState(POSTER_DEFAULTS.description);
  const [saving, setSaving] = useState(false);
  const [qrSize, setQrSize] = useState<QrSize>("large");
  const [qrInfo, setQrInfo] = useState<{ qrPx: number; reduced: boolean } | null>(null);

  // Logos, QR-Code und Schrift einmal laden
  useEffect(() => {
    let cancelled = false;
    loadPosterAssets({ url, studioLogoUrl: logoUrl, brandLogoUrl: logoMark.src })
      .then((a) => !cancelled && setAssets(a))
      .catch((err) => {
        console.error(err);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url, logoUrl]);

  // Bei jeder Eingabe neu zeichnen
  useEffect(() => {
    if (assets && canvas.current) {
      setQrInfo(
        drawPoster(canvas.current, assets, {
        code,
        studioName,
        brandName: SITE_NAME,
        title,
        description,
        qrSize,
      }));
    }
  }, [assets, code, studioName, title, description, qrSize]);

  async function download() {
    if (!canvas.current) return;
    setSaving(true);
    try {
      const slug = studioName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      await downloadCanvas(canvas.current, `aushang-${slug}.png`);
    } finally {
      setSaving(false);
    }
  }

  const changed = title !== POSTER_DEFAULTS.title || description !== POSTER_DEFAULTS.description;

  return (
    <Modal label="Aushang gestalten" onClose={onClose} wide>
      <ModalHeader
        title="Aushang gestalten"
        subtitle="Für die Rezeption: A4-Hochformat mit QR-Code zur Anmeldung."
        onClose={onClose}
      />

      <div className="mt-5 grid gap-6 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="space-y-4">
          <Field label="Titel" hint={`Große Zeile unter dem QR-Code · ${title.length}/${POSTER_LIMITS.title}`}>
            <Input
              value={title}
              maxLength={POSTER_LIMITS.title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={POSTER_DEFAULTS.title}
            />
          </Field>
          <Field label="Beschreibung" hint={`Kleinere Zeile darunter · ${description.length}/${POSTER_LIMITS.description}`}>
            <Textarea
              rows={3}
              value={description}
              maxLength={POSTER_LIMITS.description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={POSTER_DEFAULTS.description}
            />
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-fg">Größe des QR-Codes</span>
            <div role="radiogroup" aria-label="Größe des QR-Codes" className="grid grid-cols-3 gap-1 rounded-control bg-surface-3 p-1">
              {(
                [
                  ["small", "Klein"],
                  ["medium", "Mittel"],
                  ["large", "Groß"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={qrSize === value}
                  onClick={() => setQrSize(value)}
                  className={
                    qrSize === value
                      ? "rounded-inner bg-surface py-1.5 text-sm font-semibold text-fg shadow-sm"
                      : "rounded-inner py-1.5 text-sm font-semibold text-fg-muted transition hover:text-fg"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="mt-1 block text-xs text-fg-muted">
              {qrInfo
                ? `Gedruckt auf A4 etwa ${pxToCm(qrInfo.qrPx).toLocaleString("de-DE", { maximumFractionDigits: 1 })} cm breit${qrInfo.reduced ? " – wegen langer Texte etwas kleiner als gewählt" : ""}.`
                : " "}
            </span>
          </div>
          <p className="text-xs text-fg-muted">
            {logoUrl
              ? "Oben steht euer Studio-Logo, darunter der Studioname. Der Mitglieds-Code steht als Rückfallweg unter dem Text."
              : "Ohne Studio-Logo steht oben unser Logo. Ein eigenes Logo lädst du unter „Studio-Profil“ hoch."}
          </p>
          {changed && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setTitle(POSTER_DEFAULTS.title);
                setDescription(POSTER_DEFAULTS.description);
              }}
            >
              Texte zurücksetzen
            </Button>
          )}
        </div>

        {/* Vorschau = Export-Canvas, verkleinert */}
        <div className="order-first sm:order-none">
          <p className="mb-1.5 text-sm font-medium text-fg">Vorschau</p>
          <div
            className="relative mx-auto w-44 overflow-hidden rounded-tile bg-surface-2 shadow-md ring-1 ring-line sm:w-full"
            style={{ aspectRatio: `${POSTER_WIDTH} / ${POSTER_HEIGHT}` }}
          >
            <canvas
              ref={canvas}
              aria-label="Vorschau des Aushangs"
              role="img"
              className="absolute inset-0 size-full"
            />
            {!assets && !failed && (
              <span className="absolute inset-0 grid place-items-center">
                <span className="size-6 animate-spin rounded-full border-2 border-line border-t-brand-ink" />
              </span>
            )}
          </div>
        </div>
      </div>

      {failed && (
        <div className="mt-4">
          <Alert>Der Aushang konnte nicht vorbereitet werden. Bitte schließe das Fenster und versuche es erneut.</Alert>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Abbrechen
        </Button>
        <Button onClick={download} disabled={!assets || saving}>
          <Icon name="arrow" className="size-4 rotate-90" />
          {saving ? "Wird erstellt …" : "Als PNG herunterladen"}
        </Button>
      </div>
    </Modal>
  );
}
