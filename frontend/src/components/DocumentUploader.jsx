import { useRef, useState } from "react";
import { FileText } from "lucide-react";

export default function DocumentUploader({ onText, onError, disabled }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      onError("Only PDF tenders are accepted.");
      return;
    }
    setBusy(true);
    setFileName(file.name);
    try {
      const { uploadPdf } = await import("../services/api.js");
      const result = await uploadPdf(file);
      onText(result.text);
    } catch (error) {
      onError(error.message || "Could not read the PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="border border-dashed border-stone-400 bg-paper px-3 py-4"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        handleFile(event.dataTransfer.files[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center gap-3 text-left"
      >
        <FileText className="h-4 w-4 shrink-0 text-bureau" />
        <span>
          <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-bureau">
            Attach GeM tender notice / spec PDF
          </span>
          <span className="mt-1 block text-[12px] text-ink-muted">
            {busy ? "Extracting text…" : fileName || "Drop a text PDF here. Word files are out of scope."}
          </span>
        </span>
      </button>
    </div>
  );
}
