"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pizza } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { saveAuth, type AuthUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await api.post<AuthUser>("/api/auth/login", {
        email,
        password,
      });
      saveAuth(user);
      // Set cookies for middleware
      document.cookie = `token=${user.token}; path=/; max-age=${
        60 * 60 * 24 * 7
      }`;
      document.cookie = `role=${user.role}; path=/; max-age=${
        60 * 60 * 24 * 7
      }`;
      router.push(user.role === "Admin" ? "/admin/flavors" : "/orders/new");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full min-h-screen">
      {/* Left panel — hero */}
      <div
        className="hidden lg:flex flex-1 flex-col justify-end p-12 relative"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#111",
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Pizza size={48} className="text-[var(--primary)]" />
            <span className="font-mono font-bold text-4xl tracking-[0.2em] text-[var(--primary)]">
              BELLA ROMA
            </span>
          </div>
          <p className="text-white/60 text-lg font-light">
            Bella Roma Pizzaria — Sabor que conecta pessoas.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 lg:max-w-[576px] items-center justify-center bg-[var(--card)] px-8 lg:px-16">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile brand */}
          <div className="flex lg:hidden flex-col items-center gap-2">
            <Pizza size={40} className="text-[var(--primary)]" />
            <span className="font-mono font-bold text-2xl tracking-widest text-[var(--foreground)]">
              BELLA ROMA
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="font-mono font-bold text-2xl text-[var(--foreground)]">
              Entrar
            </h1>
            <p className="text-[var(--muted-foreground)] text-sm">
              Faça login na sua conta
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-mono text-[var(--foreground)]">
                Email
              </label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-mono text-[var(--foreground)]">
                Senha
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-[var(--destructive)]">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-[var(--muted-foreground)]"
            >
              Esqueceu a senha?
            </Button>
          </form>

          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-[var(--muted-foreground)]">
              Não tem uma conta?
            </span>
            <button
              className="text-[var(--primary)] font-mono font-medium hover:underline cursor-pointer"
              onClick={() => router.push("/register")}
            >
              Criar conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
