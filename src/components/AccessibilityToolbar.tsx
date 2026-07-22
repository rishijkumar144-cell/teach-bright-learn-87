import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Accessibility,
  Moon,
  Sun,
  Sparkles,
  Type,
  ALargeSmall,
  Baseline,
  RotateCcw,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { isMuted, setMuted, sfx } from "@/lib/sfx";

const KEY = "questly.a11y.v1";

interface A11yPrefs {
  theme: "light" | "dark";
  mode: "classic" | "space";
  dyslexiaFont: boolean;
  textScale: number; // 90 - 150
  lineSpacing: number; // 1.4 - 2.2
  highContrast: boolean;
}

const DEFAULTS: A11yPrefs = {
  theme: "light",
  mode: "classic",
  dyslexiaFont: false,
  textScale: 100,
  lineSpacing: 1.6,
  highContrast: false,
};

function apply(prefs: A11yPrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const body = document.body;
  root.classList.toggle("dark", prefs.theme === "dark");
  body?.classList.toggle("dyslexia-font", prefs.dyslexiaFont);
  body?.classList.remove("focus-mode");
  body?.classList.toggle("high-contrast", prefs.highContrast);
  body?.classList.toggle("space", prefs.mode === "space");
  root.style.setProperty("--reader-scale", `${prefs.textScale / 100}`);
  root.style.setProperty("--reader-line", `${prefs.lineSpacing}`);
}

function loadPrefs(): A11yPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULTS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loaded = loadPrefs();
    setPrefs(loaded);
    apply(loaded);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    apply(prefs);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs, mounted]);

  return (
    <A11yContext.Provider value={{ prefs, setPrefs }}>
      {children}
    </A11yContext.Provider>
  );
}

import { createContext, useContext } from "react";
const A11yContext = createContext<{
  prefs: A11yPrefs;
  setPrefs: React.Dispatch<React.SetStateAction<A11yPrefs>>;
} | null>(null);

function usePrefs() {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error("AccessibilityProvider missing");
  return ctx;
}

export function AccessibilityToolbar() {
  const { prefs, setPrefs } = usePrefs();
  const [open, setOpen] = useState(false);

  const patch = (p: Partial<A11yPrefs>) => setPrefs((cur) => ({ ...cur, ...p }));

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <div className="flex items-center gap-1 rounded-full border border-border bg-background/90 p-1 shadow-lift backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          data-sfx="off"
          onClick={() => {
            sfx.toggle();
            patch({ theme: prefs.theme === "dark" ? "light" : "dark" });
          }}
          className="h-9 w-9 rounded-full"
        >
          <AnimatePresence mode="wait" initial={false}>
            {prefs.theme === "dark" ? (
              <motion.span key="s" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <Sun className="h-4 w-4" />
              </motion.span>
            ) : (
              <motion.span key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                <Moon className="h-4 w-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
        <div className="h-5 w-px bg-border" />
        <SoundToggleButton />
        <div className="h-5 w-px bg-border" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const next = !open;
            if (next) sfx.open(); else sfx.close();
            setOpen(next);
          }}
          aria-label="Accessibility options"
          aria-expanded={open}
          data-sfx="off"
          className="h-9 w-9 rounded-full"
        >
          <Accessibility className="h-4 w-4" />
        </Button>
      </div>


      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="w-80 rounded-2xl border border-border bg-card p-4 shadow-lift"
          >

            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Reading tools</div>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-accent"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Adjust text to feel calmer for ADHD, dyslexia, or low vision.
            </p>

            <div className="mt-4 space-y-4">
              <Row
                icon={Type}
                label="Dyslexia-friendly font"
                description="Rounded letterforms with more space."
              >
                <Switch
                  checked={prefs.dyslexiaFont}
                  onCheckedChange={(v) => patch({ dyslexiaFont: v })}
                />
              </Row>
              <Row
                icon={ALargeSmall}
                label="High contrast"
                description="Stronger colors for better readability."
              >
                <Switch
                  checked={prefs.highContrast}
                  onCheckedChange={(v) => patch({ highContrast: v })}
                />
              </Row>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <ALargeSmall className="h-4 w-4" /> Text size
                  </span>
                  <span className="text-xs text-muted-foreground">{prefs.textScale}%</span>
                </div>
                <Slider
                  value={[prefs.textScale]}
                  min={90}
                  max={150}
                  step={5}
                  onValueChange={(v) => patch({ textScale: v[0] })}
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <Baseline className="h-4 w-4" /> Line spacing
                  </span>
                  <span className="text-xs text-muted-foreground">{prefs.lineSpacing.toFixed(1)}</span>
                </div>
                <Slider
                  value={[prefs.lineSpacing * 10]}
                  min={14}
                  max={22}
                  step={1}
                  onValueChange={(v) => patch({ lineSpacing: v[0] / 10 })}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPrefs(DEFAULTS)}
                className="text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: typeof Accessibility;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4" />
          {label}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function SoundToggleButton() {
  const [muted, setMutedState] = useState<boolean>(() => isMuted());
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={muted ? "Unmute sounds" : "Mute sounds"}
      data-sfx="off"
      onClick={() => {
        const next = !muted;
        setMuted(next);
        setMutedState(next);
        if (!next) sfx.toggle();
      }}
      className="h-9 w-9 rounded-full"
    >
      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </Button>
  );
}
