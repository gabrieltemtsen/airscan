"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", padding: "2rem", background: "#0A1628", color: "#fff", minHeight: "100vh" }}>
        <div style={{ maxWidth: 480, margin: "4rem auto", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: 8, color: "#F5A623" }}>Something went wrong</h1>
          <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: "0.9rem" }}>
            {error?.message || "An unexpected error occurred."}
            {error?.digest ? <><br /><code style={{ fontSize: "0.75rem" }}>Digest: {error.digest}</code></> : null}
          </p>
          <button
            onClick={reset}
            style={{ background: "#F5A623", color: "#0A1628", border: "none", padding: "10px 24px", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
