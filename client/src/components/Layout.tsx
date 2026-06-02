import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { LogIn, LogOut, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location, navigate] = useLocation();


  // Hide nav only on admin pages
  const isAdminPage = location.startsWith("/admin");
  const showNav = !isAdminPage;

  return (
    <div className="min-h-screen flex flex-col">
      {showNav && (
        <header className="fixed top-0 left-0 right-0 z-50">
          <nav className="glass mx-4 mt-4 rounded-2xl px-6 py-3 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <img
                src="https://rs.rtsg.org/whiteandredrtsg_c075c4b3.png"
                alt="RTSG"
                className="w-8 h-8 rounded-lg"
              />
              <span className="font-semibold text-foreground tracking-tight hidden sm:block">
                RTSG
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <span
                    className={`glitch-hover px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      location === item.href || (item.href === "/articles" && location.startsWith("/articles"))
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>

            {/* Auth Section */}
            <div className="flex items-center gap-2">
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
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
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
                    <span className="hidden sm:block text-sm">Sign In</span>
                  </Button>
                </a>
              )}
            </div>
          </nav>
        </header>
      )}

      <main className={`flex-1 ${showNav ? "pt-24" : ""}`}>{children}</main>

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
