import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { FileText, Plus, Loader2, Clock, CheckCircle2, XCircle, Eye } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  loadGenerationRequestForJob,
  saveGenerationRequestForJob,
  type GenerationCreateInput,
} from "@/lib/generationRequestStore";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();

  const retryMutation = trpc.generation.create.useMutation({
    onSuccess: (data, variables) => {
      saveGenerationRequestForJob(data.jobId, variables as GenerationCreateInput);
      toast.success("Retry started");
      setLocation(`/generation/${data.jobId}`);
    },
    onError: (error) => {
      toast.error(`Failed to retry: ${error.message}`);
    },
  });
  
  const { data: jobs, isLoading } = trpc.generation.getHistory.useQuery(undefined, {
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "processing":
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      default:
        return <Badge variant="outline">Queued</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Documents</h1>
              <p className="text-muted-foreground mt-1">
                Manage your generated scholarly documents
              </p>
            </div>
            <Button onClick={() => setLocation("/new")}>
              <Plus className="h-4 w-4 mr-2" />
              New Document
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        {!jobs || jobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
              <p className="text-muted-foreground mb-6">
                Start by creating your first scholarly document
              </p>
              <Button onClick={() => setLocation("/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Create Document
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(job.status)}
                        <CardTitle className="text-xl">{job.title}</CardTitle>
                      </div>
                      <CardDescription>
                        {job.documentType.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} • {job.researchDomain}
                        {job.subdomain && ` • ${job.subdomain}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(job.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Word Count:</span> {job.targetWordCount.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Citation Style:</span> {job.citationStyle}
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>{" "}
                        {new Date(job.createdAt).toLocaleDateString()}
                      </div>
                      {job.noveltyScore && (
                        <div>
                          <span className="font-medium">Novelty:</span>{" "}
                          {(job.noveltyScore * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {job.status === "completed" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setLocation(`/document/${job.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Document
                        </Button>
                      )}
                      {(job.status === "processing" || job.status === "queued") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/generation/${job.id}`)}
                        >
                          View Progress
                        </Button>
                      )}
                      {job.status === "failed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={retryMutation.isPending}
                          onClick={() => {
                            const payload = loadGenerationRequestForJob(job.id);
                            if (!payload) {
                              toast.error("Original parameters not found for this job");
                              setLocation("/new");
                              return;
                            }
                            retryMutation.mutate(payload);
                          }}
                        >
                          {retryMutation.isPending ? "Retrying..." : "Try Again"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
