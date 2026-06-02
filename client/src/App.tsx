import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { trpc } from "./lib/trpc";
import Home from "./pages/Home";
import Articles from "./pages/Articles";
import ArticleNew from "./pages/ArticleNew";
import ArticleDetail from "./pages/ArticleDetail";
import ArticleEdit from "./pages/ArticleEdit";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Resources from "./pages/Resources";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import Layout from "./components/Layout";
import UnderConstruction from "./pages/UnderConstruction";
import Login from "./pages/Login";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/articles" component={Articles} />
      <Route path="/articles/new" component={ArticleNew} />
      <Route path="/articles/:id/edit" component={ArticleEdit} />
      <Route path="/articles/:id" component={ArticleDetail} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/resources" component={Resources} />
      <Route path="/profile" component={Profile} />
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PublicRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/articles" component={Articles} />
      <Route path="/articles/new" component={ArticleNew} />
      <Route path="/articles/:id/edit" component={ArticleEdit} />
      <Route path="/articles/:id" component={ArticleDetail} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/resources" component={Resources} />
      <Route path="/profile" component={Profile} />
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ConstructionRouter() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route component={UnderConstruction} />
    </Switch>
  );
}

function AppRouter() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  
  // Check construction mode from database
  const { data: settingsData, isLoading: settingsLoading } = trpc.settings.getConstructionMode.useQuery();
  const isUnderConstruction = settingsData?.isUnderConstruction ?? true;

  const loading = authLoading || settingsLoading;

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // If under construction and not admin, show construction page
  if (isUnderConstruction && !isAdmin) {
    return <ConstructionRouter />;
  }

  // If admin, show full site
  if (isAdmin) {
    return <AdminRouter />;
  }

  // If not under construction and not admin, show full site
  return <PublicRouter />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Layout>
            <AppRouter />
          </Layout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
