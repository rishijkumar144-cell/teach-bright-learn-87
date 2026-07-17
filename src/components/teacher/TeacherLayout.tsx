import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Users,
  Globe,
  Settings,
  Plus,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/lessons", label: "Lessons", icon: BookOpen },
  { to: "/students", label: "Students", icon: Users },
  { to: "/published", label: "Published", icon: Globe },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function TeacherLayout({
  children,
  showCreate = true,
}: {
  children: ReactNode;
  showCreate?: boolean;
}) {
  const { teacher, hydrated, logout, createLesson } = useStore();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  if (hydrated && !teacher) {
    // Redirect handled via effect for auth pages; keep simple client-side.
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }

  const initials = (teacher?.displayName || "T")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const onCreate = () => {
    const l = createLesson();
    navigate({ to: "/lessons/$id", params: { id: l.id } });
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md focus-hide">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
            <span className="text-lg font-bold tracking-tight">Mathly</span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 -z-10 rounded-lg bg-accent"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {showCreate && (
              <Button onClick={onCreate} className="hidden sm:inline-flex">
                <Plus className="h-4 w-4" />
                New Lesson
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu" className="rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-semibold">{teacher?.displayName}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {teacher?.email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                  <Settings className="h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    navigate({ to: "/login" });
                  }}
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        {mobileOpen && (
          <div className="border-t border-border md:hidden">
            <nav className="mx-auto grid max-w-7xl gap-1 p-3">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                    pathname === item.to
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/50",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>

      {showCreate && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCreate}
          className="focus-hide fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground shadow-lift sm:hidden"
          aria-label="Create new lesson"
        >
          <Plus className="h-5 w-5" />
          Create
        </motion.button>
      )}
    </div>
  );
}
