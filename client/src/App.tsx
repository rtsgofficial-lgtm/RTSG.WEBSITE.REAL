import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { trpc } from "./lib/trpc";
import { lazy, Suspense, useState } from "react";
import { X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Home from "./pages/Home";
import Articles from "./pages/Articles";
import ArticleNew from "./pages/ArticleNew";
import ArticleDetail from "./pages/ArticleDetail";
import ArticleEdit from "./pages/ArticleEdit";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Resources from "./pages/Resources";
import PdfReader from "./pages/PdfReader";
import Shop from "./pages/Shop";
import ShopProduct from "./pages/ShopProduct";
import Donate from "./pages/Donate";
import DonateStatus from "./pages/DonateStatus";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Layout from "./components/Layout";
import UnderConstruction from "./pages/UnderConstruction";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

const Globe = lazy(() => import("./pages/Globe"));

function RouteFallback() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/articles" component={Articles} />
      <Route path="/articles/new" component={ArticleNew} />
      <Route path="/articles/:id/edit" component={ArticleEdit} />
      <Route path="/articles/:id" component={ArticleDetail} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/resources/pdf" component={PdfReader} />
      <Route path="/resources" component={Resources} />
      <Route path="/shop/:productId" component={ShopProduct} />
      <Route path="/shop" component={Shop} />
      <Route path="/donate/success" component={DonateStatus} />
      <Route path="/donate/cancel" component={DonateStatus} />
      <Route path="/donate" component={Donate} />
      <Route path="/globe" component={Globe} />
      <Route path="/users/:id" component={UserProfile} />
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
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/articles" component={Articles} />
      <Route path="/articles/new" component={ArticleNew} />
      <Route path="/articles/:id/edit" component={ArticleEdit} />
      <Route path="/articles/:id" component={ArticleDetail} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/resources/pdf" component={PdfReader} />
      <Route path="/resources" component={Resources} />
      <Route path="/shop/:productId" component={ShopProduct} />
      <Route path="/shop" component={Shop} />
      <Route path="/donate/success" component={DonateStatus} />
      <Route path="/donate/cancel" component={DonateStatus} />
      <Route path="/donate" component={Donate} />
      <Route path="/globe" component={Globe} />
      <Route path="/users/:id" component={UserProfile} />
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
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/shop/:productId" component={ShopProduct} />
      <Route path="/shop" component={Shop} />
      <Route path="/donate/success" component={DonateStatus} />
      <Route path="/donate/cancel" component={DonateStatus} />
      <Route path="/donate" component={Donate} />
      <Route path="/globe" component={Globe} />
      <Route path="/users/:id" component={UserProfile} />
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

function SiteWidePopup() {
  const { data: popup } = trpc.settings.getHomepagePopup.useQuery(undefined, {
    staleTime: 60 * 1000,
  });

  const [dismissed, setDismissed] = useState(false);

  const message = popup?.message?.trim() || "";

  const shouldShowPopup =
    Boolean(popup?.enabled && message) && !dismissed;

  if (!shouldShowPopup) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
      <div className="glass relative w-full max-w-xl rounded-3xl border border-white/10 p-7 text-center shadow-2xl animate-fade-in">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
          aria-label="Close site message"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-red text-xs font-medium text-primary mb-5">
          <Zap className="w-3 h-3" />
          RTSG Notice
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-4">
          Message from RTSG
        </h2>

        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap mb-6">
          {message}
        </p>

        <Button
          onClick={() => setDismissed(true)}
          className="rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <SiteWidePopup />
          <Layout>
            <Suspense fallback={<RouteFallback />}>
              <AppRouter />
            </Suspense>
          </Layout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
