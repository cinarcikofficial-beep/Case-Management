"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { APP_DOMAIN } from "@/lib/constants";
import Image from "next/image";

type View =
  | "login"
  | "register"
  | "verify-register"
  | "forgot"
  | "verify-forgot"
  | "create-password"
  | "confirm-password";

export default function LoginPage() {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      sessionStorage.setItem("session_active", "true");
      toast.success("Giriş başarılı!");
      router.push("/dashboard");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (type: "register" | "reset") => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Doğrulama kodu gönderildi!");
      setView(type === "register" ? "verify-register" : "verify-forgot");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (target: "create-password") => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Kod doğrulandı! Şimdi şifre oluşturun.");
      setView(target);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Doğrulama başarısız");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalıdır.");
      return;
    }
    setView("confirm-password");
  };

  const handleConfirmPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Şifreler eşleşmiyor!");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      sessionStorage.setItem("session_active", "true");
      toast.success("Hesabınız oluşturuldu! Giriş yapılıyor...");
      router.push("/dashboard");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "İşlem başarısız");
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setPassword("");
    setConfirmPassword("");
    setCode("");
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-[#1e293b] border border-[#334155] rounded-2xl p-10 shadow-[0_10px_25px_rgba(0,0,0,0.3)] text-center">
        <div className="flex justify-center mb-6">
          <Image src="/verytech_beyaz.png" alt="Verytech" width={200} height={200} className="object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-1 tracking-wide">Verytech</h1>
        <p className="text-sm font-semibold text-slate-300 mb-4">Case Management & Knowledge Base</p>
        <p className="text-sm text-slate-400 mb-6">
          {view === "login" && "Hesabınıza giriş yapın"}
          {view === "register" && "Yeni hesap oluşturun"}
          {view === "verify-register" && "Doğrulama kodunu girin"}
          {view === "forgot" && "Şifre sıfırlama"}
          {view === "verify-forgot" && "Doğrulama kodunu girin"}
          {view === "create-password" && "Yeni şifrenizi oluşturun"}
          {view === "confirm-password" && "Şifrenizi onaylayın"}
        </p>

        {/* ===== LOGIN ===== */}
        {view === "login" && (
          <form onSubmit={handleLogin} className="text-left space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">E-Posta Adresi</label>
              <input
                type="email" required autoComplete="off"
                placeholder={`ornek${APP_DOMAIN}`}
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-[#475569] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.25)] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Şifre</label>
              <input
                type="password" required placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-[#475569] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.25)] transition-all"
              />
            </div>
            <div className="text-right">
              <button
                type="button"
                onClick={() => { resetAll(); setView("forgot"); }}
                className="text-amber-400 hover:text-amber-300 text-xs font-semibold no-underline cursor-pointer"
              >
                Şifremi Unuttum?
              </button>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer">
              {loading ? "İşleniyor..." : "Giriş Yap"}
            </button>
            <div className="text-center pt-2">
              <button type="button"
                onClick={() => { resetAll(); setView("register"); }}
                className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold no-underline cursor-pointer">
                ✨ Yalnızca Verytech Çalışanı! Kayıt Olun
              </button>
            </div>
          </form>
        )}

        {/* ===== REGISTER (email only) ===== */}
        {view === "register" && (
          <form onSubmit={(e) => { e.preventDefault(); handleSendCode("register"); }} className="text-left space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">E-Posta Adresi</label>
              <input
                type="email" required autoComplete="off"
                placeholder={`ornek${APP_DOMAIN}`}
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-[#475569] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.25)] transition-all"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer">
              {loading ? "Gönderiliyor..." : "Doğrulama Kodu Gönder"}
            </button>
            <div className="text-center">
              <button type="button"
                onClick={() => { resetAll(); setView("login"); }}
                className="text-slate-400 hover:text-slate-200 text-xs font-semibold no-underline cursor-pointer">
                ← Giriş ekranına dön
              </button>
            </div>
          </form>
        )}

        {/* ===== VERIFY CODE (register) ===== */}
        {view === "verify-register" && (
          <form onSubmit={(e) => { e.preventDefault(); handleVerifyCode("create-password"); }} className="text-left space-y-4">
            <p className="text-xs text-slate-400 text-center">
              <span className="text-slate-200 font-medium">{email}</span> adresine 6 haneli kod gönderildi.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Doğrulama Kodu</label>
              <input type="text" required maxLength={6} placeholder="000000"
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-[#475569] text-white text-sm text-center tracking-[0.5em] font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.25)] transition-all"
              />
            </div>
            <button type="submit" disabled={loading || code.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer">
              {loading ? "Doğrulanıyor..." : "Doğrula"}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => { resetAll(); setView("register"); }}
                className="text-slate-400 hover:text-slate-200 text-xs font-semibold no-underline cursor-pointer">
                ← Farklı e-posta ile kayıt ol
              </button>
            </div>
          </form>
        )}

        {/* ===== FORGOT PASSWORD ===== */}
        {view === "forgot" && (
          <form onSubmit={(e) => { e.preventDefault(); handleSendCode("reset"); }} className="text-left space-y-4">
            <p className="text-xs text-slate-400 text-center">
              E-posta adresinize doğrulama kodu göndereceğiz.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">E-Posta Adresi</label>
              <input
                type="email" required autoComplete="off"
                placeholder={`ornek${APP_DOMAIN}`}
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-[#475569] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.25)] transition-all"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer">
              {loading ? "Gönderiliyor..." : "Doğrulama Kodu Gönder"}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => { resetAll(); setView("login"); }}
                className="text-slate-400 hover:text-slate-200 text-xs font-semibold no-underline cursor-pointer">
                ← Giriş ekranına dön
              </button>
            </div>
          </form>
        )}

        {/* ===== VERIFY CODE (forgot) ===== */}
        {view === "verify-forgot" && (
          <form onSubmit={(e) => { e.preventDefault(); handleVerifyCode("create-password"); }} className="text-left space-y-4">
            <p className="text-xs text-slate-400 text-center">
              <span className="text-slate-200 font-medium">{email}</span> adresine 6 haneli kod gönderildi.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Doğrulama Kodu</label>
              <input type="text" required maxLength={6} placeholder="000000"
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-[#475569] text-white text-sm text-center tracking-[0.5em] font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.25)] transition-all"
              />
            </div>
            <button type="submit" disabled={loading || code.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer">
              {loading ? "Doğrulanıyor..." : "Doğrula"}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => { resetAll(); setView("forgot"); }}
                className="text-slate-400 hover:text-slate-200 text-xs font-semibold no-underline cursor-pointer">
                ← Farklı e-posta ile sıfırla
              </button>
            </div>
          </form>
        )}

        {/* ===== CREATE PASSWORD ===== */}
        {view === "create-password" && (
          <form onSubmit={handleCreatePassword} className="text-left space-y-4">
            <p className="text-xs text-slate-400 text-center">Giriş yapmak için bir şifre oluşturun.</p>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Şifre</label>
              <input type="password" required minLength={6} placeholder="En az 6 karakter"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-[#475569] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.25)] transition-all"
              />
            </div>
            <button type="submit" disabled={loading || password.length < 6}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer">
              Devam Et
            </button>
          </form>
        )}

        {/* ===== CONFIRM PASSWORD ===== */}
        {view === "confirm-password" && (
          <form onSubmit={handleConfirmPassword} className="text-left space-y-4">
            <p className="text-xs text-slate-400 text-center">Şifrenizi tekrar girin.</p>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Şifre Tekrar</label>
              <input type="password" required placeholder="Şifrenizi tekrar girin"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-[#0f172a] border border-[#475569] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.25)] transition-all"
              />
            </div>
            <button type="submit" disabled={loading || !confirmPassword}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer">
              {loading ? "Kaydediliyor..." : "Kayıt Ol ve Giriş Yap"}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => { setView("create-password"); setConfirmPassword(""); }}
                className="text-slate-400 hover:text-slate-200 text-xs font-semibold no-underline cursor-pointer">
                ← Şifreyi değiştir
              </button>
            </div>
          </form>
        )}
      </div>
      <p className="mt-6 text-xs text-slate-500">&copy;2026 - Designed By Kerim KAPLAN</p>
    </div>
  );
}
