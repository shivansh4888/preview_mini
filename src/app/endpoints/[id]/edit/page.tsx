"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Activity,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Link2,
  Key,
  Tag,
  Database,
  Lock,
} from "lucide-react";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

type Mode = "s3" | "http";

export default function EditEndpointPage({ params }: EditPageProps) {
  const router = useRouter();
  const { id } = use(params);

  const [mode, setMode] = useState<Mode>("http");
  const [name, setName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  // HTTP fields
  const [token, setToken] = useState("");
  // S3 fields
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [bucket, setBucket] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: "idle" | "connected" | "failed";
    message: string;
  }>({ status: "idle", message: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEndpoint = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/endpoints/${id}`);
        if (!res.ok) throw new Error(res.status === 404 ? "Endpoint not found" : "Failed to load endpoint");
        const data = await res.json();
        setName(data.name);
        setEndpointUrl(data.endpointUrl);
        setToken(data.token || "");
        setAccessKeyId(data.accessKeyId || "");
        setSecretKey(data.secretKey || "");
        setBucket(data.bucket || "");
        // Determine mode from stored data
        if (data.accessKeyId && data.secretKey) {
          setMode("s3");
        } else {
          setMode("http");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load endpoint details.");
      } finally {
        setLoading(false);
      }
    };
    fetchEndpoint();
  }, [id]);

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTesting(true);
    setTestResult({ status: "idle", message: "" });
    try {
      const payload =
        mode === "s3"
          ? { endpointUrl, accessKeyId, secretKey, bucket }
          : { endpointUrl, token };

      const res = await fetch("/api/endpoints/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status === "connected") {
        setTestResult({ status: "connected", message: "Connection verified! Endpoint is reachable." });
      } else {
        setTestResult({ status: "failed", message: data.message || data.error || "Failed to reach endpoint." });
      }
    } catch (err: any) {
      setTestResult({ status: "failed", message: err.message || "A network error occurred." });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !endpointUrl) { setError("Name and Endpoint URL are required."); return; }
    if (mode === "s3" && (!accessKeyId || !secretKey || !bucket)) {
      setError("Access Key ID, Secret Key, and Bucket are required for S3 mode.");
      return;
    }
    if (mode === "http" && !token) {
      setError("Token is required for HTTP mode.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload =
        mode === "s3"
          ? { name, endpointUrl, accessKeyId, secretKey, bucket, token: "" }
          : { name, endpointUrl, token, accessKeyId: "", secretKey: "", bucket: "" };

      const res = await fetch(`/api/endpoints/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to save"); }
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save endpoint.");
    } finally {
      setSaving(false);
    }
  };

  const canTest =
    mode === "s3"
      ? Boolean(endpointUrl && accessKeyId && secretKey && bucket)
      : Boolean(endpointUrl && token);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-blue-500 mb-2" size={28} />
        <p className="text-slate-400 text-sm">Loading endpoint details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/" className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Edit Storage Endpoint</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Modify details for: <span className="text-blue-600 font-medium">{name}</span>
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 space-y-5 shadow-sm">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex gap-3 text-red-700 text-sm">
            <AlertCircle className="shrink-0 text-red-500" size={18} />
            <div>{error}</div>
          </div>
        )}

        {/* Connection Type Toggle */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Connection Type</label>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50 p-1 gap-1">
            <button
              type="button"
              onClick={() => setMode("s3")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all ${
                mode === "s3"
                  ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              S3-Compatible (Zata.ai)
            </button>
            <button
              type="button"
              onClick={() => setMode("http")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all ${
                mode === "http"
                  ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Generic HTTP
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Endpoint Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Tag size={15} />
              </div>
              <input
                id="name" type="text" required value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production Files"
                className="block w-full rounded-lg bg-slate-50 border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Endpoint URL */}
          <div className="space-y-1.5">
            <label htmlFor="endpointUrl" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {mode === "s3" ? "S3 Service Endpoint URL" : "API Endpoint URL"}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Link2 size={15} />
              </div>
              <input
                id="endpointUrl" type="url" required value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                placeholder={mode === "s3" ? "https://idr01.zata.ai" : "https://your-api.com/files"}
                className="block w-full rounded-lg bg-slate-50 border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* S3 Fields */}
          {mode === "s3" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="accessKeyId" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Access Key ID</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Key size={15} /></div>
                    <input id="accessKeyId" type="text" required value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)}
                      placeholder="Your Access Key ID"
                      className="block w-full rounded-lg bg-slate-50 border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="secretKey" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Secret Access Key</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Lock size={15} /></div>
                    <input id="secretKey" type="password" required value={secretKey} onChange={(e) => setSecretKey(e.target.value)}
                      placeholder="Your Secret Key"
                      className="block w-full rounded-lg bg-slate-50 border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="bucket" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Bucket Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Database size={15} /></div>
                  <input id="bucket" type="text" required value={bucket} onChange={(e) => setBucket(e.target.value)}
                    placeholder="my-bucket-name"
                    className="block w-full rounded-lg bg-slate-50 border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                </div>
              </div>
            </>
          )}

          {/* HTTP Token */}
          {mode === "http" && (
            <div className="space-y-1.5">
              <label htmlFor="token" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                API Key / Access Token
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key size={15} />
                </div>
                <input
                  id="token" type="password" required value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste API token or key here..."
                  className="block w-full rounded-lg bg-slate-50 border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}

          {/* Test Result */}
          {testResult.status !== "idle" && (
            <div className={`rounded-xl border p-4 flex gap-3 text-sm ${
              testResult.status === "connected"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              {testResult.status === "connected"
                ? <CheckCircle size={16} className="shrink-0 text-emerald-500 mt-0.5" />
                : <XCircle size={16} className="shrink-0 text-red-500 mt-0.5" />}
              <div>
                <span className="font-semibold block">{testResult.status === "connected" ? "Connection Verified" : "Connection Failed"}</span>
                <span className="text-xs opacity-80">{testResult.message}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-5 gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || saving || !canTest}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 hover:bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors border border-slate-200 disabled:opacity-50"
            >
              {testing ? <Loader2 size={14} className="animate-spin text-blue-500" /> : <Activity size={14} />}
              Test Connection
            </button>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Link href="/" className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving || testing}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}