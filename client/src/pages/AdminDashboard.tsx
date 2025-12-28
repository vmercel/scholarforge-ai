import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Activity, FileText, CheckCircle2, XCircle, Loader2, BarChart3, Award, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  
  const { data: metrics, isLoading } = trpc.admin.getMetrics.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: allJobs } = trpc.admin.getAllJobs.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const documentTypeEntries = Object.entries(metrics.documentTypes || {});

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                System metrics and monitoring
              </p>
            </div>
            <Badge variant="default">Admin</Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8 space-y-6">
        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Generations</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeGenerations}</div>
              <p className="text-xs text-muted-foreground">
                Currently processing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.completed} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Novelty Score</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.avgNoveltyScore ? (metrics.avgNoveltyScore * 100).toFixed(0) : "N/A"}%
              </div>
              <p className="text-xs text-muted-foreground">
                Across all documents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Quality Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.avgQualityScore ? metrics.avgQualityScore.toFixed(0) : "N/A"}/100
              </div>
              <p className="text-xs text-muted-foreground">
                Quality metrics
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Generation Status</CardTitle>
            <CardDescription>Current distribution of generation jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{metrics.completed}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <div>
                  <p className="text-2xl font-bold">{metrics.processing}</p>
                  <p className="text-sm text-muted-foreground">Processing</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Activity className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{metrics.queued}</p>
                  <p className="text-sm text-muted-foreground">Queued</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <XCircle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{metrics.failed}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Document Type Distribution</CardTitle>
            <CardDescription>Breakdown by document type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documentTypeEntries.length > 0 ? (
                documentTypeEntries.map(([type, count]) => {
                  const percentage = ((count / metrics.total) * 100).toFixed(1);
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                        </span>
                        <span className="text-muted-foreground">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Generation Jobs</CardTitle>
            <CardDescription>Latest 10 generation requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allJobs && allJobs.length > 0 ? (
                allJobs.slice(0, 10).map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{job.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.documentType.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} • {job.researchDomain}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {job.status === "completed" && (
                        <Badge variant="default">Completed</Badge>
                      )}
                      {job.status === "processing" && (
                        <Badge variant="secondary">Processing</Badge>
                      )}
                      {job.status === "failed" && (
                        <Badge variant="destructive">Failed</Badge>
                      )}
                      {job.status === "queued" && (
                        <Badge variant="outline">Queued</Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No jobs yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
