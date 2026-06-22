"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HardDrive,
  Trash2,
  Edit,
  FolderOpen,
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Plus,
  Folder,
} from "lucide-react";

interface Endpoint {
  id: string;
  name: string;
  endpointUrl: string;
  createdAt: string;
}

type ConnectionStatus = "idle" | "testing" | "connected" | "failed";

interface StatusMap {
  [key: string]: {
    status: ConnectionStatus;
    message?: string;
  };
}

export default function Dashboard() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<StatusMap>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const fetchEndpoints = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/endpoints");
      if (!res.ok) throw new Error("Failed to fetch endpoints");
      const data = await res.json();
      setEndpoints(data);
      const initialStatuses: StatusMap = {};
      data.forEach((ep: Endpoint) => {
        initialStatuses[ep.id] = { status: "idle" };
      });
      setStatuses(initialStatuses);
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching endpoints.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (id: string) => {
    setStatuses((prev) => ({ ...prev, [id]: { status: "testing" } }));
    try {
      const res = await fetch(`/api/endpoints/${id}/test`, { method: "POST" });
      const data = await res.json();
      if (data.status === "connected") {
        setStatuses((prev) => ({ ...prev, [id]: { status: "connected", message: "Connected!" } }));
      } else {
        setStatuses((prev) => ({ ...prev, [id]: { status: "failed", message: data.message || "Failed to connect" } }));
      }
    } catch (err: any) {
      setStatuses((prev) => ({ ...prev, [id]: { status: "failed", message: err.message || "Network error" } }));
    }
  };

  const handleDeleteEndpoint = async (id: string, name: string) => {
    if (!confirm(`Delete endpoint "${name}"?`)) return;
    try {
      const res = await fetch(`/api/endpoints/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete endpoint");
      setEndpoints((prev) => prev.filter((ep) => ep.id !== id));
      setStatuses((prev) => { const copy = { ...prev }; delete copy[id]; return copy; });
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Storage Endpoints</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your Zata.ai storage connections and access credentials.
          </p>
        </div>
        <Link
          href="/endpoints/new"
          className="self-start sm:self-auto inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
        >
          <Plus size={16} />
          Add Endpoint
        </Link>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="animate-spin text-blue-500 mb-2" size={28} />
          <p className="text-slate-400 text-sm">Loading storage endpoints...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex gap-3 text-red-700">
          <AlertCircle className="shrink-0" size={20} />
          <div>
            <p className="font-semibold text-sm">Error Loading Endpoints</p>
            <p className="text-xs mt-0.5 text-red-500">{error}</p>
            <button onClick={fetchEndpoints} className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-xs font-medium rounded transition-colors">
              Try Again
            </button>
          </div>
        </div>
      ) : endpoints.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-slate-200 rounded-2xl min-h-[350px] bg-white">
          <div className="p-4 bg-blue-50 text-blue-500 rounded-2xl mb-4">
            <HardDrive size={36} strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No endpoints registered</h3>
          <p className="text-slate-400 text-sm max-w-sm mt-1 mb-6">
            Get started by adding a Zata storage endpoint to browse and preview files.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/endpoints/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              <Plus size={16} /> Add First Endpoint
            </Link>
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/endpoints", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: "Local Mock Storage",
                      endpointUrl: `${window.location.origin}/api/mock-zata`,
                      token: "mock-token-12345",
                    }),
                  });
                  if (res.ok) fetchEndpoints();
                  else { const d = await res.json(); alert(d.error || "Failed"); }
                } catch (e: any) { alert(e.message); }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-100 hover:bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors border border-slate-200"
            >
              Add Local Mock Endpoint
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {endpoints.map((ep) => {
            const epStatus = statuses[ep.id] || { status: "idle" };
            return (
              <div
                key={ep.id}
                className="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200 shadow-sm"
              >
                {/* Card Header */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-xl bg-blue-50 text-blue-500 shrink-0">
                      <Folder size={24} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-slate-900 truncate">{ep.name}</h2>
                      <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">{ep.endpointUrl}</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    {epStatus.status === "idle" && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>Not Tested
                      </span>
                    )}
                    {epStatus.status === "testing" && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                        <Loader2 className="animate-spin" size={11} />Testing...
                      </span>
                    )}
                    {epStatus.status === "connected" && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
                        <CheckCircle size={11} />Connected
                      </span>
                    )}
                    {epStatus.status === "failed" && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-500">
                        <XCircle size={11} />Failed
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                  <Link
                    href={`/endpoints/${ep.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                  >
                    <FolderOpen size={13} /> Open Files
                  </Link>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTestConnection(ep.id)}
                      disabled={epStatus.status === "testing"}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Test Connection"
                    >
                      <Activity size={15} />
                    </button>
                    <Link
                      href={`/endpoints/${ep.id}/edit`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Edit"
                    >
                      <Edit size={15} />
                    </Link>
                    <button
                      onClick={() => handleDeleteEndpoint(ep.id, ep.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
