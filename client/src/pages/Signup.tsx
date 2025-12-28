import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function getNextFromSearch(): string {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next")?.trim();
  if (!next) return "/dashboard";
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

export default function Signup() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const nextPath = useMemo(() => getNextFromSearch(), []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: async (data) => {
      utils.auth.me.setData(undefined, data.user);
      await utils.auth.me.invalidate();
      setLocation(nextPath);
    },
    onError: (err) => toast.error(err.message || "Sign up failed"),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signupMutation.mutateAsync({
      name: name.trim(),
      email: email.trim(),
      password,
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-lg mx-4 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Start generating scholarly work in minutes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 chars, letters + numbers"
                required
              />
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters, including at least one letter and one number.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending ? "Creating account…" : "Create account"}
            </Button>

            <div className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href={`/auth/login?next=${encodeURIComponent(nextPath)}`}
                className="text-primary hover:underline"
              >
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
