import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { readAudioDurationMs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { FileAudio, Loader2, UploadCloud, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB — plenty for any track

export function UploadDialog({
  open,
  onOpenChange,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: () => void;
}) {
  const generateUploadUrl = useMutation(api.songs.generateUploadUrl);
  const save = useMutation(api.songs.save);

  const [file, setFile] = useState<File | null>(null);
  const [artist, setArtist] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const reset = useCallback(() => {
    setFile(null);
    setArtist("");
    setError(null);
    setIsUploading(false);
    setIsDragging(false);
  }, []);

  const close = () => {
    if (isUploading) return;
    reset();
    onOpenChange(false);
  };

  const acceptFile = (candidate: File | null | undefined) => {
    setError(null);
    if (!candidate) return;
    if (!candidate.type.startsWith("audio/")) {
      setError("That doesn't look like an audio file.");
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setError("That file is larger than 200 MB.");
      return;
    }
    setFile(candidate);
  };

  const handleUpload = async () => {
    if (!file || isUploading) return;
    setIsUploading(true);
    setError(null);
    try {
      const durationMs = await readAudioDurationMs(file);

      const uploadUrl = await generateUploadUrl();
      // This Convex version expects a plain POST with the file as the body;
      // the response is `{ storageId }` (no Content-Type header needed).
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: file,
      });
      if (!response.ok) {
        throw new Error(
          `Upload failed (${response.status}) — please try again.`,
        );
      }
      const result = (await response.json()) as { storageId?: string };
      if (!result.storageId) {
        throw new Error("Upload failed — the server did not return a file id.");
      }
      const storageId = result.storageId as Id<"_storage">;

      const title =
        file.name.replace(/\.[^.]+$/, "").trim() || "Untitled";
      await save({
        storageId,
        title,
        artist: artist.trim() || undefined,
        durationMs,
        mimeType: file.type,
      });

      toast.success(`“${title}” added to your library`);
      onUploaded?.();
      reset();
      onOpenChange(false);
    } catch (uploadError) {
      console.error("Upload error:", uploadError);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Something went wrong while uploading.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isUploading) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload a song</DialogTitle>
          <DialogDescription>
            Any audio file, any length. It lands in your library and becomes
            playable in your sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div
            role="button"
            tabIndex={0}
            aria-label="Choose an audio file"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              acceptFile(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center transition-colors",
              isDragging
                ? "border-foreground bg-muted/50"
                : "border-border hover:border-muted-foreground/50 hover:bg-muted/30",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => acceptFile(e.target.files?.[0])}
            />
            {file ? (
              <FileAudio className="size-6" />
            ) : (
              <UploadCloud className="size-6 text-muted-foreground" />
            )}
            {file ? (
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(1)} MB — click to choose a
                  different file
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-medium">Choose an audio file</p>
                <p className="text-xs text-muted-foreground">
                  or drag it here — MP3, WAV, M4A, FLAC…
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="upload-artist">Artist (optional)</Label>
            <Input
              id="upload-artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Your name or the band"
              disabled={isUploading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={close} disabled={isUploading}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading && <Loader2 className="size-4 animate-spin" />}
            {isUploading ? "Uploading…" : "Add to library"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}