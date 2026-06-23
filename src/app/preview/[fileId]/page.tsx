"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileText,
  AlertCircle,
  Loader2,
  HardDrive,
} from "lucide-react";

interface PreviewPageProps {
  params: Promise<{ fileId: string }>;
  searchParams: Promise<{ endpointId?: string }>;
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
const VIDEO_EXTENSIONS = ["mp4", "m4v", "webm", "mov", "ogv", "ogg"];
const TEXT_EXTENSIONS = ["txt", "json", "csv", "xml", "log", "md"];
const PDF_EXTENSIONS = ["pdf"];

function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
}

function getVideoMimeType(extension: string): string {
  if (extension === "webm") return "video/webm";
  if (extension === "mov") return "video/quicktime";
  if (extension === "ogv" || extension === "ogg") return "video/ogg";
  return "video/mp4";
}

export default function PreviewPage({ params, searchParams }: PreviewPageProps) {
  const { fileId: rawFileId } = use(params);
  const { endpointId } = use(searchParams);

  const fileId = decodeURIComponent(rawFileId);
  const extension = getExtension(fileId);

  const [endpointName, setEndpointName] = useState("Endpoint");
  const [textContents, setTextContents] = useState("");
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  const isImage = IMAGE_EXTENSIONS.includes(extension);
  const isVideo = VIDEO_EXTENSIONS.includes(extension);
  const isPdf = PDF_EXTENSIONS.includes(extension);
  const isText = TEXT_EXTENSIONS.includes(extension);

  const previewSourceUrl = `/api/files/preview?endpointId=${endpointId}&filename=${encodeURIComponent(fileId)}`;
  const downloadUrl = `/api/files/download?endpointId=${endpointId}&filename=${encodeURIComponent(fileId)}`;

  useEffect(() => {
    if (endpointId) {
      fetch(`/api/endpoints/${endpointId}`)
        .then((r) => r.json())
        .then((d) => { if (d.name) setEndpointName(d.name); })
        .catch(() => {});
    }
  }, [endpointId]);

  useEffect(() => {
    if (!isText || !endpointId) return;
    const load = async () => {
      try {
        setTextLoading(true);
        setTextError(null);
        const res = await fetch(previewSourceUrl);
        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          throw new Error(e.error || `Error ${res.status}`);
        }
        const reader = res.body?.getReader();
        if (!reader) {
          setTextContents(await res.text());
          return;
        }
        const decoder = new TextDecoder();
        let result = "";
        let bytes = 0;
        const max = 100 * 1024;
        while (bytes < max) {
          const { value, done } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
          bytes += value.length;
        }
        if (bytes >= max) result += "\n\n[... Preview truncated at 100KB. Download to view full file ...]";
        setTextContents(result);
      } catch (err: unknown) {
        setTextError(err instanceof Error ? err.message : "Failed to load file.");
      } finally {
        setTextLoading(false);
      }
    };
    load();
  }, [isText, endpointId, previewSourceUrl]);

  return (
    <div className="space-y-5 flex-1 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/endpoints/${endpointId}`}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm shrink-0"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 truncate" title={fileId}>
              {fileId}
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <HardDrive size={11} />
              <span>{endpointName}</span>
              <span className="text-slate-300">·</span>
              <span className="font-mono uppercase text-slate-500">{extension || "unknown"}</span>
            </p>
          </div>
        </div>
        <a
          href={downloadUrl}
          className="self-start sm:self-auto inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors shrink-0"
        >
          <Download size={14} /> Download
        </a>
      </div>

      {/* Preview Container */}
      <div className="flex-1 rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col shadow-sm min-h-[450px]">
        {/* Preview Type Bar */}
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-2.5 flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${isImage ? "bg-emerald-500" : isVideo ? "bg-violet-500" : isPdf ? "bg-red-500" : isText ? "bg-blue-500" : "bg-slate-300"}`}></div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isImage ? "Image Preview" : isVideo ? "Video Preview" : isPdf ? "PDF Document" : isText ? "Text Preview" : "No Preview Available"}
          </span>
          <span className="ml-auto text-[10px] font-mono text-slate-400 uppercase">.{extension}</span>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Images */}
          {isImage && (
            <div className="flex-1 flex items-center justify-center p-8 bg-slate-50/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSourceUrl}
                alt={fileId}
                className="max-w-full max-h-[560px] object-contain rounded-xl shadow-md border border-slate-200"
              />
            </div>
          )}

          {/* PDFs */}
          {isPdf && (
            <iframe
              src={previewSourceUrl}
              className="flex-1 w-full border-0 min-h-[520px]"
              title={fileId}
            />
          )}

          {/* Videos */}
          {isVideo && (
            <div className="flex-1 flex items-center justify-center p-8 bg-slate-950">
              <video
                controls
                playsInline
                preload="metadata"
                className="max-w-full max-h-[560px] rounded-xl bg-black shadow-md"
              >
                <source src={previewSourceUrl} type={getVideoMimeType(extension)} />
                Your browser does not support video preview.
              </video>
            </div>
          )}

          {/* Text files */}
          {isText && (
            <div className="flex-1 flex flex-col p-5">
              {textLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="animate-spin text-blue-500" size={24} />
                  <p className="text-slate-400 text-xs">Loading file contents...</p>
                </div>
              ) : textError ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 max-w-md mx-auto">
                  <AlertCircle className="text-red-400" size={28} />
                  <p className="text-sm font-semibold text-slate-700">Failed to read file</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{textError}</p>
                </div>
              ) : (
                <pre className="flex-1 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs leading-relaxed text-slate-700 overflow-auto p-5 whitespace-pre-wrap select-text">
                  {textContents}
                </pre>
              )}
            </div>
          )}

          {/* Unsupported */}
          {!isImage && !isVideo && !isPdf && !isText && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 gap-4">
              <div className="p-4 bg-slate-100 text-slate-400 rounded-2xl">
                <FileText size={36} strokeWidth={1.5} />
              </div>
              <h2 className="text-base font-semibold text-slate-800">Preview Not Available</h2>
              <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                Browser previews are not supported for <strong>.{extension}</strong> files.
                Download the file to view it locally.
              </p>
              <a
                href={downloadUrl}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors mt-2"
              >
                <Download size={14} /> Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
