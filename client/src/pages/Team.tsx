import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function Team() {
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
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-muted-foreground mt-2">Invite teammates, manage roles, and view activity.</p>
        <div className="mt-6 max-w-3xl">
          <div className="border rounded-lg p-4 glass-card">
            <h2 className="font-semibold">Members</h2>
            <p className="text-sm text-muted-foreground mt-2">No members yet — invite collaborators to get started.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
