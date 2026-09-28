import { ExternalLink, GitBranch, ShieldAlert } from "lucide-react";
import QCOBadge from "./QCOBadge.jsx";

export default function RecommendationCard({ match, rank, onOpen }) {
  const revised = match.alerts?.includes("LATEST_VERSION_ALERT");

  return (
    <article className="border border-stone-300 bg-paper">
      <header className="flex items-start justify-between gap-3 border-b border-stone-200 px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Match {String(rank).padStart(2, "0")}
            {match.distance != null ? ` · d ${match.distance}` : ""}
          </p>
          <button
            type="button"
            onClick={() => onOpen(match.is_code)}
            className="mt-1 text-left font-serif text-[22px] leading-tight tracking-wide text-bureau underline-offset-4 hover:underline"
          >
            {match.is_code}
          </button>
          <p className="mt-1 text-[14px] text-ink">{match.title}</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            {match.status}
            {match.latest_revision_year ? ` · ${match.latest_revision_year}` : ""}
          </p>
        </div>
        <QCOBadge qco={match.qco} alerts={match.alerts} />
      </header>

      {revised ? (
        <div className="flex items-start gap-2 border-b border-stamp/30 bg-[#f8eee8] px-4 py-2 text-[13px] text-stamp">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            [ Revised / outdated ]
            {match.successor_is_code ? (
              <>
                {" "}
                Successor →{" "}
                <button
                  type="button"
                  className="font-mono tracking-wide underline"
                  onClick={() => onOpen(match.successor_is_code)}
                >
                  {match.successor_is_code}
                </button>
              </>
            ) : (
              " No successor is stored in this catalogue."
            )}
          </p>
        </div>
      ) : null}

      {match.qco ? (
        <section className="border-b border-stone-200 px-4 py-3 text-[13px]">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">Gazette panel</p>
          <p className="mt-1 font-medium">{match.qco.qco_title}</p>
          <p className="text-ink-muted">{match.qco.issuing_ministry}</p>
          {match.qco.notification_ref ? (
            <p className="mt-1 font-mono text-[12px]">{match.qco.notification_ref}</p>
          ) : null}
          <p className="mt-1 uppercase tracking-[0.12em] text-[11px]">
            Scheme {match.qco.certification_scheme}
          </p>
          {match.qco.evidence_level === "cited" && match.qco.source_url ? (
            <a
              href={match.qco.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-bureau"
            >
              Source <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </section>
      ) : null}

      {match.normative_references?.length ? (
        <section className="px-4 py-3">
          <p className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
            <GitBranch className="h-3 w-3" /> Normative references
          </p>
          <ol className="space-y-1 text-[13px]">
            {match.normative_references.map((item) => (
              <li key={`${item.is_code}-${item.hop}-${item.relationship_type}`}>
                <span className="text-ink-muted">{match.is_code}</span>
                <span className="mx-2 text-gazette">→</span>
                <button
                  type="button"
                  className="font-mono tracking-wide text-bureau underline-offset-2 hover:underline"
                  onClick={() => onOpen(item.is_code)}
                >
                  {item.is_code}
                </button>
                <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                  [{item.relationship_type}] hop {item.hop}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}
