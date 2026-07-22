import { useRef, useState } from "react";
import { Volume2, Square, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { speakText } from "@/lib/tts.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Simple cache so the same paragraph doesn't re-hit the gateway if replayed.
const cache = new Map<string, string>(); // text -> object URL

function stripForSpeech(text: string): string {
  return text
    // strip $$ display math and $inline math$ — the raw LaTeX is unreadable aloud
    .replace(/\$\$([\s\S]*?)\$\$/g, " (equation) ")
    .replace(/\$([^$\n]+)\$/g, " (equation) ")
    // strip markdown emphasis / headers / list markers
    .replace(/[*_`#>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function SpeakButton({
  text,
  label = "Read aloud",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const call = useServerFn(speakText);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const clean = stripForSpeech(text || "");

  const stop = () => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setPlaying(false);
  };

  const play = async () => {
    if (playing) {
      stop();
      return;
    }
    if (!clean) return;
    try {
      let url = cache.get(clean);
      if (!url) {
        setLoading(true);
        const res = await call({ data: { text: clean.slice(0, 4000) } });
        const bin = atob(res.audio);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: res.mime });
        url = URL.createObjectURL(blob);
        cache.set(clean, url);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.onerror = () => setPlaying(false);
      setPlaying(true);
      await audio.play();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read aloud");
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={play}
      aria-label={playing ? "Stop reading" : label}
      title={playing ? "Stop reading" : label}
      className={`h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground ${className}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : playing ? (
        <Square className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </Button>
  );
}
