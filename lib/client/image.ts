"use client";

const SIZE = 512;

/** Schneidet ein Bild mittig quadratisch zu und verkleinert es auf 512×512 (WebP, sonst JPEG). */
export async function toSquareAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Bitte wähle eine Bilddatei aus.");
  if (file.size > 30 * 1024 * 1024) throw new Error("Das Bild ist zu groß (max. 30 MB vor dem Zuschneiden).");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Dieses Bildformat wird nicht unterstützt. Bitte JPEG, PNG oder WebP verwenden.");
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(SIZE, side);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.85));
  const webp = await encode("image/webp");
  const blob = webp?.type === "image/webp" ? webp : await encode("image/jpeg"); // Safari kann teils kein WebP
  if (!blob) throw new Error("Bild konnte nicht verarbeitet werden.");
  return blob;
}

/**
 * Logo verkleinern, OHNE zuzuschneiden (Logos sind oft breit) und mit Transparenz.
 * Längste Seite max. 512 px, WebP (mit Alpha), sonst PNG.
 */
export async function toLogo(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Bitte wähle eine Bilddatei aus.");
  if (file.size > 30 * 1024 * 1024) throw new Error("Das Bild ist zu groß (max. 30 MB vor dem Verkleinern).");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Dieses Bildformat wird nicht unterstützt. Bitte PNG, JPEG oder WebP verwenden.");
  }
  const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.9));
  const webp = await encode("image/webp");
  const blob = webp?.type === "image/webp" ? webp : await encode("image/png");
  if (!blob) throw new Error("Logo konnte nicht verarbeitet werden.");
  return blob;
}
