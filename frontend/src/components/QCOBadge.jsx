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
      <span className="inline-block border-2 border-double border-stamp px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-stamp">
        [ QCO gazette mandatory ]
      </span>
    );
  }

  if (unverified) {
    return (
      <span className="inline-block border border-dashed border-gazette px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-gazette">
        [ Unverified — confirm the gazette ]
      </span>
    );
  }

  return null;
}
