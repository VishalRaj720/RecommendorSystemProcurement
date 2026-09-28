import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getStandard } from "../services/api.js";
import QCOBadge from "./QCOBadge.jsx";

export default function StandardDetailModal({ isCode, onClose }) {
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isCode) return;
    let cancelled = false;
    setRecord(null);
    setError("");
    getStandard(isCode)
      .then((data) => {
        if (!cancelled) setRecord(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Standard not found.");
      });
    return () => {
      cancelled = true;
    };
  }, [isCode]);

  if (!isCode) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-bureau/40" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-xl flex-col border-l border-stone-300 bg-paper"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-stone-300 px-5 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">Standard docket</p>
            <h2 className="font-serif text-[26px] tracking-wide text-bureau">{isCode}</h2>
          </div>
          <button type="button" onClick={onClose} className="border border-stone-300 p-1" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4 text-[14px]">
          {error ? <p className="border border-stamp px-3 py-2 text-stamp">{error}</p> : null}
          {!record && !error ? <p className="text-ink-muted">Loading catalogue row…</p> : null}
          {record ? (
            <>
              <p className="font-medium">{record.title}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                {record.status} · {record.category}
                {record.latest_revision_year ? ` · ${record.latest_revision_year}` : ""}
              </p>
              {record.qcos?.map((qco) => (
                <div key={`${qco.notification_ref}-${qco.qco_title}`} className="mt-3">
                  <QCOBadge qco={qco} alerts={[]} />
                  <p className="mt-2">{qco.qco_title}</p>
                  <p className="text-ink-muted">{qco.issuing_ministry}</p>
                  {qco.notification_ref ? <p className="font-mono text-[12px]">{qco.notification_ref}</p> : null}
                </div>
              ))}
              <h3 className="mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">Scope summary</h3>
              <p className="mt-2 leading-relaxed">{record.scope_summary}</p>
              <p className="mt-3 text-[12px] italic text-ink-muted">
                Read the published standard from BIS. This paraphrase is not the official text.
              </p>
              {record.successor_is_code ? (
                <p className="mt-4 text-stamp">Successor in catalogue → {record.successor_is_code}</p>
              ) : null}
              <h3 className="mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                Normative references (one hop)
              </h3>
              {record.normative_references?.length ? (
                <ul className="mt-2 space-y-1">
                  {record.normative_references.map((item) => (
                    <li key={`${item.is_code}-${item.relationship_type}`}>
                      <span className="font-mono tracking-wide">{item.is_code}</span>
                      <span className="ml-2 text-[11px] uppercase text-ink-muted">[{item.relationship_type}]</span>
                      <span className="ml-2 text-ink-muted">{item.title}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-ink-muted">None stored.</p>
              )}
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
