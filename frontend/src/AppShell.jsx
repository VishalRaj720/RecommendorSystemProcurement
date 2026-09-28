import { NavLink } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function AppShell({ health, children }) {
  const engineOk = health?.db === "ok";

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-stone-300">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4 px-4 py-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-gazette">DoCA · SIH 26108</p>
            <h1 className="font-serif text-[32px] font-semibold leading-none text-bureau">BIS-Procure Ledger</h1>
            <p className="mt-2 max-w-xl text-[13px] text-ink-muted">
              Department of Consumer Affairs — Statutory Compliance Assistant
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <span
              className={`inline-flex items-center gap-2 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${
                engineOk ? "border-mark text-mark" : "border-stamp text-stamp"
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              {engineOk ? "MiniLM · db ok" : "Service / database down"}
            </span>
            <nav className="flex gap-4 font-mono text-[11px] uppercase tracking-[0.16em]">
              <NavLink to="/" className={({ isActive }) => (isActive ? "text-bureau" : "text-ink-muted")}>
                Workbench
              </NavLink>
              <NavLink to="/search" className={({ isActive }) => (isActive ? "text-bureau" : "text-ink-muted")}>
                Code search
              </NavLink>
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="border-t border-stone-300 px-4 py-4 text-center text-[11px] leading-relaxed text-ink-muted">
        Independent verification against official BIS gazette notifications required before tender publication.
        Curated demo catalogue — not the full BIS library. This screen is not a BIS publication.
      </footer>
    </div>
  );
}
