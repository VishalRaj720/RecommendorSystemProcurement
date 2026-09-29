import { useEffect, useMemo, useState } from "react";
import { Scale } from "lucide-react";
import DocumentUploader from "../components/DocumentUploader.jsx";
import LanguageSelector from "../components/LanguageSelector.jsx";
import RecommendationCard from "../components/RecommendationCard.jsx";
import StandardDetailModal from "../components/StandardDetailModal.jsx";
import { recommend } from "../services/api.js";

const GAZETTE_LINE = "Dataset status is not a gazette. Confirm before publishing the tender.";

const DEMOS = [
  {
    id: "fire",
    label: "Demo: Fire doors",
    language: "en",
    text: "Supply and installation of fireproof barrier for hospital doors and fire-rated doorsets in a tertiary care building.",
  },
  {
    id: "it",
    label: "Demo: IT laptops",
    language: "en",
    text: "Procurement of laptops and office IT servers, information technology equipment safety, for departmental use.",
  },
  {
    id: "concrete",
    label: "Demo: Road concrete",
    language: "en",
    text: "Cement and reinforced concrete for road construction as per the code of practice for plain and reinforced concrete.",
  },
];

const MODE_LABEL = {
  rules: "Rules engine",
  llm: "Managed LLM",
  english_input: "English input",
  demo_map: "Demo phrase map",
  bhashini: "Bhashini",
  untranslated: "Untranslated",
};

export default function Dashboard({ health }) {
  const [language, setLanguage] = useState("en");
  const [description, setDescription] = useState("");
  const [validation, setValidation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [openCode, setOpenCode] = useState("");

  const lines = useMemo(() => description.split("\n"), [description]);

  useEffect(() => {
    function onKey(event) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        document.getElementById("run-audit")?.click();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function runAudit(nextText = description, nextLanguage = language) {
    if (!nextText.trim()) {
      setValidation("Enter a specification, or attach a PDF, before running the audit.");
      setError("");
      return;
    }
    setValidation("");
    setError("");
    setBusy(true);
    try {
      const payload = await recommend({
        description: nextText.trim(),
        language: nextLanguage,
        source: "dashboard",
      });
      setResult(payload);
    } catch (err) {
      setResult(null);
      setError(err.message || "The compliance service is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  function fillDemo(demo) {
    setLanguage(demo.language);
    setDescription(demo.text);
    setValidation("");
    runAudit(demo.text, demo.language);
  }

  const offline =
    health && (health.status === "ok" || health.status === "degraded")
      ? health.db === "ok"
        ? "384-d MiniLM vector engine active | offline mode"
        : "Engine reachable | database error"
      : "Engine unreachable";

  return (
    <div>
      <div className="grid gap-8 lg:grid-cols-[45%_1fr]">

        {/* Left Section (Input) */}
        <section className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm flex flex-col h-[fit-content]">
          <div className="border-b border-stone-200 px-6 py-4 flex justify-between items-center bg-[#fdfdfc]">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-[#a38048] shadow-sm"></div>
              <h2 className="font-mono text-[11px] font-bold tracking-[0.15em] text-slate-700">TENDER SPECIFICATION INPUT</h2>
            </div>
            <div className="font-mono text-[10px] tracking-widest text-slate-400 uppercase font-medium">
              {description ? description.split(/\s+/).filter(w => w.length > 0).length : 0} words · <span className="border border-stone-200 px-3 py-1 rounded-sm bg-slate-50 text-slate-500 shadow-inner">CLAUSE #01</span>
            </div>
          </div>

          <div className="flex min-h-[300px] bg-white border-b border-stone-100">
            <div className="w-12 shrink-0 border-r border-stone-100 bg-[#f9fafb] flex flex-col items-center py-5">
              <span className="w-6 h-6 flex items-center justify-center bg-stone-200/60 text-stone-600 font-mono text-[11px] rounded mb-1 shadow-inner font-bold">1</span>
            </div>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Paste the technical specification as it would appear in the tender draft."
              className="w-full resize-y bg-transparent px-6 py-5 font-serif text-[16px] text-slate-800 leading-relaxed outline-none"
            />
          </div>

          <div className="p-6">
            <div className="border-2 border-dashed border-stone-300 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors uppercase tracking-[0.1em] font-mono font-bold text-slate-500">
              <DocumentUploader
                disabled={busy}
                onError={(message) => { setError(message); setValidation(""); }}
                onText={(text) => { setDescription(text); setError(""); setValidation(""); }}
              />
            </div>
            {validation ? <p className="text-[13px] text-red-500 font-medium mt-3">{validation}</p> : null}

            <div className="mt-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-slate-400">Load sample procurement:</span>
                <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#a38048]">Default pump spec</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {DEMOS.map((demo) => (
                  <button key={demo.id} type="button" onClick={() => fillDemo(demo)} className="border border-stone-200 rounded-lg px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-[#111827] hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                    [{demo.label.toUpperCase()}]
                  </button>
                ))}
              </div>
            </div>

            <button id="run-audit" type="button" disabled={busy} onClick={() => runAudit()} className="mt-8 flex w-full items-center justify-between bg-[#111827] px-6 py-4 rounded-xl shadow-md hover:bg-slate-800 transition-colors disabled:opacity-60 group">
              <div className="flex items-center gap-4 text-yellow-500 group-hover:text-yellow-400 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /><path d="M18 6l3 3-3 3" /><path d="M18 9h-9" /></svg>
                <span className="text-[13px] font-bold uppercase tracking-[0.2em] text-white">{busy ? "Auditing..." : "RUN STATUTORY AUDIT"}</span>
              </div>
              <span className="border border-white/20 bg-white/10 px-3 py-1 font-mono text-[10px] text-slate-300 font-medium rounded tracking-widest">
                CTRL + ENTER
              </span>
            </button>
          </div>
        </section>

        {/* Right Section (Output) */}
        <section className="flex flex-col gap-6">
          <div className="bg-[#fefce8] border border-yellow-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3 absolute bottom-0 right-0 p-3 opacity-10">
              <svg className="w-32 h-32 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>

            <div className="flex items-center gap-3 mb-2">
              <svg className="w-5 h-5 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 20h20" /><path d="M2 14h20" /><path d="M5 14v6" /><path d="M19 14v6" /><path d="M12 4L4 14h16z" /></svg>
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#a38048]">AUDIT ADVISORY BANNER</h3>
              {result ? <span className="bg-yellow-200/50 text-yellow-800 px-2 py-0.5 rounded font-mono text-[9px] font-bold tracking-widest uppercase ml-2 border border-yellow-300/40">LIVE VALIDATED</span> : null}
            </div>

            {result ? (
              <p className="text-[13px] font-bold text-slate-800 mt-2 tracking-wide">
                Extraction: {MODE_LABEL[result.extraction_mode] || result.extraction_mode} · Input: {MODE_LABEL[result.translation_mode] || result.translation_mode}
              </p>
            ) : (
              <p className="text-[13px] font-bold text-slate-800 mt-2 tracking-wide">Desk is idle.</p>
            )}
            <p className="text-[12px] text-slate-700 mt-2 leading-relaxed max-w-lg font-medium">{GAZETTE_LINE}</p>
          </div>

          <div className="flex items-center justify-between border-b border-stone-200 pb-4 mt-2">
            <h3 className="font-mono text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-600 flex items-center gap-3">
              {result ? result.matches.length : 0} CATALOGUE MATCHES {result ? <span className="bg-[#111827] text-white px-2.5 py-[2px] rounded-full">{result.matches.length}</span> : null}
            </h3>
            <div className="flex items-center gap-3 font-mono text-[10px] font-bold tracking-widest uppercase">
              <span className="px-3 py-1.5 bg-[#111827] text-white rounded">ALL</span>
              <span className="px-3 py-1.5 border border-stone-200 text-red-500 rounded hover:bg-stone-50 cursor-pointer">QCO</span>
              <span className="px-3 py-1.5 border border-stone-200 text-emerald-500 rounded hover:bg-stone-50 cursor-pointer">ACTIVE</span>
              <button className="px-3 py-1.5 border border-stone-200 text-slate-600 rounded flex items-center gap-2 ml-2 hover:bg-stone-50 cursor-pointer shadow-sm" onClick={() => window.print()}><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> EXPORT</button>
            </div>
          </div>

          {error ? <div className="mt-2 border-2 border-dashed border-red-300 bg-red-50 px-6 py-4 rounded-xl text-[13px] text-red-600 font-medium">{error}</div> : null}

          {result ? (
            <div className="space-y-6 pt-2">
              {result.warnings?.length ? (
                <ul className="text-[12px] text-slate-500 list-disc list-inside px-2">
                  {result.warnings.map((w) => (<li key={w}>{w}</li>))}
                </ul>
              ) : null}
              {result.matches.length === 0 ? (
                <div className="border border-dashed border-stone-300 rounded-xl px-6 py-12 text-center bg-stone-50">
                  <p className="text-[13px] text-slate-500 font-medium">The audit returned no catalogue rows. Widen the specification or search by IS code.</p>
                </div>
              ) : (
                result.matches.map((match, idx) => (
                  <RecommendationCard key={match.is_code} match={match} rank={idx + 1} onOpen={setOpenCode} />
                ))
              )}
            </div>
          ) : !error ? (
            <div className="mt-2 border-2 border-dashed border-stone-200 rounded-2xl px-6 py-20 flex flex-col items-center justify-center text-center bg-[#fdfdfc]">
              <svg className="w-12 h-12 text-stone-300 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <p className="text-[14px] font-medium text-slate-400 leading-relaxed">Results will list here after an audit.<br />Empty submit is rejected on the desk.</p>
            </div>
          ) : null}
        </section>
      </div>

      <StandardDetailModal isCode={openCode} onClose={() => setOpenCode("")} />
    </div>
  );
}
