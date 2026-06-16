"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #EEF7FD 0%, #ffffff 50%, #f8fafc 100%)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl mb-4 shadow-md p-2">
            <Image src="/logo.jpg" alt="Smart Code" width={64} height={64} className="object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-[#3D3D3D]">Smart Code</h1>
          
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">تسجيل الدخول</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5BB8E8] transition"
                placeholder="example@smartcode.sa" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition pr-4 pl-10"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full text-white font-medium py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: "#5BB8E8" }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الدخول...</> : "دخول"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">للحصول على حساب تواصل مع مدير النظام</p>
      </div>
    </div>
  );
}
