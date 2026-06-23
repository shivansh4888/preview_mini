"use client";

import React, { useCallback, useEffect, useState, use, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Download,
  Eye,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  HardDrive,
  FileText,
  FileImage,
  FileVideo,
  FileCode,
  File,
  Info,
  Calendar,
  Tag,
  Weight,
  Clock,
  Hash,
} from "lucide-react";

interface FileItem {
  filename: string;
  fileType: string;
  fileSize: number;
  lastModified: string;
}

interface FileMeta {
  size: number | null;
  lastModified: string | null;
  contentType: string | null;
}

interface Endpoint {
  id: string;
  name: string;
  endpointUrl: string;
}

interface FileBrowserPageProps {
  params: Promise<{ id: string }>;
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
const VIDEO_EXTENSIONS = ["mp4", "m4v", "webm", "mov", "ogv", "ogg"];
const CODE_EXTENSIONS = [
  "json", "xml", "csv", "js", "jsx", "ts", "tsx",
  "py", "html", "css", "scss", "yml", "yaml", "toml", "sql", "sh",
];
const TEXT_PREVIEW_EXTENSIONS = ["txt", "log", "md", "env", "ini", ...CODE_EXTENSIONS];
const MAX_TEXT_THUMBNAIL_SIZE = 256 * 1024;
const MAX_TEXT_THUMBNAIL_CHARS = 1800;
const PDF_EXTENSIONS = ["pdf"];
const MAX_SIDE_PREVIEW_CHARS = 100 * 1024;

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
}

function getFileType(file: FileItem): string {
  return (file.fileType || getExtension(file.filename)).toLowerCase();
}

function isImageType(type: string): boolean {
  return IMAGE_EXTENSIONS.includes(type.toLowerCase());
}

function isVideoType(type: string): boolean {
  return VIDEO_EXTENSIONS.includes(type.toLowerCase());
}

function isTextPreviewType(type: string): boolean {
  return TEXT_PREVIEW_EXTENSIONS.includes(type.toLowerCase());
}

function getVideoMimeType(type: string): string {
  const t = type.toLowerCase();
  if (t === "webm") return "video/webm";
  if (t === "mov") return "video/quicktime";
  if (t === "ogv" || t === "ogg") return "video/ogg";
  return "video/mp4";
}

function getPreviewUrl(endpointId: string, filename: string): string {
  return `/api/files/preview?endpointId=${encodeURIComponent(endpointId)}&filename=${encodeURIComponent(filename)}`;
}

function getDownloadUrl(endpointId: string, filename: string): string {
  return `/api/files/download?endpointId=${encodeURIComponent(endpointId)}&filename=${encodeURIComponent(filename)}`;
}

function getFileIcon(type: string, large = false) {
  const t = type.toLowerCase();
  const size = large ? 48 : 18;
  const strokeWidth = large ? 1.2 : 1.5;
  if (isImageType(t)) return <FileImage size={size} strokeWidth={strokeWidth} className="text-emerald-500" />;
  if (isVideoType(t)) return <FileVideo size={size} strokeWidth={strokeWidth} className="text-violet-500" />;
  if (["pdf"].includes(t)) return <FileText size={size} strokeWidth={strokeWidth} className="text-red-500" />;
  if (CODE_EXTENSIONS.includes(t)) return <FileCode size={size} strokeWidth={strokeWidth} className="text-amber-500" />;
  if (["txt", "log", "md"].includes(t)) return <FileText size={size} strokeWidth={strokeWidth} className="text-blue-500" />;
  return <File size={size} strokeWidth={strokeWidth} className="text-slate-400" />;
}

function getIconBg(type: string): string {
  const t = type.toLowerCase();
  if (isImageType(t)) return "bg-emerald-50";
  if (isVideoType(t)) return "bg-violet-50";
  if (["pdf"].includes(t)) return "bg-red-50";
  if (CODE_EXTENSIONS.includes(t)) return "bg-amber-50";
  if (["txt", "log", "md"].includes(t)) return "bg-blue-50";
  return "bg-slate-100";
}

// ─── File Info Modal ─────────────────────────────────────────────────────────
function FileInfoModal({
  file,
  endpointId,
  onClose,
}: {
  file: FileItem;
  endpointId: string;
  onClose: () => void;
}) {
  const fileType = getFileType(file);
  const ext = getExtension(file.filename);
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);

  useEffect(() => {
    setMetaLoading(true);
    fetch(`/api/files/meta?endpointId=${encodeURIComponent(endpointId)}&filename=${encodeURIComponent(file.filename)}`)
      .then((r) => r.json())
      .then((d) => setMeta(d))
      .catch(() => setMeta(null))
      .finally(() => setMetaLoading(false));
  }, [endpointId, file.filename]);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    {
      icon: <Tag size={14} />,
      label: "File name",
      value: file.filename,
    },
    {
      icon: <Hash size={14} />,
      label: "Type",
      value: meta?.contentType
        ? `${meta.contentType.split(";")[0]} (.${ext})`
        : ext
        ? `.${ext.toUpperCase()}`
        : "Unknown",
    },
    {
      icon: <Weight size={14} />,
      label: "Size",
      value: meta?.size != null
        ? `${formatBytes(meta.size)} (${meta.size.toLocaleString()} bytes)`
        : file.fileSize
        ? `${formatBytes(file.fileSize)} (from index)`
        : metaLoading ? "Loading…" : "Unavailable",
    },
    {
      icon: <Calendar size={14} />,
      label: "Last modified",
      value: meta?.lastModified
        ? formatDate(meta.lastModified)
        : file.lastModified
        ? formatDate(file.lastModified)
        : metaLoading ? "Loading…" : "Unavailable",
    },
    {
      icon: <Clock size={14} />,
      label: "Fetched at",
      value: formatDate(new Date().toISOString()),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${getIconBg(fileType)}`}>
            {getFileIcon(fileType, false)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-slate-900" title={file.filename}>
              {file.filename}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">
              File Information
            </p>
          </div>
          {metaLoading && <Loader2 size={14} className="animate-spin text-slate-400 shrink-0" />}
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-100 px-5">
          {rows.map(({ icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 py-3.5">
              <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
              <span className="w-28 shrink-0 text-xs font-medium text-slate-400">{label}</span>
              <span className="break-all text-xs text-slate-700 font-mono">{value}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-5 py-4 flex justify-end gap-2">
          <a
            href={getDownloadUrl(endpointId, file.filename)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Download size={13} /> Download
          </a>
          <button
            onClick={onClose}
            className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FileThumbnail ────────────────────────────────────────────────────────────
function FileThumbnail({ file, endpointId }: { file: FileItem; endpointId: string }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const fileType = getFileType(file);
  const previewUrl = getPreviewUrl(endpointId, file.filename);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [failedVideoUrl, setFailedVideoUrl] = useState<string | null>(null);
  const [shouldLoadText, setShouldLoadText] = useState(false);
  const [textStatus, setTextStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [textPreview, setTextPreview] = useState("");

  const canShowImagePreview = isImageType(fileType) && failedImageUrl !== previewUrl;
  const canShowVideoPreview = isVideoType(fileType) && failedVideoUrl !== previewUrl;
  const canShowTextPreview = isTextPreviewType(fileType) && file.fileSize <= MAX_TEXT_THUMBNAIL_SIZE;

  useEffect(() => {
    if (!canShowTextPreview) return;
    const node = previewRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      const timeout = window.setTimeout(() => setShouldLoadText(true), 0);
      return () => window.clearTimeout(timeout);
    }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShouldLoadText(true); observer.disconnect(); } },
      { rootMargin: "160px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canShowTextPreview, previewUrl]);

  useEffect(() => {
    if (!canShowTextPreview || !shouldLoadText) return;
    const controller = new AbortController();
    const loadTextPreview = async () => {
      try {
        setTextStatus("loading");
        setTextPreview("");
        const response = await fetch(previewUrl, { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load preview");
        const reader = response.body?.getReader();
        let previewText = "";
        if (reader) {
          const decoder = new TextDecoder();
          let receivedBytes = 0;
          while (receivedBytes < MAX_TEXT_THUMBNAIL_CHARS) {
            const { value, done } = await reader.read();
            if (done) break;
            receivedBytes += value.byteLength;
            previewText += decoder.decode(value, { stream: true });
          }
          previewText += decoder.decode();
          await reader.cancel().catch(() => {});
        } else {
          previewText = await response.text();
        }
        if (controller.signal.aborted) return;
        setTextPreview(previewText.trim().slice(0, MAX_TEXT_THUMBNAIL_CHARS) || "Empty file");
        setTextStatus("loaded");
      } catch {
        if (!controller.signal.aborted) setTextStatus("error");
      }
    };
    loadTextPreview();
    return () => controller.abort();
  }, [canShowTextPreview, previewUrl, shouldLoadText]);

  if (canShowImagePreview) {
    return (
      <div ref={previewRef} className="relative h-28 overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="" loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setFailedImageUrl(previewUrl)} />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950/25 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </div>
    );
  }

  if (canShowVideoPreview) {
    return (
      <div ref={previewRef} className="relative h-28 overflow-hidden bg-slate-950">
        <video src={previewUrl} muted playsInline preload="metadata"
          className="h-full w-full object-cover"
          onError={() => setFailedVideoUrl(previewUrl)} />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950/50 to-transparent" />
      </div>
    );
  }

  if (canShowTextPreview && textStatus !== "error") {
    return (
      <div ref={previewRef}
        className="relative h-28 overflow-hidden bg-slate-950 px-3 py-2.5 font-mono text-[10px] leading-4 text-slate-200">
        {textStatus === "loaded" ? (
          <pre className="h-full overflow-hidden whitespace-pre-wrap break-words font-mono">{textPreview}</pre>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="h-2 rounded-full bg-slate-700" />
            <div className="h-2 w-10/12 rounded-full bg-slate-700" />
            <div className="h-2 w-11/12 rounded-full bg-slate-700" />
            <div className="h-2 w-7/12 rounded-full bg-slate-700" />
            <div className="h-2 w-9/12 rounded-full bg-slate-700" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-950 to-transparent" />
      </div>
    );
  }

  return (
    <div ref={previewRef} className={`flex h-28 items-center justify-center px-4 ${getIconBg(fileType)}`}>
      {getFileIcon(fileType, true)}
    </div>
  );
}

// ─── PreviewInspector ─────────────────────────────────────────────────────────
function PreviewInspector({
  file,
  endpointId,
  onClose,
}: {
  file: FileItem;
  endpointId: string;
  onClose: () => void;
}) {
  const fileType = getFileType(file);
  const previewUrl = getPreviewUrl(endpointId, file.filename);
  const downloadUrl = getDownloadUrl(endpointId, file.filename);
  const isImage = isImageType(fileType);
  const isVideo = isVideoType(fileType);
  const isPdf = PDF_EXTENSIONS.includes(fileType);
  const isText = isTextPreviewType(fileType);
  const [textContents, setTextContents] = useState("");
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    if (!isText) return;
    const controller = new AbortController();
    const loadTextPreview = async () => {
      try {
        setTextLoading(true);
        setTextError(null);
        setTextContents("");
        const response = await fetch(previewUrl, { signal: controller.signal });
        if (!response.ok) throw new Error(`Error ${response.status}`);
        const reader = response.body?.getReader();
        let result = "";
        let bytes = 0;
        if (reader) {
          const decoder = new TextDecoder();
          while (bytes < MAX_SIDE_PREVIEW_CHARS) {
            const { value, done } = await reader.read();
            if (done) break;
            result += decoder.decode(value, { stream: true });
            bytes += value.byteLength;
          }
          result += decoder.decode();
          await reader.cancel().catch(() => {});
        } else {
          result = await response.text();
          bytes = result.length;
        }
        if (bytes >= MAX_SIDE_PREVIEW_CHARS) {
          result += "\n\n[... Preview truncated at 100KB. Download to view full file ...]";
        }
        if (controller.signal.aborted) return;
        setTextContents(result);
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          setTextError(err instanceof Error ? err.message : "Failed to load file.");
        }
      } finally {
        if (!controller.signal.aborted) setTextLoading(false);
      }
    };
    loadTextPreview();
    return () => controller.abort();
  }, [isText, previewUrl]);

  return (
    <>
      {showInfoModal && (
        <FileInfoModal
          file={file}
          endpointId={endpointId}
          onClose={() => setShowInfoModal(false)}
        />
      )}

      <aside className="flex w-full shrink-0 flex-col border-t border-slate-200 bg-white md:h-full md:w-[420px] md:border-l md:border-t-0 lg:w-[480px]">
        {/* Inspector Header */}
        <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${getIconBg(fileType)}`}>
            {getFileIcon(fileType, false)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-slate-900" title={file.filename}>
              {file.filename}
            </h2>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {formatBytes(file.fileSize)} · {fileType || "file"}
            </p>
          </div>
          {/* Info button */}
          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            title="File information"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-blue-600"
          >
            <Info size={15} />
          </button>
          <a
            href={downloadUrl}
            title="Download"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <Download size={15} />
          </a>
          <button
            type="button"
            onClick={onClose}
            title="Close preview"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <X size={15} />
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex min-h-[420px] flex-1 flex-col overflow-auto bg-slate-50/60 md:min-h-0">
          {isImage && (
            <div className="flex min-h-full flex-1 items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt={file.filename}
                className="max-h-[calc(100vh-240px)] max-w-full rounded-lg border border-slate-200 bg-white object-contain shadow-sm" />
            </div>
          )}

          {isPdf && (
            <iframe src={previewUrl} title={file.filename}
              className="h-full min-h-[560px] w-full border-0 bg-white" />
          )}

          {isVideo && (
            <div className="flex min-h-full flex-1 items-center justify-center bg-slate-950 p-4">
              <video controls playsInline preload="metadata"
                className="max-h-[calc(100vh-240px)] max-w-full rounded-lg bg-black shadow-sm">
                <source src={previewUrl} type={getVideoMimeType(fileType)} />
                Your browser does not support video preview.
              </video>
            </div>
          )}

          {isText && (
            <div className="flex min-h-full flex-1 flex-col p-4">
              {textLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2">
                  <Loader2 className="animate-spin text-blue-500" size={22} />
                  <p className="text-xs text-slate-400">Loading preview...</p>
                </div>
              ) : textError ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                  <AlertCircle className="text-red-400" size={26} />
                  <p className="text-sm font-semibold text-slate-700">Failed to read file</p>
                  <p className="max-w-xs text-xs leading-relaxed text-slate-400">{textError}</p>
                </div>
              ) : (
                <pre className="min-h-[360px] flex-1 overflow-auto rounded-lg border border-slate-200 bg-white p-4 font-mono text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {textContents}
                </pre>
              )}
            </div>
          )}

          {!isImage && !isVideo && !isPdf && !isText && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="rounded-xl bg-slate-100 p-4 text-slate-400">
                <FileText size={34} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Preview Not Available</h2>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
                  Download this file to view it locally.
                </p>
              </div>
              <a href={downloadUrl}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700">
                <Download size={14} /> Download
              </a>
            </div>
          )}
        </div>

        {/* Info strip at the bottom of the panel */}
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400 truncate">
            {file.lastModified ? formatDate(file.lastModified) : "—"}
          </span>
          <button
            onClick={() => setShowInfoModal(true)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-500 hover:text-blue-700 transition-colors shrink-0"
          >
            <Info size={11} /> More info
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── FileBrowserPage ──────────────────────────────────────────────────────────
export default function FileBrowserPage({ params }: FileBrowserPageProps) {
  const { id } = use(params);

  const [endpoint, setEndpoint] = useState<Endpoint | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEndpointDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/endpoints/${id}`);
      if (res.ok) setEndpoint(await res.json());
    } catch {}
  }, [id]);

  const fetchFiles = useCallback(async (initial = false) => {
    try {
      if (initial) setLoading(true);
      else setRefreshing(true);
      setError(null);
      const res = await fetch(`/api/endpoints/${id}/files`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to load files");
      }
      setFiles(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch files.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchEndpointDetails();
      fetchFiles(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchEndpointDetails, fetchFiles]);

  const filteredFiles = files.filter((f) =>
    f.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedFile = selectedFilename
    ? files.find((file) => file.filename === selectedFilename) ?? null
    : null;
  const gridColumns = selectedFile
    ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4"
    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/"
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {endpoint ? endpoint.name : "Files & Folders"}
              </h1>
            </div>
            {endpoint && (
              <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate max-w-[420px]">
                {endpoint.endpointUrl}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => fetchFiles(false)}
          disabled={loading || refreshing}
          className="self-start md:self-auto inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin text-blue-500" : ""} />
          Refresh
        </button>
      </div>

      {/* Main Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        {/* Search Bar */}
        <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between gap-4 bg-slate-50/60">
          <div className="relative flex-1 max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={15} />
            </div>
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-lg bg-white border border-slate-200 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium shrink-0">
            {filteredFiles.length} {filteredFiles.length === 1 ? "item" : "items"}
          </span>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0 flex-col overflow-auto md:flex-row md:overflow-hidden">
          <div className="min-w-0 flex-1 p-6 md:overflow-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-blue-500 mb-3" size={28} />
                <p className="text-slate-400 text-sm">Loading files...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center text-center py-16 max-w-md mx-auto space-y-4">
                <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
                  <AlertCircle size={28} />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">Connection Error</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{error}</p>
                <button
                  onClick={() => fetchFiles(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-lg text-white transition-colors"
                >
                  <RefreshCw size={12} /> Retry
                </button>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20">
                <div className="p-4 bg-blue-50 text-blue-400 rounded-2xl mb-4">
                  <HardDrive size={32} strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-semibold text-slate-700">No files found</h3>
                <p className="text-slate-400 text-xs mt-1">
                  {searchQuery ? "No files match your search." : "This endpoint is empty."}
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold text-slate-500 mb-4 uppercase tracking-wider">Files &amp; Folders</p>
                <div className={`grid gap-4 ${gridColumns}`}>
                  {filteredFiles.map((file) => {
                    const fileType = getFileType(file);
                    const isSelected = selectedFilename === file.filename;

                    return (
                      <div
                        key={file.filename}
                        className={`group relative flex flex-col rounded-2xl bg-slate-50 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden ${
                          isSelected
                            ? "border border-blue-400 ring-2 ring-blue-100"
                            : "border border-slate-200 hover:border-blue-300"
                        }`}
                      >
                        <FileThumbnail file={file} endpointId={id} />

                        {/* Filename Footer */}
                        <div className="bg-white border-t border-slate-100 px-3 py-2.5 flex items-center gap-1.5 min-w-0">
                          <span className="shrink-0 text-slate-400">{getFileIcon(fileType, false)}</span>
                          <span className="text-xs font-medium text-slate-700 truncate" title={file.filename}>
                            {file.filename}
                          </span>
                        </div>

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-blue-600/90 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 rounded-2xl">
                          <p className="text-white text-[10px] font-semibold px-3 text-center truncate w-full">
                            {file.filename}
                          </p>
                          <p className="text-blue-200 text-[10px]">
                            {formatBytes(file.fileSize)} · {fileType ? fileType.toUpperCase() : "FILE"}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => setSelectedFilename(file.filename)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-blue-600 text-xs font-semibold hover:bg-blue-50 transition-colors"
                            >
                              <Eye size={12} /> Preview
                            </button>
                            <a
                              href={getDownloadUrl(id, file.filename)}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
                              title="Download"
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {selectedFile && (
            <PreviewInspector
              file={selectedFile}
              endpointId={id}
              onClose={() => setSelectedFilename(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}