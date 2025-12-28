import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function Settings() {
  const { loading, user } = useAuth({ redirectOnUnauthenticated: true });
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage account, workspace, and integration settings.</p>
        <div className="mt-6 max-w-3xl">
          <div className="border rounded-lg p-4 glass-card">
            <h2 className="font-semibold">Account</h2>
            <p className="text-sm text-muted-foreground mt-2">Profile and authentication settings will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
