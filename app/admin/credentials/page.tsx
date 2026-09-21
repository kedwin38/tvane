"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ChangePasswordBanner } from "@/components/admin/ChangePasswordBanner";

type Credential = {
  key: string;
  description: string;
  configured: boolean;
  masked: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export default function AdminCredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/credentials");
    if (res.ok) setCredentials((await res.json()).credentials);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(key: string) {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: draft }),
    });
    setSaving(false);
    if (res.ok) {
      setEditingKey(null);
      setDraft("");
      setMessage(`Updated ${key}.`);
      load();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Update failed.");
    }
  }

  return (
    <div className="min-h-screen bg-void">
      <AdminHeader />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="mb-2 text-xl font-medium text-text-1">Deriv Credentials</h1>
        <p className="mb-8 text-sm text-text-2">
          Encrypted at rest (AES-256-GCM). Changes apply immediately — no redeploy needed.
        </p>

        <ChangePasswordBanner />

        {message && <p className="mb-4 text-sm text-teal">{message}</p>}

        <div className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline bg-panel">
          {credentials.map((c) => (
            <div key={c.key} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-sm text-text-1">{c.key}</span>
                  <p className="mt-1 text-xs text-text-3">{c.description}</p>
                </div>
                <span
                  className={`label-caps rounded px-2 py-0.5 ${
                    c.configured ? "bg-positive/10 text-positive" : "bg-warning/10 text-warning"
                  }`}
                >
                  {c.configured ? "Configured" : "Not set"}
                </span>
              </div>

              {editingKey === c.key ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="New value"
                    className="flex-1 rounded-md border border-hairline bg-panel-raised px-3 py-2 font-mono text-sm text-text-1 outline-none focus:border-teal/50"
                  />
                  <button
                    disabled={saving || !draft.trim()}
                    onClick={() => save(c.key)}
                    className="rounded-md bg-tide-gradient px-4 py-2 text-sm font-medium text-void disabled:opacity-40"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingKey(null);
                      setDraft("");
                    }}
                    className="rounded-md border border-hairline px-4 py-2 text-sm text-text-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-text-2">{c.masked ?? "—"}</span>
                  <button
                    onClick={() => {
                      setEditingKey(c.key);
                      setDraft("");
                    }}
                    className="label-caps text-teal hover:underline"
                  >
                    {c.configured ? "Rotate" : "Set"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
