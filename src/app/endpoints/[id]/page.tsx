"use client";

import React, { useCallback, useEffect, useState, use, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  RefreshCw,
  HardDrive,
  FileText,
  FileImage,
  FileCode,
  File,
} from "lucide-react";

interface FileItem {
  filename: string;
  fileType: string;
  fileSize: number;
  lastModified: string;
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
const CODE_EXTENSIONS = [
  "json",
  "xml",
  "csv",
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "html",
  "css",
  "scss",
  "yml",
  "yaml",
  "toml",
  "sql",
  "sh",
];
const TEXT_PREVIEW_EXTENSIONS = [
  "txt",
  "log",
  "md",
  "env",
  "ini",
  ...CODE_EXTENSIONS,
];
const MAX_TEXT_THUMBNAIL_SIZE = 256 * 1024;
const MAX_TEXT_THUMBNAIL_CHARS = 1800;

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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

function isTextPreviewType(type: string): boolean {
  return TEXT_PREVIEW_EXTENSIONS.includes(type.toLowerCase());
}

function getPreviewUrl(endpointId: string, filename: string): string {
  return `/api/files/preview?endpointId=${encodeURIComponent(endpointId)}&filename=${encodeURIComponent(filename)}`;
}

function getFileIcon(type: string, large = false) {
  const t = type.toLowerCase();
  const size = large ? 48 : 18;
  const strokeWidth = large ? 1.2 : 1.5;

  if (isImageType(t)) {
    return <FileImage size={size} strokeWidth={strokeWidth} className="text-emerald-500" />;
  }
  if (["pdf"].includes(t)) {
    return <FileText size={size} strokeWidth={strokeWidth} className="text-red-500" />;
  }
  if (CODE_EXTENSIONS.includes(t)) {
    return <FileCode size={size} strokeWidth={strokeWidth} className="text-amber-500" />;
  }
  if (["txt", "log", "md"].includes(t)) {
    return <FileText size={size} strokeWidth={strokeWidth} className="text-blue-500" />;
  }
  return <File size={size} strokeWidth={strokeWidth} className="text-slate-400" />;
}

function getIconBg(type: string): string {
  const t = type.toLowerCase();
  if (isImageType(t)) return "bg-emerald-50";
  if (["pdf"].includes(t)) return "bg-red-50";
  if (CODE_EXTENSIONS.includes(t)) return "bg-amber-50";
  if (["txt", "log", "md"].includes(t)) return "bg-blue-50";
  return "bg-slate-100";
}

function FileThumbnail({ file, endpointId }: { file: FileItem; endpointId: string }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const fileType = getFileType(file);
  const previewUrl = getPreviewUrl(endpointId, file.filename);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [shouldLoadText, setShouldLoadText] = useState(false);
  const [textStatus, setTextStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [textPreview, setTextPreview] = useState("");

  const canShowImagePreview = isImageType(fileType) && failedImageUrl !== previewUrl;
  const canShowTextPreview = isTextPreviewType(fileType) && file.fileSize <= MAX_TEXT_THUMBNAIL_SIZE;

  useEffect(() => {
    if (!canShowTextPreview) return;

    const node = previewRef.current;

    if (!node || typeof IntersectionObserver === "undefined") {
      const timeout = window.setTimeout(() => setShouldLoadText(true), 0);
      return () => window.clearTimeout(timeout);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadText(true);
          observer.disconnect();
        }
      },
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
        <img
          src={previewUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setFailedImageUrl(previewUrl)}
        />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950/25 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </div>
    );
  }

  if (canShowTextPreview && textStatus !== "error") {
    return (
      <div
        ref={previewRef}
        className="relative h-28 overflow-hidden bg-slate-950 px-3 py-2.5 font-mono text-[10px] leading-4 text-slate-200"
      >
        {textStatus === "loaded" ? (
          <pre className="h-full overflow-hidden whitespace-pre-wrap break-words font-mono">
            {textPreview}
          </pre>
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

export default function FileBrowserPage({ params }: FileBrowserPageProps) {
  const { id } = use(params);

  const [endpoint, setEndpoint] = useState<Endpoint | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm"
          >
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
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex-1 flex flex-col">
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
        <div className="flex-1 overflow-auto p-6">
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
              {/* Grid of large icon cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredFiles.map((file) => {
                  const fileType = getFileType(file);

                  return (
                    <div
                      key={file.filename}
                      className="group relative flex flex-col rounded-2xl border border-slate-200 bg-slate-50 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
                    >
                      <FileThumbnail file={file} endpointId={id} />

                      {/* Filename Footer */}
                      <div className="bg-white border-t border-slate-100 px-3 py-2.5 flex items-center gap-1.5 min-w-0">
                        <span className="shrink-0 text-slate-400">{getFileIcon(fileType, false)}</span>
                        <span
                          className="text-xs font-medium text-slate-700 truncate"
                          title={file.filename}
                        >
                          {file.filename}
                        </span>
                      </div>

                      {/* Hover Overlay with actions */}
                      <div className="absolute inset-0 bg-blue-600/90 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 rounded-2xl">
                        <p className="text-white text-[10px] font-semibold px-3 text-center truncate w-full">
                          {file.filename}
                        </p>
                        <p className="text-blue-200 text-[10px]">
                          {formatBytes(file.fileSize)} · {fileType ? fileType.toUpperCase() : "FILE"}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <Link
                            href={`/preview/${encodeURIComponent(file.filename)}?endpointId=${id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-blue-600 text-xs font-semibold hover:bg-blue-50 transition-colors"
                          >
                            <Eye size={12} /> Preview
                          </Link>
                          <a
                            href={`/api/files/download?endpointId=${id}&filename=${encodeURIComponent(file.filename)}`}
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
      </div>
    </div>
  );
}
