export const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export function fmtDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Heute";
  if (d.toDateString() === yesterday.toDateString()) return "Gestern";
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

export function fmtPreviewTime(iso: string) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? fmtTime(iso)
    : new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
      }).format(d);
}
