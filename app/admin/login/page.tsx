"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mark } from "@/components/brand/Mark";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Sign-in failed.");
      return;
    }
    router.push(data.mustChangePassword ? "/admin/credentials?notice=change_password" : "/admin");
    router.refresh();
  }

  return (
    <div className="grid-texture flex min-h-screen items-center justify-center bg-void px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-lg border border-hairline bg-panel p-8 shadow-instrument"
      >
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Mark size={32} />
          <h1 className="text-lg font-medium text-text-1">Tidevane Admin</h1>
          <p className="text-sm text-text-2">Platform staff only.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-xs text-negative">
            {error}
          </div>
        )}

        <label className="mb-3 flex flex-col gap-1">
          <span className="label-caps text-text-3">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-hairline bg-panel-raised px-3 py-2 text-text-1 outline-none focus:border-teal/50"
          />
        </label>
        <label className="mb-6 flex flex-col gap-1">
          <span className="label-caps text-text-3">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-hairline bg-panel-raised px-3 py-2 text-text-1 outline-none focus:border-teal/50"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-tide-gradient px-4 py-2.5 text-sm font-medium text-void disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
