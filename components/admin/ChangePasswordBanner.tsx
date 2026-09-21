"use client";

import { useEffect, useState } from "react";

export function ChangePasswordBanner() {
  const [mustChange, setMustChange] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => setMustChange(Boolean(d.mustChangePassword)));
  }, []);

  if (!mustChange || done) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to change password.");
      return;
    }
    setDone(true);
  }

  return (
    <form
      onSubmit={submit}
      className="mb-8 flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning/5 p-5"
    >
      <p className="text-sm text-text-1">
        This account is using its seed password. Set a new one before continuing.
      </p>
      {error && <p className="text-xs text-negative">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <input
          type="password"
          required
          placeholder="Current (seed) password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="rounded-md border border-hairline bg-panel-raised px-3 py-2 text-sm text-text-1 outline-none focus:border-teal/50"
        />
        <input
          type="password"
          required
          minLength={12}
          placeholder="New password (12+ characters)"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="rounded-md border border-hairline bg-panel-raised px-3 py-2 text-sm text-text-1 outline-none focus:border-teal/50"
        />
      </div>
      <button className="self-start rounded-md bg-tide-gradient px-4 py-2 text-sm font-medium text-void">
        Set new password
      </button>
    </form>
  );
}
