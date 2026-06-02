import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import {
  FileText,
  Home,
  LogIn,
  LogOut,
  Menu,
  PenLine,
  Shield,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { label: "Articles", href: "/articles" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Resources", href: "/resources" },
];

const mobileNavItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Articles", href: "/articles", icon: FileText },
  { label: "Write Article", href: "/articles/new", icon: PenLine },
  { label: "Resources", href: "/resources", icon: FileText },
  { label: "About", href: "/about", icon: Shield },
  { label: "Contact", href: "/contact", icon: User },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location, navigate] = useLocation();

  // Hide nav only on admin pages
  const isAdminPage = location.startsWith("/admin");
  const showNav = !isAdminPage;

  const isActive = (href: string) =>
    location === href ||
    (href === "/articles" && location.startsWith("/articles"));

  return (
    <div className="min-h-screen flex flex-col">
      {showNav && (
        <header className="fixed top-0 left-0 right-0 z-50">
          <nav className="glass mx-3 mt-3 rounded-2xl px-4 py-3 flex items-center justify-between sm:mx-4 sm:mt-4 sm:px-6">
            {/* Logo */}
            <Link href="/" className="flex min-w-0 items-center gap-2 group">
              <img
                src="https://rs.rtsg.org/whiteandredrtsg_c075c4b3.png"
                alt="RTSG"
                className="w-8 h-8 rounded-lg shrink-0"
              />
              <span className="font-semibold text-foreground tracking-tight hidden sm:block">
                RTSG
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <Link key={item.href} href={item.href}>
                  <span
                    className={`glitch-hover px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive(item.href)
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>

            {/* Desktop Auth Section */}
            <div className="hidden md:flex items-center gap-2">
              {isAuthenticated && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 rounded-xl hover:bg-white/5 px-3"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground hidden sm:block">
                        {user.name || "User"}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="glass border-white/10 bg-black/90 backdrop-blur-xl w-48"
                  >
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-foreground">
                        {user.name}
                      </p>
                      <p className="text-xs text-muted-foreground break-all">
                        {user.email}
                      </p>
                      {user.role !== "user" && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                          <Shield className="w-2.5 h-2.5" />
                          {user.role}
                        </span>
                      )}
                    </div>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={() => navigate("/profile")}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={logout}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <a href={getLoginUrl()}>
                  <Button
                    variant="ghost"
                    className="rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="text-sm">Sign In</span>
                  </Button>
                </a>
              )}
            </div>

            {/* Mobile Sidebar Trigger */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="glass w-[86vw] max-w-[360px] border-white/10 bg-black/90 px-0 py-0 backdrop-blur-2xl"
                >
                  <SheetHeader className="border-b border-white/10 px-5 py-5 text-left">
                    <div className="flex items-center gap-3 pr-10">
                      <img
                        src="https://rs.rtsg.org/whiteandredrtsg_c075c4b3.png"
                        alt="RTSG"
                        className="w-9 h-9 rounded-lg"
                      />
                      <div>
                        <SheetTitle>RTSG</SheetTitle>
                        <SheetDescription>Navigation</SheetDescription>
                      </div>
                    </div>
                  </SheetHeader>

                  <div className="flex-1 overflow-y-auto px-3 py-4">
                    <div className="space-y-1">
                      {mobileNavItems.map(item => {
                        const Icon = item.icon;
                        return (
                          <SheetClose key={item.href} asChild>
                            <Link href={item.href}>
                              <span
                                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                                  isActive(item.href)
                                    ? "bg-primary/15 text-primary"
                                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                }`}
                              >
                                <Icon className="w-4 h-4 shrink-0" />
                                {item.label}
                              </span>
                            </Link>
                          </SheetClose>
                        );
                      })}
                    </div>

                    <div className="my-4 h-px bg-white/10" />

                    {isAuthenticated && user ? (
                      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {user.name || "User"}
                            </p>
                            <p className="text-xs text-muted-foreground break-all">
                              {user.email}
                            </p>
                            {user.role !== "user" && (
                              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                                <Shield className="w-2.5 h-2.5" />
                                {user.role}
                              </span>
                            )}
                          </div>
                        </div>

                        <SheetClose asChild>
                          <Button
                            variant="ghost"
                            onClick={() => navigate("/profile")}
                            className="w-full justify-start rounded-xl text-muted-foreground hover:bg-white/5 hover:text-foreground"
                          >
                            <User className="w-4 h-4 mr-2" />
                            Profile
                          </Button>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button
                            variant="ghost"
                            onClick={logout}
                            className="w-full justify-start rounded-xl text-muted-foreground hover:bg-white/5 hover:text-foreground"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                          </Button>
                        </SheetClose>
                      </div>
                    ) : (
                      <a href={getLoginUrl()}>
                        <Button className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground">
                          <LogIn className="w-4 h-4 mr-2" />
                          Sign In
                        </Button>
                      </a>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </nav>
        </header>
      )}

      <main className={`flex-1 ${showNav ? "pt-24 sm:pt-28" : ""}`}>
        {children}
      </main>

      {showNav && (
        <footer className="border-t border-white/5 py-8 mt-16">
          <div className="container text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} RTSG. All rights reserved.</p>
          </div>
        </footer>
      )}
    </div>
  );
}
