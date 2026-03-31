"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { useUploadDocument } from "@/hooks/useDocuments";

interface DocumentUploaderProps {
  caseId: string;
}

interface QueuedFile {
  file: File;
  title: string;
}

export function DocumentUploader({ caseId }: DocumentUploaderProps) {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const upload = useUploadDocument(caseId);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const items = accepted.map((file) => ({
        file,
        title: file.name.replace(/\.[^.]+$/, ""),
      }));
      setQueue((prev) => [...prev, ...items]);
    },
    [],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/plain": [".txt"],
      "text/csv": [".csv"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/gif": [".gif"],
      "image/webp": [".webp"],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: true,
  });

  function updateTitle(index: number, title: string) {
    setQueue((prev) =>
      prev.map((item, i) => (i === index ? { ...item, title } : item)),
    );
  }

  function removeFromQueue(index: number) {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUploadAll() {
    for (const item of queue) {
      await upload.mutateAsync({ file: item.file, title: item.title });
    }
    setQueue([]);
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mb-2 size-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {isDragActive ? "Drop files here" : "Drag & drop files or click to browse"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, Word, Excel, CSV, images — up to 50 MB each
        </p>
      </div>

      {/* Queued files */}
      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((item, index) => (
            <div
              key={`${item.file.name}-${index}`}
              className="flex items-center gap-3 rounded-md border bg-card p-3"
            >
              <FileIcon className="size-5 shrink-0 text-muted-foreground" />
              <div className="flex-1 space-y-1">
                <Input
                  value={item.title}
                  onChange={(e) => updateTitle(index, e.target.value)}
                  className="h-7 text-sm"
                  placeholder="Document title"
                />
                <p className="text-xs text-muted-foreground">
                  {item.file.name} · {formatSize(item.file.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => removeFromQueue(index)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}

          {upload.isPending && (
            <Progress value={null}>
              <ProgressLabel>Uploading...</ProgressLabel>
              <ProgressValue />
            </Progress>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQueue([])}
              disabled={upload.isPending}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleUploadAll}
              disabled={upload.isPending || queue.length === 0}
            >
              {upload.isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-1.5 size-3.5" />
                  Upload {queue.length} {queue.length === 1 ? "file" : "files"}
                </>
              )}
            </Button>
          </div>

          {upload.isError && (
            <p className="text-sm text-destructive">{upload.error.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
