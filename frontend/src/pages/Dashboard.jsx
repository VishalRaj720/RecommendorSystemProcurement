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
      <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-stone-300 pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gazette">Tender workbench</p>
          <h2 className="font-serif text-[20px] text-bureau">Specification desk</h2>
        </div>
        <LanguageSelector value={language} onChange={setLanguage} />
      </div>

      <p className="no-print mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">{offline}</p>

      <div className="grid gap-0 border border-stone-300 lg:grid-cols-[45%_55%]">
        <section className="no-print border-b border-stone-300 lg:border-b-0 lg:border-r">
          <div className="flex min-h-[280px] border-b border-stone-200">
            <ol className="w-10 shrink-0 border-r border-paper-rule bg-[#f3f0e8] py-3 text-right font-mono text-[11px] leading-6 text-ink-muted">
              {lines.map((_, index) => (
                <li key={index} className="pr-2">
                  {index + 1}
                </li>
              ))}
            </ol>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Paste the technical specification as it would appear in the tender draft."
              className="min-h-[280px] w-full resize-y bg-paper px-3 py-3 font-serif text-[15px] leading-6 outline-none"
            />
          </div>
          <div className="space-y-3 p-4">
            <DocumentUploader
              disabled={busy}
              onError={(message) => {
                setError(message);
                setValidation("");
              }}
              onText={(text) => {
                setDescription(text);
                setError("");
                setValidation("");
              }}
            />
            {validation ? <p className="text-[13px] text-stamp">{validation}</p> : null}
            <div className="flex flex-wrap gap-2">
              {DEMOS.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  className="border border-stone-400 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
                  onClick={() => fillDemo(demo)}
                >
                  [{demo.label}]
                </button>
              ))}
            </div>
            <button
              id="run-audit"
              type="button"
              disabled={busy}
              onClick={() => runAudit()}
              className="flex w-full items-center justify-center gap-3 bg-bureau px-3 py-3 text-[12px] font-medium uppercase tracking-[0.18em] text-paper disabled:opacity-60"
            >
              {busy ? "Auditing…" : "Run compliance audit"}
              <span className="border border-paper/40 px-1.5 py-0.5 font-mono text-[10px] tracking-normal">
                Ctrl + Enter
              </span>
            </button>
          </div>
        </section>

        <section className="bg-[#fbfaf6] p-4">
          <div className="print-only mb-4" aria-hidden="true">
            <h2 className="font-serif text-2xl">Tender specification compliance summary</h2>
            <p className="text-sm">This export is a working note from a curated dataset. It is not a BIS publication.</p>
            <p className="text-sm">{GAZETTE_LINE}</p>
          </div>

          <div className="border border-stone-300 bg-paper px-4 py-3">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
              <Scale className="h-3.5 w-3.5" /> Audit banner
            </p>
            {result ? (
              <p className="mt-2 text-[13px]">
                Extraction: {MODE_LABEL[result.extraction_mode] || result.extraction_mode}. Translation:{" "}
                {MODE_LABEL[result.translation_mode] || result.translation_mode}.
              </p>
            ) : (
              <p className="mt-2 text-[13px] text-ink-muted">No audit on this desk yet.</p>
            )}
            <p className="mt-2 text-[12px] leading-relaxed text-ink">{GAZETTE_LINE}</p>
          </div>

          {error ? (
            <div className="mt-4 border border-stamp px-4 py-3 text-[13px] text-stamp">{error}</div>
          ) : null}

          {result ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                  {result.matches.length} catalogue {result.matches.length === 1 ? "match" : "matches"}
                </p>
                <button
                  type="button"
                  className="no-print border border-stone-400 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
                  onClick={() => window.print()}
                >
                  Print / export summary
                </button>
              </div>
              {result.warnings?.length ? (
                <ul className="text-[12px] text-ink-muted">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
              {result.matches.length === 0 ? (
                <p className="border border-stone-300 px-4 py-6 text-[13px] text-ink-muted">
                  The audit returned no catalogue rows. Widen the specification or search by IS code.
                </p>
              ) : (
                result.matches.map((match, index) => (
                  <RecommendationCard
                    key={match.is_code}
                    match={match}
                    rank={index + 1}
                    onOpen={setOpenCode}
                  />
                ))
              )}
            </div>
          ) : !error ? (
            <p className="mt-4 border border-stone-200 px-4 py-8 text-center text-[13px] text-ink-muted">
              Results will list here after an audit. Empty submit is rejected on the desk.
            </p>
          ) : null}
        </section>
      </div>

      <StandardDetailModal isCode={openCode} onClose={() => setOpenCode("")} />
    </div>
  );
}
