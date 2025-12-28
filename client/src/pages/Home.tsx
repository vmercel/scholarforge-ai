import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Sparkles, Award, BarChart3, Zap, Shield, ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container py-20">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-2 glass-card text-sm font-semibold text-primary mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-Powered Scholarly Writing
            </div>

            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div>
                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
                  Generate Publication-Ready
                  <br />
                  <span className="text-primary">Academic Documents</span>
                </h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
                  ScholarForge AI composes rigorous, novel scholarly works using collaborative multi-agent pipelines, automated QA, and export-ready formatting.
                </p>

                <div className="flex items-center gap-4 mt-6">
                  <Button size="lg" className="btn-cta" asChild>
                    <a href={getLoginUrl()} aria-label="Get started">
                      Get Started
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </a>
                  </Button>

                  <Button size="lg" variant="outline" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                    Learn More
                  </Button>
                </div>
              </div>

              <div className="hidden md:flex justify-center">
                <div className="relative w-80 h-56 hero-accent">
                  <div className="absolute inset-0 rounded-2xl glass-card p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="text-sm text-muted-foreground">Draft 1 • Auto-Reviewed</div>
                    </div>
                    <div className="mt-3 text-sm">
                      <div className="h-3 bg-primary/20 rounded w-3/4 mb-2"></div>
                      <div className="h-2 bg-muted/40 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="container py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to create high-quality academic documents with confidence
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <Sparkles className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Multi-Agent Generation</CardTitle>
              <CardDescription>
                Specialized AI agents work together to research, write, and review your document from multiple perspectives
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Award className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Novelty Verification</CardTitle>
              <CardDescription>
                Automatic novelty assessment ensures your work makes genuine contributions to your field
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Quality Metrics</CardTitle>
              <CardDescription>
                Comprehensive quality scoring and detailed feedback help you understand your document's strengths
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Multiple Formats</CardTitle>
              <CardDescription>
                Export your document in DOCX, PDF, Markdown, or LaTeX format for any submission requirement
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Real-Time Progress</CardTitle>
              <CardDescription>
                Track generation progress through each phase with detailed status updates and time estimates
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Citation Management</CardTitle>
              <CardDescription>
                Automatic citation verification and formatting in multiple academic styles (APA, MLA, IEEE, etc.)
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Document Types Section */}
      <div className="bg-muted/50 py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Supported Document Types</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Generate any type of academic document with specialized templates and formatting
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {[
              "Journal Articles",
              "Conference Papers",
              "Thesis & Dissertations",
              "Research Proposals",
              "Grant Proposals",
              "Technical Reports",
              "Book Chapters",
              "Literature Reviews",
            ].map((type) => (
              <Card key={type}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <p className="font-medium">{type}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="container py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Four simple steps to generate your scholarly document
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-4 max-w-5xl mx-auto">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
              1
            </div>
            <h3 className="font-semibold">Configure</h3>
            <p className="text-sm text-muted-foreground">
              Set document type, research domain, and parameters
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
              2
            </div>
            <h3 className="font-semibold">Generate</h3>
            <p className="text-sm text-muted-foreground">
              AI agents research, write, and review your document
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
              3
            </div>
            <h3 className="font-semibold">Review</h3>
            <p className="text-sm text-muted-foreground">
              Preview with quality metrics and novelty scores
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
              4
            </div>
            <h3 className="font-semibold">Export</h3>
            <p className="text-sm text-muted-foreground">
              Download in your preferred format and submit
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-primary-foreground py-20">
        <div className="container text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Join researchers worldwide using ScholarForge AI to accelerate their academic writing
          </p>
          <Button size="lg" variant="secondary" asChild>
            <a href={getLoginUrl()}>
              Create Your First Document
              <ArrowRight className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-muted/30">
        <div className="container py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 ScholarForge AI. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
