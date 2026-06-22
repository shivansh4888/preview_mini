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
} from "lucide-react";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default function EditEndpointPage({ params }: EditPageProps) {
  const router = useRouter();
  const { id } = use(params);

  const [name, setName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [token, setToken] = useState("");

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
        setToken(data.token);
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
    if (!endpointUrl || !token) { setError("Please fill in Endpoint URL and Token first."); return; }
    setError(null);
    setTesting(true);
    setTestResult({ status: "idle", message: "" });
    try {
      const res = await fetch("/api/endpoints/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpointUrl, token }),
      });
      const data = await res.json();
      if (data.status === "connected") {
        setTestResult({ status: "connected", message: "Connection verified! Endpoint is reachable." });
      } else {
        setTestResult({ status: "failed", message: data.message || "Failed to reach endpoint." });
      }
    } catch (err: any) {
      setTestResult({ status: "failed", message: err.message || "A network error occurred." });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !endpointUrl || !token) { setError("All fields are required."); return; }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/endpoints/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, endpointUrl, token }),
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
              Endpoint URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Link2 size={15} />
              </div>
              <input
                id="endpointUrl" type="url" required value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                placeholder="https://storage.zata.ai/api/files"
                className="block w-full rounded-lg bg-slate-50 border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Token */}
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
              disabled={testing || saving || !endpointUrl || !token}
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
