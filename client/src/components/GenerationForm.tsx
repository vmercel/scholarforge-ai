import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  saveGenerationRequestForJob,
  saveLastGenerationRequest,
  type GenerationCreateInput,
} from "@/lib/generationRequestStore";

interface Author {
  name: string;
  affiliation: string;
  email: string;
  orcid: string;
  isCorresponding: boolean;
}

interface FormData {
  documentType: string;
  title: string;
  researchDomain: string;
  subdomain: string;
  targetWordCount: number;
  numFigures: number;
  numTables: number;
  numReferences: number;
  citationStyle: string;
  targetJournal: string;
  abstractProvided: string;
  keyHypotheses: string[];
  methodologyConstraints: string[];
  authors: Author[];
}

const DOCUMENT_TYPES = [
  "journal_article",
  "conference_paper",
  "thesis",
  "dissertation",
  "research_proposal",
  "grant_proposal",
  "technical_report",
  "book_chapter",
];

const CITATION_STYLES = [
  "APA7",
  "MLA9",
  "Chicago",
  "Harvard",
  "IEEE",
  "Vancouver",
  "Nature",
  "Science",
];

export default function GenerationForm() {
  const { loading: authLoading, user } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    documentType: "journal_article",
    title: "",
    researchDomain: "",
    subdomain: "",
    targetWordCount: 5000,
    numFigures: 0,
    numTables: 0,
    numReferences: 50,
    citationStyle: "APA7",
    targetJournal: "",
    abstractProvided: "",
    keyHypotheses: [],
    methodologyConstraints: [],
    authors: [
      {
        name: "",
        affiliation: "",
        email: "",
        orcid: "",
        isCorresponding: true,
      },
    ],
  });

  const createJobMutation = trpc.generation.create.useMutation({
    onSuccess: (data, variables) => {
      saveGenerationRequestForJob(data.jobId, variables as GenerationCreateInput);
      toast.success("Generation job created successfully!");
      setLocation(`/generation/${data.jobId}`);
    },
    onError: (error) => {
      toast.error(`Failed to create generation job: ${error.message}`);
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addAuthor = () => {
    setFormData((prev) => ({
      ...prev,
      authors: [
        ...prev.authors,
        {
          name: "",
          affiliation: "",
          email: "",
          orcid: "",
          isCorresponding: false,
        },
      ],
    }));
  };

  const removeAuthor = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      authors: prev.authors.filter((_, i) => i !== index),
    }));
  };

  const updateAuthor = (index: number, field: keyof Author, value: any) => {
    setFormData((prev) => ({
      ...prev,
      authors: prev.authors.map((author, i) =>
        i === index ? { ...author, [field]: value } : author
      ),
    }));
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.title || !formData.researchDomain) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.authors.length === 0 || !formData.authors[0].name) {
      toast.error("Please add at least one author");
      return;
    }

    saveLastGenerationRequest(formData as unknown as GenerationCreateInput);
    createJobMutation.mutate(formData);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.documentType && formData.title && formData.researchDomain;
      case 2:
        return formData.targetWordCount > 0 && formData.citationStyle;
      case 3:
        return formData.authors.length > 0 && formData.authors[0].name;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>New Scholarly Document</CardTitle>
          <CardDescription>
            Step {step} of 4: {
              step === 1 ? "Project Setup" :
              step === 2 ? "Document Parameters" :
              step === 3 ? "Author Information" :
              "Research Direction"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Project Setup */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="documentType">Document Type *</Label>
                <Select
                  value={formData.documentType}
                  onValueChange={(value) => updateField("documentType", value)}
                >
                  <SelectTrigger id="documentType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Working Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="Enter your document title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="researchDomain">Research Domain *</Label>
                  <Input
                    id="researchDomain"
                    value={formData.researchDomain}
                    onChange={(e) => updateField("researchDomain", e.target.value)}
                    placeholder="e.g., Machine Learning"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subdomain">Subdomain</Label>
                  <Input
                    id="subdomain"
                    value={formData.subdomain}
                    onChange={(e) => updateField("subdomain", e.target.value)}
                    placeholder="e.g., Reinforcement Learning"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Document Parameters */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetWordCount">Target Word Count *</Label>
                  <Input
                    id="targetWordCount"
                    type="number"
                    value={formData.targetWordCount}
                    onChange={(e) => updateField("targetWordCount", parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numReferences">Number of References</Label>
                  <Input
                    id="numReferences"
                    type="number"
                    value={formData.numReferences}
                    onChange={(e) => updateField("numReferences", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numFigures">Number of Figures</Label>
                  <Input
                    id="numFigures"
                    type="number"
                    value={formData.numFigures}
                    onChange={(e) => updateField("numFigures", parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numTables">Number of Tables</Label>
                  <Input
                    id="numTables"
                    type="number"
                    value={formData.numTables}
                    onChange={(e) => updateField("numTables", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="citationStyle">Citation Style *</Label>
                  <Select
                    value={formData.citationStyle}
                    onValueChange={(value) => updateField("citationStyle", value)}
                  >
                    <SelectTrigger id="citationStyle">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CITATION_STYLES.map((style) => (
                        <SelectItem key={style} value={style}>
                          {style}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetJournal">Target Journal</Label>
                  <Input
                    id="targetJournal"
                    value={formData.targetJournal}
                    onChange={(e) => updateField("targetJournal", e.target.value)}
                    placeholder="e.g., Nature Communications"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Authors */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Authors *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAuthor}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Author
                </Button>
              </div>

              {formData.authors.map((author, index) => (
                <Card key={index}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Author {index + 1}</h4>
                      {formData.authors.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAuthor(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          value={author.name}
                          onChange={(e) => updateAuthor(index, "name", e.target.value)}
                          placeholder="Dr. Jane Smith"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Affiliation *</Label>
                        <Input
                          value={author.affiliation}
                          onChange={(e) => updateAuthor(index, "affiliation", e.target.value)}
                          placeholder="MIT"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={author.email}
                          onChange={(e) => updateAuthor(index, "email", e.target.value)}
                          placeholder="jsmith@mit.edu"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>ORCID</Label>
                        <Input
                          value={author.orcid}
                          onChange={(e) => updateAuthor(index, "orcid", e.target.value)}
                          placeholder="0000-0001-2345-6789"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`corresponding-${index}`}
                        checked={author.isCorresponding}
                        onCheckedChange={(checked) =>
                          updateAuthor(index, "isCorresponding", checked)
                        }
                      />
                      <Label htmlFor={`corresponding-${index}`}>
                        Corresponding Author
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Step 4: Research Direction */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="abstract">Brief Abstract or Research Summary</Label>
                <Textarea
                  id="abstract"
                  value={formData.abstractProvided}
                  onChange={(e) => updateField("abstractProvided", e.target.value)}
                  placeholder="Provide a brief summary of your research direction..."
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label>Key Hypotheses (Optional)</Label>
                <Textarea
                  placeholder="Enter key hypotheses, one per line..."
                  rows={3}
                  onChange={(e) => {
                    const hypotheses = e.target.value.split("\n").filter(h => h.trim());
                    updateField("keyHypotheses", hypotheses);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Methodology Preferences (Optional)</Label>
                <Textarea
                  placeholder="Enter methodology constraints, one per line..."
                  rows={3}
                  onChange={(e) => {
                    const constraints = e.target.value.split("\n").filter(c => c.trim());
                    updateField("methodologyConstraints", constraints);
                  }}
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {step < 4 ? (
              <Button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed() || createJobMutation.isPending}
              >
                {createJobMutation.isPending ? "Creating..." : "Generate Document"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
