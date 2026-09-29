export default function QCOBadge({ qco, alerts = [] }) {
  const mandatory = Boolean(
    alerts.includes("MANDATORY_COMPLIANCE") ||
    (qco && qco.evidence_level === "cited" && qco.is_mandatory),
  );
  const unverified = Boolean(
    alerts.includes("UNVERIFIED_QCO") || (qco && qco.evidence_level === "unverified"),
  );

  if (mandatory) {
    return (
      <span className="inline-block border border-red-300 bg-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-red-600 rounded shadow-sm">
        [ QCO GAZETTE MANDATORY ]
      </span>
    );
  }

  if (unverified) {
    return (
      <span className="inline-block border border-dashed border-orange-400 bg-orange-50 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-orange-700 rounded shadow-sm">
        [ UNVERIFIED — CONFIRM GAZETTE ]
      </span>
    );
  }

  return null;
}
