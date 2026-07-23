import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { GraduationCap, Mail, Lock, Sparkles, User as UserIcon, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import questlyAd from "@/assets/questly-ad.mp4.asset.json";
import { Volume2, VolumeX } from "lucide-react";
import { useRef } from "react";


export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signUp } = useStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);


  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "forgot") {
      if (!email) {
        toast.error("Please enter your email");
        return;
      }
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password reset email sent. Check your inbox.");
      setMode("signin");
      return;
    }
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (mode === "signup" && !displayName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setLoading(true);
    const res =
      mode === "signin"
        ? await signIn(email, password)
        : await signUp(email, password, displayName.trim(), role);
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (mode === "signup") {
      toast.success("Account created — check your email to confirm.");
      navigate({ to: role === "student" ? "/student" : "/dashboard" });
    } else {
      toast.success("Welcome back!");
      navigate({ to: "/" });
    }
  };


  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-black lg:block">
        <video
          ref={videoRef}
          src={questlyAd.url}
          autoPlay
          loop
          muted={muted}
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        <div className="relative flex h-full flex-col justify-between p-8 text-white">
          <div className="flex items-center gap-2 text-lg font-bold">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <GraduationCap className="h-5 w-5" />
            </div>
            Questly
          </div>
          <div className="flex items-end justify-between">
            <div className="text-xs text-white/70">
              © {new Date().getFullYear()} Questly. Made for teachers.
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !muted;
                setMuted(next);
                if (videoRef.current) videoRef.current.muted = next;
              }}
              aria-label={muted ? "Unmute ad" : "Mute ad"}
              className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>


      <div className="flex items-center justify-center px-6 py-12 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold">Questly</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">
            {mode === "signin"
              ? "Sign in to Questly"
              : mode === "signup"
                ? role === "student"
                  ? "Create your student account"
                  : "Create your teacher account"
                : "Reset your password"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {mode === "signin"
              ? "Teachers and students both sign in here."
              : mode === "signup"
                ? role === "student"
                  ? "Track your completed lessons and study smarter."
                  : "Set up your workspace in seconds."
                : "Enter your email and we'll send you a link to reset your password."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            {mode === "signup" && (
              <>
                <div className="space-y-2">
                  <Label>I am a…</Label>
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/40 p-1">
                    <button
                      type="button"
                      onClick={() => setRole("teacher")}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${role === "teacher" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Teacher
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("student")}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${role === "student" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Student
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Your name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      className="h-12 pl-10"
                      placeholder={role === "student" ? "Alex Chen" : "Ms. Rivera"}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="teacher@school.edu"
                  className="h-12 pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="h-12 pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  />
                </div>
              </div>
            )}

            <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={loading}>
              {loading
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : "Send reset link"}
            </Button>

            {mode === "forgot" ? (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="mx-auto flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
              </button>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                {mode === "signin" ? "New to Questly? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="font-semibold text-primary hover:underline"
                >
                  {mode === "signin" ? "Create account" : "Sign in"}
                </button>
              </p>
            )}
          </form>

        </motion.div>
      </div>
    </div>
  );
}
