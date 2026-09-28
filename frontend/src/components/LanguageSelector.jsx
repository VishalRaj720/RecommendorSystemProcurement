const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "ta", label: "Tamil" },
  { value: "te", label: "Telugu" },
  { value: "mr", label: "Marathi" },
  { value: "bn", label: "Bengali" },
];

export default function LanguageSelector({ value, onChange }) {
  return (
    <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-ink-muted">
      Language
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border border-stone-300 bg-paper px-2 py-1 text-[12px] uppercase tracking-[0.12em] text-ink"
      >
        {LANGUAGES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
