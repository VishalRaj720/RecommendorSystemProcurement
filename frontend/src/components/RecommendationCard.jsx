import { ExternalLink, GitBranch, ShieldAlert } from "lucide-react";
import QCOBadge from "./QCOBadge.jsx";

export default function RecommendationCard({ match, rank, onOpen }) {
  const revised = match.alerts?.includes("LATEST_VERSION_ALERT");
  const mandatory = match.alerts?.includes("MANDATORY_COMPLIANCE") || (match.qco && match.qco.evidence_level === "cited" && match.qco.is_mandatory);

  return (
    <article className={`bg-white border rounded-3xl shadow-sm overflow-hidden mb-6 ${mandatory ? 'border-red-500 border-2' : 'border-stone-200'}`}>
      <header className="flex items-start justify-between gap-3 px-8 py-6">
        <div>
          <div className="flex items-center gap-3">
            <p className="font-mono text-[10px] uppercase font-extrabold tracking-[0.15em] text-slate-800">
              MATCH {String(rank).padStart(2, "0")}
            </p>
            <span className="text-slate-300 mt-[-2px]">•</span>
            {match.distance != null ? <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500 font-bold">D {match.distance.toFixed(4)}</p> : null}
          </div>

          <button
            type="button"
            onClick={() => onOpen(match.is_code)}
            className="mt-3 text-left font-serif text-[28px] font-bold leading-none tracking-tight text-[#111827] hover:text-blue-600 transition-colors"
          >
            {match.is_code}
          </button>
          <p className="mt-3 text-[14px] text-slate-600 leading-relaxed max-w-2xl font-medium">{match.title}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <QCOBadge qco={match.qco} alerts={match.alerts} />
          {!mandatory && <span className="inline-flex items-center justify-center border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm">ACTIVE</span>}
        </div>
      </header>

      {revised ? (
        <div className="flex items-start gap-3 border-t border-orange-200/60 bg-orange-50/50 px-8 py-3 text-[12px] text-orange-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
          <p>
            <span className="font-bold uppercase tracking-widest font-mono text-[10px]">Revised</span> —
            {match.successor_is_code ? (
              <>
                {" "}Successor →{" "}
                <button type="button" className="font-mono tracking-wide underline font-bold" onClick={() => onOpen(match.successor_is_code)}>
                  {match.successor_is_code}
                </button>
              </>
            ) : (
              " No successor stored."
            )}
          </p>
        </div>
      ) : null}

      <div className="px-8 pb-5 border-t border-stone-100 flex justify-between items-center pt-5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <p className="text-[11px] text-slate-500 font-mono tracking-widest uppercase font-bold">Harmonized BIS Spec</p>
        </div>
        <button className="text-[11px] font-bold text-slate-800 font-mono tracking-widest uppercase hover:text-blue-600">View Clauses →</button>
      </div>

      {match.qco ? (
        <section className={`border-t px-8 py-6 bg-[#fcfbf9] ${mandatory ? 'border-red-100' : 'border-stone-100'}`}>
          <div className="flex justify-between items-start mb-4">
            <p className="font-mono text-[10px] uppercase font-bold tracking-[0.2em] text-[#a38048]">Gazette Panel Reference</p>
            <p className="font-mono text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 flex items-center gap-1">MEITY NOTICE <ExternalLink className="w-3 h-3 hover:text-blue-600 cursor-pointer" /></p>
          </div>
          <p className="font-bold text-slate-800 text-[15px] max-w-2xl leading-snug">{match.qco.qco_title}</p>
          <p className="text-slate-500 text-[13px] font-mono tracking-tight mt-1.5">{match.qco.issuing_ministry}</p>

          <div className="border-t border-stone-200 mt-5 pt-4">
            {match.qco.notification_ref ? (
              <p className="font-mono text-[11px] text-slate-500 leading-relaxed max-w-3xl">{match.qco.notification_ref}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {match.normative_references?.length ? (
        <section className="px-8 py-5 border-t border-stone-100 bg-slate-50">
          <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            <GitBranch className="h-3 w-3" /> Normative references
          </p>
          <ol className="space-y-2 text-[12px]">
            {match.normative_references.map((item) => (
              <li key={`${item.is_code}-${item.hop}-${item.relationship_type}`} className="flex items-center gap-2">
                <span className="text-slate-500 font-mono">{match.is_code}</span>
                <span className="text-slate-300">→</span>
                <button type="button" className="font-mono font-bold tracking-wide text-slate-800 hover:text-blue-600 transition-colors" onClick={() => onOpen(item.is_code)}>
                  {item.is_code}
                </button>
                <span className="ml-2 font-mono text-[9px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded border border-stone-200 shadow-sm uppercase tracking-[0.14em]">
                  {item.relationship_type} (Hop {item.hop})
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}
