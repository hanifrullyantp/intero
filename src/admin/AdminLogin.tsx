import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { isSupabaseConfigured, loginAdmin } from "@/lib/api";

export default function AdminLogin() {
  const nav = useNavigate();
  const supabaseMode = isSupabaseConfigured();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await loginAdmin(username, password);
      nav("/admin/dashboard", { replace: true });
    } catch {
      setError(
        supabaseMode
          ? "Login gagal — email/password Supabase atau akun bukan admin."
          : "Login gagal — periksa username/password.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6 font-sans">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 space-y-4"
      >
        <h1 className="text-2xl font-black text-navy-900">Admin Intero</h1>
        <p className="text-sm text-gray-500">
          Masuk untuk mengelola konten situs.
          {supabaseMode && (
            <span className="block mt-2 text-amber-700">
              Mode Supabase: pakai email user yang punya metadata role admin.
            </span>
          )}
        </p>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            {supabaseMode ? "Email" : "Username"}
          </label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete={supabaseMode ? "email" : "username"}
            type={supabaseMode ? "email" : "text"}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Password</label>
          <input
            type="password"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 rounded-xl bg-navy-900 text-white font-bold text-sm hover:bg-navy-800 disabled:opacity-50"
        >
          {busy ? "Memproses…" : "Masuk"}
        </button>
      </form>
    </div>
  );
}
