import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Circle, Loader2, XCircle, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  loadGenerationRequestForJob,
  saveGenerationRequestForJob,
  type GenerationCreateInput,
} from "@/lib/generationRequestStore";

interface GenerationProgressProps {
  jobId: number;
}

const PHASES = [
  "Literature Review",
  "Novelty Assessment",
  "Argument Architecture",
  "Section Writing",
  "Figure Generation",
  "Internal Review",
  "Final Assembly",
];

export default function GenerationProgress({ jobId }: GenerationProgressProps) {
  const { loading: authLoading, user } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  
  const { data: job, refetch } = trpc.generation.getStatus.useQuery(
    { jobId },
    {
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        // Poll every 2 seconds while processing, stop when completed or failed
        return status === "processing" || status === "queued" ? 2000 : false;
      },
    }
  );

  const cancelMutation = trpc.generation.cancel.useMutation({
    onSuccess: () => {
      toast.success("Generation cancelled");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to cancel: ${error.message}`);
    },
  });

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

  // Redirect to document view when completed
  useEffect(() => {
    if (job?.status === "completed") {
      setTimeout(() => {
        setLocation(`/document/${jobId}`);
      }, 2000);
    }
  }, [job?.status, jobId, setLocation]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  if (!job) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getPhaseStatus = (phaseName: string) => {
    if (!job.currentPhase) return "pending";
    
    const currentIndex = PHASES.indexOf(job.currentPhase);
    const phaseIndex = PHASES.indexOf(phaseName);
    
    if (job.status === "completed") return "completed";
    if (job.status === "failed") {
      if (phaseIndex < currentIndex) return "completed";
      if (phaseIndex === currentIndex) return "failed";
      return "pending";
    }
    
    if (phaseIndex < currentIndex) return "completed";
    if (phaseIndex === currentIndex) return "processing";
    return "pending";
  };

  const PhaseIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "processing":
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>
            {job.status === "completed" && "Document Generated Successfully!"}
            {job.status === "failed" && "Generation Failed"}
            {job.status === "processing" && "Generating Your Document"}
            {job.status === "queued" && "Generation Queued"}
          </CardTitle>
          <CardDescription>{job.title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {job.status === "completed" && "Complete"}
                {job.status === "failed" && "Failed"}
                {job.status === "processing" && `${job.progressPercentage}% Complete`}
                {job.status === "queued" && "Waiting to start..."}
              </span>
              {job.status === "processing" && job.estimatedTimeRemaining && (
                <span className="text-muted-foreground">
                  ~{job.estimatedTimeRemaining} minutes remaining
                </span>
              )}
            </div>
            <Progress value={job.progressPercentage || 0} className="h-2" />
          </div>

          {/* Current Phase */}
          {job.currentPhase && job.status === "processing" && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div>
                  <p className="font-medium">Current Phase: {job.currentPhase}</p>
                  <p className="text-sm text-muted-foreground">
                    Processing your document...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {job.status === "failed" && job.errorMessage && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Error</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {job.errorMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Phase List */}
          <div className="space-y-3">
            {PHASES.map((phase) => {
              const status = getPhaseStatus(phase);
              return (
                <div
                  key={phase}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    status === "processing"
                      ? "bg-primary/5 border border-primary/20"
                      : status === "completed"
                      ? "bg-muted/30"
                      : ""
                  }`}
                >
                  <PhaseIcon status={status} />
                  <span
                    className={`flex-1 ${
                      status === "processing"
                        ? "font-medium"
                        : status === "completed"
                        ? "text-muted-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {phase}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            {job.status === "completed" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Redirecting to document view...
              </div>
            )}
            
            {(job.status === "processing" || job.status === "queued") && (
              <Button
                variant="outline"
                onClick={() => cancelMutation.mutate({ jobId })}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "Cancelling..." : "Cancel Generation"}
              </Button>
            )}

            {job.status === "failed" && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    const payload = loadGenerationRequestForJob(jobId);
                    if (!payload) {
                      toast.error("Original parameters not found for this job");
                      setLocation("/new");
                      return;
                    }
                    retryMutation.mutate(payload);
                  }}
                  disabled={retryMutation.isPending}
                >
                  {retryMutation.isPending ? "Retrying..." : "Try Again"}
                </Button>
                <Button variant="outline" onClick={() => setLocation("/new")}>
                  Edit Parameters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
