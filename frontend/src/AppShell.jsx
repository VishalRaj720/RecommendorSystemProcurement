import { NavLink } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function AppShell({ health, children }) {
  const engineOk = health?.db === "ok";

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <header className="no-print bg-white pt-6 pb-2 border-b border-stone-200">
        <div className="mx-auto flex max-w-7xl flex-col px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-[#111827] w-12 h-12 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-serif text-[26px] font-bold tracking-tight text-slate-800 leading-none">BIS-Procure Ledger</h1>
                  <span className="text-slate-300">|</span>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">DoCA · SIH 26108</p>
                </div>
                <p className="mt-1.5 text-[12px] text-slate-500 font-medium tracking-wide">
                  Dept. of Consumer Affairs · Statutory Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select className="border border-stone-200 rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-600 bg-white hover:bg-slate-50 outline-none">
                <option>EN</option>
                <option>HI</option>
              </select>
              <button className="border border-stone-200 rounded-full p-1.5 hover:bg-slate-50 text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              </button>
            </div>
          </div>

          <nav className="flex gap-3 font-mono text-[11px] uppercase tracking-[0.14em] mt-8">
            <NavLink to="/" className={({ isActive }) => (isActive ? "bg-[#111827] text-white rounded-full px-5 py-2 flex items-center gap-2" : "border rounded-full px-5 py-2 text-slate-500 border-stone-300 hover:bg-stone-50")}>
              Specification Desk <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full inline-block"></span>
            </NavLink>
            <NavLink to="/search" className="border rounded-full px-5 py-2 text-slate-500 border-stone-300 hover:bg-stone-50">
              Audit Gazette DB
            </NavLink>
            <button className="border rounded-full px-5 py-2 text-slate-500 border-stone-300 hover:bg-stone-50">Code Search</button>
            <button className="border rounded-full px-5 py-2 text-slate-500 border-stone-300 hover:bg-stone-50">Logs (12)</button>
          </nav>
        </div>
      </header>

      <div className="bg-white border-b border-stone-200 text-[10px] font-mono tracking-widest uppercase">
        <div className="mx-auto max-w-7xl px-8 py-2.5 flex justify-between items-center text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 384-D MiniLM Vector Engine
          </div>
          <div className="h-4 w-px bg-stone-300"></div>
          <div className="flex items-center gap-2 font-semibold text-emerald-600">
            <CheckCircle2 className="w-3 h-3" /> Offline Local Mode
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-6 pb-24">{children}</main>

      <footer className="px-4 py-6 text-center text-[11px] leading-relaxed text-slate-400">
        Independent verification against official BIS gazette notifications required before tender publication.<br />
        Curated demo catalogue — not the full BIS library.
      </footer>
    </div>
  );
}
