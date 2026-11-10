"use client";

/** Letzte Rückfallebene, falls sogar das Root-Layout scheitert (eigenes <html>, ohne globale Styles). */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";
  return (
    <html lang="de">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f7f7f7", color: "#11120e" }}>
        <title>Fehler · Voima Coach</title>
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Da ist etwas schiefgelaufen</h1>
          <p style={{ color: "#4a4b47" }}>Bitte lade die Seite neu. Wenn das Problem bleibt, versuche es später erneut.</p>
          <button
            onClick={() => retry()}
            style={{ marginTop: 16, padding: "10px 16px", borderRadius: 8, border: 0, background: "#d3ff56", color: "#11120e", fontWeight: 600, cursor: "pointer" }}
          >
            Erneut versuchen
          </button>
          {digest && <p style={{ marginTop: 24, fontFamily: "monospace", fontSize: 12, color: "#656663" }}>Fehler-ID: {digest}</p>}
        </div>
      </body>
    </html>
  );
}
