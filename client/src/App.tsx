import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import AppAuth from "@/pages/AppAuth";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Settings from "./pages/Settings";
import Team from "./pages/Team";
import GenerationForm from "./components/GenerationForm";
import GenerationProgress from "./components/GenerationProgress";
import DocumentPreview from "./components/DocumentPreview";

function NewDocumentPage() {
  return <GenerationForm />;
}

function GenerationProgressPage({ params }: { params: { jobId: string } }) {
  return <GenerationProgress jobId={parseInt(params.jobId)} />;
}

function DocumentPreviewPage({ params }: { params: { jobId: string } }) {
  return <DocumentPreview jobId={parseInt(params.jobId)} />;
}

function DocumentPreviewByIdPage({ params }: { params: { documentId: string } }) {
  return <DocumentPreview documentId={parseInt(params.documentId)} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/app-auth" component={AppAuth} />
      <Route path="/auth/login" component={Login} />
      <Route path="/auth/signup" component={Signup} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/new" component={NewDocumentPage} />
      <Route path="/settings" component={Settings} />
      <Route path="/team" component={Team} />
      <Route path="/generation/:jobId" component={GenerationProgressPage} />
      <Route path="/doc/:documentId" component={DocumentPreviewByIdPage} />
      <Route path="/document/:jobId" component={DocumentPreviewPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
