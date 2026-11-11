/**
 * Aushang für die Rezeption: Logo, QR-Code zum Mitglieds-Beitritt, Titel und Beschreibung als PNG (A4 hoch, 150 dpi).
 * Läuft komplett im Browser (Canvas). Studio-Logos liegen im Supabase-Speicher, der CORS erlaubt – sonst wäre
 * das Canvas „verunreinigt“ und ließe sich nicht exportieren. Scheitert das Laden, wird unser Logo genutzt.
 *
 * Aufgeteilt in `loadPosterAssets` (einmal: Bilder, QR-Code, Schrift) und `drawPoster` (bei jeder Eingabe neu),
 * damit die Vorschau im Overlay flüssig bleibt.
 */

export const POSTER_WIDTH = 1240;
export const POSTER_HEIGHT = 1754;
const W = POSTER_WIDTH;
const H = POSTER_HEIGHT;
const INK = "#11120e";
const MUTED = "#5b5c58";
const LIME = "#d3ff56";

export const POSTER_DEFAULTS = {
  title: "Hier zur Anmeldung für Kurse & Personal Trainings",
  description: "Mit der Handy-Kamera scannen und kostenlos registrieren.",
};
export const POSTER_LIMITS = { title: 80, description: 160 };

/** Größe der QR-Fläche (Lime) in px; der QR-Code selbst ist 120 px kleiner. Bei wenig Platz wird verkleinert. */
export const QR_SIZES = { small: 460, medium: 600, large: 760 } as const;
export type QrSize = keyof typeof QR_SIZES;

/** Druckgröße auf A4 (21 cm Breite) in cm */
export const pxToCm = (px: number) => (px * 21) / POSTER_WIDTH;

export interface PosterAssets {
  qr: HTMLImageElement;
  brandLogo: HTMLImageElement;
  studioLogo: HTMLImageElement | null;
  fontFamily: string;
}

export interface PosterContent {
  code: string;
  studioName: string;
  brandName: string;
  title: string;
  description: string;
  qrSize: QrSize;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Bild nicht ladbar: ${src}`));
    img.src = src;
  });
}

/** Einmal laden: QR-Code (aus dem Beitritts-Link), Logos und die Schrift der App. */
export async function loadPosterAssets({
  url,
  studioLogoUrl,
  brandLogoUrl,
}: {
  url: string;
  studioLogoUrl: string | null;
  brandLogoUrl: string;
}): Promise<PosterAssets> {
  const QR = await import("qrcode");
  const qrData = await QR.toDataURL(url, {
    width: 880,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: INK, light: "#ffffff" },
  });
  await document.fonts?.ready;
  const [qr, brandLogo, studioLogo] = await Promise.all([
    loadImage(qrData),
    loadImage(brandLogoUrl),
    studioLogoUrl ? loadImage(studioLogoUrl).catch(() => null) : Promise.resolve(null),
  ]);
  return {
    qr,
    brandLogo,
    studioLogo,
    fontFamily: getComputedStyle(document.body).fontFamily || "system-ui, sans-serif",
  };
}

/** Bild proportional in eine Box einpassen und zentriert zeichnen. */
function drawContained(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, top: number, maxW: number, maxH: number) {
  const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, cx - w / 2, top + (maxH - h) / 2, w, h);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Text in Zeilen aufteilen, die höchstens `maxW` breit sind (mit aktuell gesetzter Schrift). */
function splitLines(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else line = test;
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Aushang auf ein Canvas zeichnen (setzt die Größe selbst). Fließendes Layout von oben nach unten:
 * Logo, Studioname, QR-Code (bekommt den verbleibenden Platz), Titel, Beschreibung, Mitglieds-Code, Fußzeile.
 */
export function drawPoster(canvas: HTMLCanvasElement, assets: PosterAssets, content: PosterContent): { qrPx: number; reduced: boolean } {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas wird nicht unterstützt.");
  const font = (weight: number, size: number) => `${weight} ${size}px ${assets.fontFamily}`;
  const cx = W / 2;
  const maxTextW = W - 200;
  const title = content.title.trim();
  const description = content.description.trim();

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  let y = 90;

  // Kopf: Logo + Studioname
  drawContained(ctx, assets.studioLogo ?? assets.brandLogo, cx, y, 520, 200);
  y += 200 + 40;
  ctx.fillStyle = INK;
  ctx.font = font(800, 60);
  for (const line of splitLines(ctx, content.studioName, maxTextW)) {
    ctx.fillText(line, cx, y);
    y += 70;
  }
  y += 40;

  // Platz für alles unter dem QR-Code vorab berechnen
  ctx.font = font(800, 54);
  const titleLines = title ? splitLines(ctx, title, maxTextW) : [];
  ctx.font = font(500, 32);
  const descLines = description ? splitLines(ctx, description, maxTextW) : [];
  const footerReserve = assets.studioLogo ? 120 : 70;
  const below =
    50 +
    titleLines.length * 64 +
    (titleLines.length && descLines.length ? 16 : 0) +
    descLines.length * 42 +
    44 +
    36 +
    14 +
    60 +
    footerReserve;
  const available = H - y - below;
  const panel = Math.max(420, Math.min(QR_SIZES[content.qrSize], available));
  // Kleinerer QR-Code: gewonnenen Platz gleichmäßig über und unter der QR-Fläche verteilen
  const spare = Math.max(0, available - panel) / 3;
  y += spare;

  // QR-Code auf Lime-Fläche
  ctx.fillStyle = LIME;
  roundRect(ctx, cx - panel / 2, y, panel, panel, 48);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cx - panel / 2 + 30, y + 30, panel - 60, panel - 60, 32);
  ctx.fill();
  const qrSize = panel - 120;
  ctx.drawImage(assets.qr, cx - qrSize / 2, y + 60, qrSize, qrSize);
  y += panel + 50 + spare;

  // Titel und Beschreibung
  ctx.fillStyle = INK;
  ctx.font = font(800, 54);
  for (const line of titleLines) {
    ctx.fillText(line, cx, y);
    y += 64;
  }
  if (titleLines.length && descLines.length) y += 16;
  ctx.fillStyle = MUTED;
  ctx.font = font(500, 32);
  for (const line of descLines) {
    ctx.fillText(line, cx, y);
    y += 42;
  }
  y += 44;

  // Code als Rückfallweg
  ctx.font = font(500, 28);
  ctx.fillText("Oder bei der Registrierung den Mitglieds-Code eingeben:", cx, y);
  y += 36 + 14;
  ctx.fillStyle = INK;
  ctx.font = `700 52px ui-monospace, "SF Mono", Menlo, monospace`;
  ctx.fillText(content.code.split("").join(" "), cx, y);

  // Fußzeile: „powered by“ nur, wenn oben das Studio-Logo steht
  if (assets.studioLogo) {
    ctx.textBaseline = "alphabetic";
    const footY = H - 56;
    const label = "powered by";
    ctx.font = font(700, 26);
    const nameW = ctx.measureText(content.brandName).width;
    ctx.font = font(500, 26);
    const labelW = ctx.measureText(label).width;
    const icon = 34;
    let x = cx - (labelW + 14 + icon + 10 + nameW) / 2;
    ctx.textAlign = "left";
    ctx.fillStyle = MUTED;
    ctx.fillText(label, x, footY);
    x += labelW + 14;
    ctx.save();
    roundRect(ctx, x, footY - icon + 6, icon, icon, 8);
    ctx.clip();
    ctx.drawImage(assets.brandLogo, x, footY - icon + 6, icon, icon);
    ctx.restore();
    x += icon + 10;
    ctx.fillStyle = INK;
    ctx.font = font(700, 26);
    ctx.fillText(content.brandName, x, footY);
  }
  return { qrPx: qrSize, reduced: panel < QR_SIZES[content.qrSize] };
}

/** Canvas als PNG herunterladen. */
export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Export fehlgeschlagen."));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, "image/png"),
  );
}
