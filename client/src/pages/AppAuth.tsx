import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home, ExternalLink, LogIn, UserPlus, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

function safeParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export default function AppAuth() {
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("Dev User");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");

  const nextPath = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next")?.trim();
    if (!next) return "/dashboard";
    if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
    return next;
  }, []);

  const portalUrl = useMemo(() => {
    const raw = (import.meta.env.VITE_OAUTH_PORTAL_URL ?? "").trim();
    if (!raw) return null;
    return safeParseUrl(raw.endsWith("/") ? raw : `${raw}/`);
  }, []);

  const targetUrl = useMemo(() => {
    if (!portalUrl) return null;
    const target = new URL("app-auth", portalUrl);
    // Preserve incoming query params and add explicit mode
    const params = new URLSearchParams(window.location.search);
    params.set("mode", mode);
    target.search = params.toString();
    return target;
  }, [portalUrl, mode]);

  const shouldForward = useMemo(() => {
    if (!targetUrl) return false;
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
    if (localHosts.has(targetUrl.hostname)) return false;
    return targetUrl.origin !== window.location.origin;
  }, [targetUrl]);

  useEffect(() => {
    if (!shouldForward || !targetUrl) return;
    window.location.replace(targetUrl.toString());
  }, [shouldForward, targetUrl]);

  const handleGoHome = () => setLocation("/");

  if (shouldForward) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-lg mx-4 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-pulse" />
                <ExternalLink className="relative h-16 w-16 text-blue-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Redirecting to {mode === "signup" ? "sign up" : "sign in"}…
            </h1>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Taking you to the OAuth portal to complete authentication.
            </p>
            <Button
              onClick={() => window.location.replace(targetUrl!.toString())}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const devSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const endpoint = mode === "signup" ? "/api/auth/dev-signup" : "/api/auth/dev-login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Dev User",
          email: email.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Dev ${mode} failed`);
      }
      window.location.href = nextPath;
    } catch (e) {
      setError(e instanceof Error ? e.message : `Dev ${mode} failed`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-lg mx-4 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-100 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-amber-600" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              onClick={() => setMode("login")}
              className={`px-4 py-2 rounded-lg ${mode === "login" ? "bg-slate-900 text-white" : "bg-white border"}`}
            >
              <User className="w-4 h-4 inline-block mr-2" />
              Sign in
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`px-4 py-2 rounded-lg ${mode === "signup" ? "bg-slate-900 text-white" : "bg-white border"}`}
            >
              <UserPlus className="w-4 h-4 inline-block mr-2" />
              Sign up
            </button>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {mode === "signup" ? "Create an account" : "Sign in"}
          </h1>

          <p className="text-slate-600 mb-6 leading-relaxed">
            Use Dev {mode === "signup" ? "Signup" : "Login"} for local development. For production, configure{" "}
            <code>VITE_OAUTH_PORTAL_URL</code> to an external OAuth portal.
          </p>

          <div className="text-left text-sm text-slate-600 bg-slate-50 rounded-lg p-4 border mb-6 space-y-3">
            <div>
              <div className="font-medium text-slate-800 mb-1">Name</div>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900"
                placeholder="Dev User"
              />
            </div>
            <div>
              <div className="font-medium text-slate-800 mb-1">Email (optional)</div>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-900"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {error ? (
            <div className="text-left text-sm text-red-700 bg-red-50 rounded-lg p-3 border border-red-200 mb-6">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={devSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {isSubmitting ? (mode === "signup" ? "Signing up…" : "Signing in…") : mode === "signup" ? "Dev Signup" : "Dev Login"}
            </Button>

            <Button
              variant="outline"
              onClick={handleGoHome}
              className="px-6 py-2.5 rounded-lg"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
