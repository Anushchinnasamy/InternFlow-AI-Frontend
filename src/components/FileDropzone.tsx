import { useRef, useState, type DragEvent } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  file: File | null;
  onFileSelected: (file: File | null) => void;
  accept?: string;
  hint?: string;
}

// Backend's resume-parse pipeline (POST /ai/resume-parse) only extracts
// text from PDF today — DOCX isn't wired up server-side (would need a
// separate parser, not a thin addition), so this only accepts .pdf despite
// DOCX being mentioned in the design brief. Flagged as a known limitation.
export function FileDropzone({ file, onFileSelected, accept = ".pdf", hint = "PDF, up to 10MB" }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileSelected(dropped);
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <FileText className="size-5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => onFileSelected(null)}>
          <X />
        </Button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors",
        isDragging ? "border-primary bg-accent/50" : "hover:bg-muted/50"
      )}
    >
      <UploadCloud className="size-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Drag and drop, or click to browse</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
