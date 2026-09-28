import { useState } from "react";
import StandardDetailModal from "../components/StandardDetailModal.jsx";
import { getStandard } from "../services/api.js";

export default function StandardSearch() {
  const [query, setQuery] = useState("IS 456");
  const [error, setError] = useState("");
  const [record, setRecord] = useState(null);
  const [openCode, setOpenCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    if (!query.trim()) {
      setError("Enter an IS code.");
      setRecord(null);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await getStandard(query.trim());
      setRecord(data);
    } catch (err) {
      setRecord(null);
      setError(err.message || "Standard not found.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gazette">Catalogue lookup</p>
      <h2 className="font-serif text-[22px] text-bureau">Search by Indian Standard code</h2>
      <form onSubmit={onSubmit} className="mt-4 flex flex-wrap gap-2 border border-stone-300 p-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-[16rem] flex-1 border border-stone-300 bg-paper px-3 py-2 font-mono tracking-wide outline-none"
          placeholder="IS 13252 (Part 1)"
        />
        <button
          type="submit"
          disabled={busy}
          className="bg-bureau px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-paper"
        >
          {busy ? "Looking up…" : "Open docket"}
        </button>
      </form>
      {error ? <p className="mt-3 border border-stamp px-3 py-2 text-[13px] text-stamp">{error}</p> : null}
      {record ? (
        <article className="mt-4 border border-stone-300 p-4">
          <button
            type="button"
            className="font-serif text-[24px] tracking-wide text-bureau"
            onClick={() => setOpenCode(record.is_code)}
          >
            {record.is_code}
          </button>
          <p className="mt-1">{record.title}</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            {record.status} · {record.category}
          </p>
          <p className="mt-3 text-[14px] leading-relaxed">{record.scope_summary}</p>
        </article>
      ) : null}
      <StandardDetailModal isCode={openCode} onClose={() => setOpenCode("")} />
    </div>
  );
}
