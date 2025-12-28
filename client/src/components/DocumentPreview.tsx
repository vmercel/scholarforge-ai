import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { FileText, Download, Edit, Loader2, Award, BarChart3, Clock, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

interface DocumentPreviewProps {
  jobId?: number;
  documentId?: number;
}

export default function DocumentPreview({ jobId, documentId }: DocumentPreviewProps) {
  const { loading: authLoading, user } = useAuth({ redirectOnUnauthenticated: true });
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionType, setRevisionType] = useState<string>("targeted_edit");
  const [revisionInstructions, setRevisionInstructions] = useState("");
  const [preserveOptions, setPreserveOptions] = useState({
    preserveArgument: true,
    preserveFigures: true,
    preserveWordCount: false,
    preserveCitations: true,
  });
  const [, setLocation] = useLocation();

  const byIdQuery = trpc.documents.getById.useQuery(
    { documentId: documentId ?? 0 },
    { enabled: !!user && typeof documentId === "number" && Number.isFinite(documentId) }
  );
  const byJobQuery = trpc.documents.getByJobId.useQuery(
    { jobId: jobId ?? 0 },
    { enabled: !!user && typeof jobId === "number" && Number.isFinite(jobId) }
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const doc = documentId ? byIdQuery.data : byJobQuery.data;
  const isLoading = documentId ? byIdQuery.isLoading : byJobQuery.isLoading;

  const revisionHistoryQuery = trpc.revisions.getHistory.useQuery(
    { documentId: doc?.id ?? 0 },
    {
      enabled: Boolean(doc?.id),
      refetchInterval: (q) => {
        const data = q.state.data ?? [];
        const hasActive = data.some((r: any) => r.status === "pending" || r.status === "processing");
        return hasActive ? 2000 : false;
      },
    }
  );

  const createRevisionMutation = trpc.revisions.create.useMutation({
    onSuccess: () => {
      toast.success("Revision request submitted!");
      setRevisionDialogOpen(false);
      setRevisionInstructions("");
      revisionHistoryQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create revision: ${error.message}`);
    },
  });

  const exportMutation = trpc.documents.export.useMutation({
    onError: (error) => toast.error(`Export failed: ${error.message}`),
  });

  const downloadTextFile = (filename: string, mimeType: string, content: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = filename;
    window.document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleRevisionSubmit = () => {
    if (!doc || !revisionInstructions.trim()) {
      toast.error("Please provide revision instructions");
      return;
    }

    createRevisionMutation.mutate({
      documentId: doc.id,
      revisionType: revisionType as any,
      instructions: revisionInstructions,
      ...preserveOptions,
    });
  };

  const getNoveltyColor = (score?: number | null) => {
    if (!score) return "secondary";
    if (score >= 0.8) return "default";
    if (score >= 0.6) return "secondary";
    return "outline";
  };

  const getNoveltyLabel = (score?: number | null) => {
    if (!score) return "Unknown";
    if (score >= 0.8) return "Substantial";
    if (score >= 0.6) return "Moderate";
    return "Incremental";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Document not found</p>
            <p className="text-sm text-muted-foreground mt-2">
              The document may still be generating or does not exist.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      {/* Header Card with Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{doc.title}</CardTitle>
              <CardDescription>
                {doc.documentType.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} • {doc.wordCount.toLocaleString()} words
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {typeof documentId === "number" ? (
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/document/${doc.jobId}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Latest
                </Button>
              ) : null}
              <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Request Revision
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Request Document Revision</DialogTitle>
                    <DialogDescription>
                      Describe the changes you'd like to make to your document
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Revision Type</Label>
                      <RadioGroup value={revisionType} onValueChange={setRevisionType}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="targeted_edit" id="targeted" />
                          <Label htmlFor="targeted">Targeted Edit (specific section)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="global_revision" id="global" />
                          <Label htmlFor="global">Global Revision (entire document)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="expansion" id="expansion" />
                          <Label htmlFor="expansion">Expansion (add content)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="reduction" id="reduction" />
                          <Label htmlFor="reduction">Reduction (shorten)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="style_adjustment" id="style" />
                          <Label htmlFor="style">Style Adjustment</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instructions">Revision Instructions</Label>
                      <Textarea
                        id="instructions"
                        value={revisionInstructions}
                        onChange={(e) => setRevisionInstructions(e.target.value)}
                        placeholder="Please expand the methods section to include more detail on the statistical validation approach..."
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Preserve</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="preserveArgument"
                            checked={preserveOptions.preserveArgument}
                            onCheckedChange={(checked) =>
                              setPreserveOptions((prev) => ({ ...prev, preserveArgument: !!checked }))
                            }
                          />
                          <Label htmlFor="preserveArgument">Main argument structure</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="preserveFigures"
                            checked={preserveOptions.preserveFigures}
                            onCheckedChange={(checked) =>
                              setPreserveOptions((prev) => ({ ...prev, preserveFigures: !!checked }))
                            }
                          />
                          <Label htmlFor="preserveFigures">Existing figures</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="preserveWordCount"
                            checked={preserveOptions.preserveWordCount}
                            onCheckedChange={(checked) =>
                              setPreserveOptions((prev) => ({ ...prev, preserveWordCount: !!checked }))
                            }
                          />
                          <Label htmlFor="preserveWordCount">Current word count</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="preserveCitations"
                            checked={preserveOptions.preserveCitations}
                            onCheckedChange={(checked) =>
                              setPreserveOptions((prev) => ({ ...prev, preserveCitations: !!checked }))
                            }
                          />
                          <Label htmlFor="preserveCitations">Citation selections</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setRevisionDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRevisionSubmit}
                      disabled={createRevisionMutation.isPending}
                    >
                      {createRevisionMutation.isPending ? "Submitting..." : "Submit Revision"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Award className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Novelty Score</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold">
                    {doc.noveltyScore ? (doc.noveltyScore * 100).toFixed(0) : "N/A"}
                  </p>
                  <Badge variant={getNoveltyColor(doc.noveltyScore)}>
                    {getNoveltyLabel(doc.noveltyScore)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Quality Score</p>
                <p className="text-lg font-semibold">
                  {doc.qualityScore || "N/A"}/100
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Citations</p>
                <p className="text-lg font-semibold">{doc.citations?.length || 0}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Figures</p>
                <p className="text-lg font-semibold">{doc.figures?.length || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revision History */}
      <Card>
        <CardHeader>
          <CardTitle>Revisions</CardTitle>
          <CardDescription>Requests and generated versions for this document</CardDescription>
        </CardHeader>
        <CardContent>
          {revisionHistoryQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading revisions…
            </div>
          ) : (revisionHistoryQuery.data?.length ?? 0) === 0 ? (
            <div className="text-sm text-muted-foreground">No revisions yet.</div>
          ) : (
            <div className="space-y-3">
              {revisionHistoryQuery.data!.map((r) => {
                const statusIcon =
                  r.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : r.status === "failed" ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : r.status === "processing" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  );

                return (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      {statusIcon}
                      <div>
                        <div className="text-sm font-medium">
                          {r.revisionType.replace(/_/g, " ")} • {r.status}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === "completed" && r.newDocumentId ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/doc/${r.newDocumentId}`}>Open</Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Document Preview</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => toast.info("Download feature coming soon")}>
                <Download className="h-4 w-4 mr-2" />
                DOCX
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.info("Download feature coming soon")}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={exportMutation.isPending}
                onClick={async () => {
                  const result = await exportMutation.mutateAsync({
                    documentId: doc.id,
                    format: "markdown",
                  });
                  downloadTextFile(result.filename, result.mimeType, result.content);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Markdown
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={exportMutation.isPending}
                onClick={async () => {
                  const result = await exportMutation.mutateAsync({
                    documentId: doc.id,
                    format: "latex",
                  });
                  downloadTextFile(result.filename, result.mimeType, result.content);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                LaTeX
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="content">
            <TabsList>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="authors">Authors</TabsTrigger>
              <TabsTrigger value="citations">Citations</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-6">
              <div className="prose prose-sm max-w-none">
                {doc.abstract && (
                  <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Abstract</h3>
                    <p className="text-muted-foreground">{doc.abstract}</p>
                  </div>
                )}
                <Streamdown>{doc.content}</Streamdown>
              </div>
            </TabsContent>

            <TabsContent value="authors" className="mt-6">
              <div className="space-y-4">
                {doc.authors?.map((author, index) => (
                  <Card key={author.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{author.name}</h4>
                          <p className="text-sm text-muted-foreground">{author.affiliation}</p>
                          {author.email && (
                            <p className="text-sm text-muted-foreground mt-1">{author.email}</p>
                          )}
                          {author.orcid && (
                            <p className="text-sm text-muted-foreground">ORCID: {author.orcid}</p>
                          )}
                        </div>
                        {author.isCorresponding === 1 && (
                          <Badge>Corresponding</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="citations" className="mt-6">
              <div className="space-y-3">
                {doc.citations?.map((citation, index) => (
                  <div key={citation.id} className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        [{index + 1}]
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{citation.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {citation.authorsText}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {citation.journal && `${citation.journal}, `}
                          {citation.year}
                          {citation.doi && ` • DOI: ${citation.doi}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="metadata" className="mt-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Document Type</Label>
                  <p className="font-medium">
                    {doc.documentType.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Citation Style</Label>
                  <p className="font-medium">{doc.citationStyle}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Keywords</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {doc.keywords?.map((keyword) => (
                      <Badge key={keyword} variant="secondary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="font-medium">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
