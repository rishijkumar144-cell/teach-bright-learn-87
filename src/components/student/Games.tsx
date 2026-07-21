import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Bomb, Sparkles, RotateCcw, ChevronLeft, ChevronRight, Trophy, Loader2, Rabbit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { generateGameQuestions } from "@/lib/ai.functions";
import { ParagraphWithMath } from "@/components/teacher/BlockEditor";
import { sfx } from "@/lib/sfx";

export interface StudyQA {
  q: string;
  a: string;
  answers?: string[];
}

interface GamePickerProps {
  seedQuestions?: StudyQA[];
}

type GameKind = "flashcards" | "memory" | "bomb";

export function GamesHub({ seedQuestions }: GamePickerProps) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(25);
  const [questions, setQuestions] = useState<StudyQA[]>(seedQuestions ?? []);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<GameKind | null>(null);

  const loadQuestions = async () => {
    if (!topic.trim()) {
      toast.error("Enter a topic first.");
      return;
    }
    const safeCount = Math.max(5, Math.min(75, Math.round(count) || 25));
    setLoading(true);
    try {
      const res = await generateGameQuestions({ data: { topic: topic.trim(), count: safeCount } });
      if (!res.questions.length) throw new Error("No questions generated");
      setQuestions(res.questions);
      toast.success(`Loaded ${res.questions.length} questions on "${topic}"`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate questions");
    } finally {
      setLoading(false);
    }
  };

  const games: { kind: GameKind; title: string; desc: string; icon: React.ReactNode; tone: string }[] = [
    { kind: "flashcards", title: "Flashcard Flip", desc: "Classic flip-through study cards.", icon: <Sparkles className="h-5 w-5" />, tone: "from-blue-500/20 to-cyan-500/20" },
    { kind: "memory", title: "Memory Match", desc: "Match questions to their answers.", icon: <Trophy className="h-5 w-5" />, tone: "from-emerald-500/20 to-teal-500/20" },
    { kind: "bomb", title: "Bomb Blast", desc: "Bank bombs on streaks, then demolish the wall.", icon: <Bomb className="h-5 w-5" />, tone: "from-orange-500/20 to-red-500/20" },
  ];

  if (active === "flashcards") return <FlashcardGame questions={questions} onExit={() => setActive(null)} />;
  if (active === "memory") return <MemoryMatchGame questions={questions} onExit={() => setActive(null)} />;
  if (active === "bomb") return <BombBlastGame questions={questions} onExit={() => setActive(null)} />;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="game-topic">Study topic</Label>
            <Input
              id="game-topic"
              placeholder="e.g. Quadratic equations, Multiplying fractions, Cell biology"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadQuestions();
              }}
            />
          </div>
          <div className="space-y-1.5 sm:w-32">
            <Label htmlFor="game-count"># Questions</Label>
            <Input
              id="game-count"
              type="number"
              min={5}
              max={75}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
          <Button onClick={loadQuestions} disabled={loading} className="sm:w-auto">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate questions
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Choose between 5 and 75 questions. {questions.length > 0 && `${questions.length} ready — pick a game!`}
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((g) => (
          <motion.button
            key={g.kind}
            whileHover={{ y: -4 }}
            onClick={() => {
              if (questions.length < 4) {
                toast.error("Generate at least 4 questions first.");
                return;
              }
              setActive(g.kind);
            }}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br p-6 text-left transition",
              g.tone,
              "hover:border-primary/50",
            )}
          >
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-background text-primary shadow-sm">
                {g.icon}
              </div>
              <h3 className="text-lg font-bold">{g.title}</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{g.desc}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Flashcard Flip
// ============================================================
function FlashcardGame({ questions, onExit }: { questions: StudyQA[]; onExit: () => void }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const q = questions[idx];

  const next = () => {
    setFlipped(false);
    setIdx((i) => (i + 1) % questions.length);
  };
  const prev = () => {
    setFlipped(false);
    setIdx((i) => (i - 1 + questions.length) % questions.length);
  };

  return (
    <GameShell title="Flashcard Flip" onExit={onExit} counter={`${idx + 1} / ${questions.length}`}>
      <div className="mx-auto max-w-2xl">
        <div className="perspective-[1200px]" onClick={() => setFlipped((f) => !f)}>
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.5 }}
            className="relative h-72 w-full cursor-pointer [transform-style:preserve-3d]"
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-8 text-center [backface-visibility:hidden]">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Question</span>
              <div className="text-2xl font-bold leading-tight text-foreground">
                <ParagraphWithMath text={q.q} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Tap card to reveal answer</p>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                {(q.answers?.length ?? 0) > 1 ? "Accepted answers" : "Answer"}
              </span>
              <div className="text-2xl font-bold leading-tight text-foreground space-y-1">
                {(q.answers && q.answers.length > 1 ? q.answers : [q.a]).map((ans, i) => (
                  <div key={i}><ParagraphWithMath text={ans} /></div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={prev}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Prev
          </Button>
          <Button variant="outline" onClick={() => setFlipped((f) => !f)}>
            {flipped ? "Show question" : "Show answer"}
          </Button>
          <Button onClick={next}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </GameShell>
  );
}

// ============================================================
// Memory Match
// ============================================================
interface MemoryCard {
  id: string;
  pairId: number;
  kind: "q" | "a";
  text: string;
}

function MemoryMatchGame({ questions, onExit }: { questions: StudyQA[]; onExit: () => void }) {
  const initial = useMemo(() => {
    const pairs = questions.slice(0, 6);
    const cards: MemoryCard[] = [];
    pairs.forEach((p, i) => {
      cards.push({ id: `q-${i}`, pairId: i, kind: "q", text: p.q });
      cards.push({ id: `a-${i}`, pairId: i, kind: "a", text: p.a });
    });
    return shuffle(cards);
  }, [questions]);

  const [cards, setCards] = useState(initial);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [startAt, setStartAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const lockRef = useRef(false);
  const done = matched.size === Math.min(6, questions.length);

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [done]);

  const reset = () => {
    setCards(shuffle(initial));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setStartAt(Date.now());
    setNow(Date.now());
  };

  const onFlip = (card: MemoryCard) => {
    if (lockRef.current) return;
    if (matched.has(card.pairId)) return;
    if (flipped.includes(card.id)) return;
    if (flipped.length === 2) return;

    const nextFlipped = [...flipped, card.id];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [aId, bId] = nextFlipped;
      const a = cards.find((c) => c.id === aId)!;
      const b = cards.find((c) => c.id === bId)!;
      if (a.pairId === b.pairId && a.kind !== b.kind) {
        setTimeout(() => {
          setMatched((prev) => new Set(prev).add(a.pairId));
          setFlipped([]);
        }, 500);
      } else {
        lockRef.current = true;
        setTimeout(() => {
          setFlipped([]);
          lockRef.current = false;
        }, 900);
      }
    }
  };

  const elapsed = Math.floor((now - startAt) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const total = Math.min(6, questions.length);

  return (
    <GameShell title="Memory Match" onExit={onExit} counter={`⏱ ${mm}:${ss}  ·  Moves: ${moves}  ·  Matched ${matched.size}/${total}`}>
      {done ? (
        <div className="mx-auto max-w-md rounded-3xl border-2 border-emerald-500/40 bg-emerald-500/10 p-8 text-center">
          <Trophy className="mx-auto h-12 w-12 text-emerald-600 dark:text-emerald-400" />
          <h3 className="mt-3 text-2xl font-bold">All matched!</h3>
          <p className="mt-1 text-sm text-muted-foreground">Cleared in {mm}:{ss} · {moves} moves.</p>
          <Button onClick={reset} className="mt-4">
            <RotateCcw className="mr-2 h-4 w-4" /> Play again
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {cards.map((card) => {
            const isFlipped = flipped.includes(card.id) || matched.has(card.pairId);
            const isMatched = matched.has(card.pairId);
            return (
              <motion.button
                key={card.id}
                onClick={() => onFlip(card)}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "relative aspect-[3/4] rounded-xl border-2 p-2 text-sm font-semibold transition sm:p-3",
                  isFlipped
                    ? isMatched
                      ? "border-emerald-500/60 bg-emerald-500/15 text-foreground"
                      : card.kind === "q"
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-blue-500/50 bg-blue-500/10 text-foreground"
                    : "border-border bg-muted/40 text-transparent hover:border-primary/50",
                )}
              >
                {isFlipped ? (
                  <div className="flex h-full items-center justify-center overflow-hidden text-center text-xs leading-tight sm:text-sm">
                    <ParagraphWithMath text={card.text} />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl">?</div>
                )}
                {isFlipped && (
                  <span className="absolute left-2 top-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {card.kind === "q" ? "Q" : "A"}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </GameShell>
  );
}


// ============================================================
// Bomb Blast
// ============================================================
const LEVEL_SECONDS = 60;
const WRONG_LOCK_MS = 5000;

const LEVELS: { name: string; pattern: string[] }[] = [
  { name: "Block", pattern: [
    "########",
    "########",
    "########",
    "########",
    "########",
  ]},
  { name: "Pyramid", pattern: [
    "....#....",
    "...###...",
    "..#####..",
    ".#######.",
    "#########",
    "#########",
  ]},
  { name: "Diamond", pattern: [
    "....#....",
    "...###...",
    "..#####..",
    ".#######.",
    "#########",
    ".#######.",
    "..#####..",
    "...###...",
    "....#....",
  ]},
  { name: "Cross", pattern: [
    "...####...",
    "...####...",
    "...####...",
    "##########",
    "##########",
    "##########",
    "...####...",
    "...####...",
    "...####...",
  ]},
  { name: "Heart", pattern: [
    ".##...##.",
    "####.####",
    "#########",
    "#########",
    ".#######.",
    "..#####..",
    "...###...",
    "....#....",
  ]},
  { name: "Arrow", pattern: [
    "....#....",
    "...###...",
    "..#####..",
    ".#######.",
    "#########",
    "...###...",
    "...###...",
    "...###...",
    "...###...",
  ]},
  { name: "Hourglass", pattern: [
    "###########",
    ".#########.",
    "..#######..",
    "...#####...",
    "....###....",
    "....###....",
    "...#####...",
    "..#######..",
    ".#########.",
    "###########",
  ]},
  { name: "Star", pattern: [
    ".....#.....",
    ".....#.....",
    "....###....",
    "###########",
    ".#########.",
    "..#######..",
    "...#####...",
    "..##.#.##..",
    ".##...#.##.",
  ]},
  { name: "Skull", pattern: [
    "..#######..",
    ".#########.",
    "###########",
    "##.#####.##",
    "##.#####.##",
    "###########",
    "###.###.###",
    ".#########.",
    "..#.#.#.#..",
    "..#.#.#.#..",
  ]},
  { name: "Castle", pattern: [
    "#.#.#.#.#.#",
    "###########",
    "###########",
    "##.#####.##",
    "##.#####.##",
    "###########",
    "###########",
    "####.#.####",
    "###########",
    "###########",
  ]},
  { name: "Letter A", pattern: [
    "....###....",
    "...#####...",
    "..##...##..",
    ".##.....##.",
    "##.......##",
    "###########",
    "###########",
    "##.......##",
    "##.......##",
    "##.......##",
  ]},
  { name: "Rocket", pattern: [
    "....#....",
    "...###...",
    "..#####..",
    "..#####..",
    "..#####..",
    ".#######.",
    "#########",
    "##.###.##",
    "#.......#",
  ]},
  { name: "Twins", pattern: [
    "..#.....#..",
    ".###...###.",
    "#####.#####",
    ".###...###.",
    "..#.....#..",
    "..#.....#..",
    ".###...###.",
    "#####.#####",
    ".###...###.",
    "..#.....#..",
  ]},
  { name: "Crown", pattern: [
    "#...#...#...#",
    "##.###.###.##",
    "#############",
    "#############",
    "#############",
    "#.##.###.##.#",
    "#############",
  ]},
  { name: "Spiral", pattern: [
    "#############",
    "#############",
    "##.........##",
    "##.#######.##",
    "##.#.....#.##",
    "##.#.###.#.##",
    "##.#.#...#.##",
    "##.#.#####.##",
    "##.#.......##",
    "##.##########",
    "##...........",
    "#############",
  ]},
  { name: "Grand Heart", pattern: [
    ".####...####.",
    "#############",
    "#############",
    "#############",
    "#############",
    ".###########.",
    "..#########..",
    "...#######...",
    "....#####....",
    ".....###.....",
    "......#......",
  ]},
  { name: "Dragon", pattern: [
    "##.........##",
    "###.......###",
    "####.....####",
    "#############",
    "##.#######.##",
    "##.#.###.#.##",
    "##.#######.##",
    "#############",
    "####.....####",
    "###.......###",
    "##.........##",
  ]},
  { name: "Mega Star", pattern: [
    "......#......",
    ".....###.....",
    ".....###.....",
    "#############",
    ".###########.",
    "..#########..",
    "...#######...",
    "..#########..",
    ".##.#####.##.",
    "##...###...##",
    "#.....#.....#",
  ]},
  { name: "Fortress", pattern: [
    "#.#.#.#.#.#.#.#",
    "###############",
    "###############",
    "##.#########.##",
    "##.#.......#.##",
    "##.#.#####.#.##",
    "##.#.#...#.#.##",
    "##.#.#.#.#.#.##",
    "##.#.#####.#.##",
    "##.#.......#.##",
    "##.#########.##",
    "###############",
    "###############",
  ]},
  { name: "Boss", pattern: [
    "###.#.#.#.#.###",
    "###############",
    "###############",
    "##.####.####.##",
    "##.####.####.##",
    "###############",
    "####.#####.####",
    "###############",
    "##.###.#.###.##",
    "##.###.#.###.##",
    "###############",
    "###############",
    "###.#.#.#.#.###",
  ]},
];

const TOTAL_LEVELS = LEVELS.length;

function buildLevel(lvl: number): { wall: boolean[]; cols: number } {
  const spec = LEVELS[Math.min(lvl, LEVELS.length) - 1];
  const cols = spec.pattern[0].length;
  const wall: boolean[] = [];
  for (const row of spec.pattern) {
    for (let x = 0; x < cols; x++) {
      wall.push(row[x] === "#");
    }
  }
  return { wall, cols };
}


function BombBlastGame({ questions, onExit }: { questions: StudyQA[]; onExit: () => void }) {
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<"play" | "levelClear" | "fail" | "won">("play");
  const [idx, setIdx] = useState(0);
  const [bombs, setBombs] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<null | "right" | "wrong">(null);
  const [lockUntil, setLockUntil] = useState(0);
  const [wall, setWall] = useState<boolean[]>(() => buildLevel(1).wall);
  const [cols, setCols] = useState<number>(() => buildLevel(1).cols);
  const [deadline, setDeadline] = useState(() => Date.now() + LEVEL_SECONDS * 1000);
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  const q = questions[idx % Math.max(1, questions.length)];
  const locked = now < lockUntil;
  const secondsLeft = Math.max(0, Math.ceil((deadline - now) / 1000));
  const lockSecondsLeft = Math.max(0, Math.ceil((lockUntil - now) / 1000));

  // Ticker
  useEffect(() => {
    if (phase !== "play") return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [phase]);

  // Timeout → fail level
  useEffect(() => {
    if (phase === "play" && secondsLeft === 0) {
      setPhase("fail");
    }
  }, [phase, secondsLeft]);

  const startLevel = (lvl: number) => {
    const built = buildLevel(lvl);
    setLevel(lvl);
    setWall(built.wall);
    setCols(built.cols);
    setBombs(0);
    setStreak(0);
    setInput("");
    setFeedback(null);
    setLockUntil(0);
    setDeadline(Date.now() + LEVEL_SECONDS * 1000);
    setNow(Date.now());
    setPhase("play");
    setTimeout(() => inputRef.current?.focus(), 50);
  };


  const restartLevel = () => startLevel(level);
  const nextLevel = () => {
    if (level >= TOTAL_LEVELS) setPhase("won");
    else startLevel(level + 1);
  };
  const restartGame = () => {
    setBestStreak(0);
    startLevel(1);
  };

  const check = () => {
    if (!input.trim() || locked || feedback) return;
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,!?;]$/g, "");
    const accepted = (q.answers && q.answers.length ? q.answers : [q.a]).filter(Boolean);
    const inNorm = norm(input);
    const isCorrect = accepted.some((ans) => {
      const a = norm(ans);
      return inNorm === a || (a.includes(inNorm) && inNorm.length >= 3);
    });
    if (isCorrect) {
      sfx.correct();
      setBombs((b) => b + 1);
      setStreak((s) => {
        const ns = s + 1;
        setBestStreak((bs) => Math.max(bs, ns));
        return ns;
      });
      setFeedback("right");
      setTimeout(() => {
        setFeedback(null);
        setInput("");
        setIdx((i) => (i + 1) % questions.length);
        inputRef.current?.focus();
      }, 500);
    } else {
      sfx.wrong();
      setStreak(0);
      setFeedback("wrong");
      setLockUntil(Date.now() + WRONG_LOCK_MS);
      setTimeout(() => {
        setFeedback(null);
        setInput("");
        setIdx((i) => (i + 1) % questions.length);
      }, WRONG_LOCK_MS);
    }
  };

  const skip = () => {
    if (locked || feedback) return;
    setStreak(0);
    setInput("");
    setIdx((i) => (i + 1) % questions.length);
    inputRef.current?.focus();
  };

  const detonateOne = (i: number) => {
    if (phase !== "play") return;
    if (!wall[i] || bombs === 0) return;
    const nextWall = [...wall];
    const rows = Math.ceil(wall.length / cols);
    const r = Math.floor(i / cols);
    const c = i % cols;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        nextWall[nr * cols + nc] = false;
      }
    }
    setWall(nextWall);
    setBombs((b) => b - 1);
    if (nextWall.every((c) => !c)) {
      setTimeout(() => setPhase("levelClear"), 300);
    }
  };


  const bricksLeft = wall.filter(Boolean).length;
  const timerColor = secondsLeft <= 10 ? "text-red-600 dark:text-red-400" : "text-foreground";

  if (phase === "won") {
    return (
      <GameShell title="Bomb Blast" onExit={onExit} counter={`🏆 All ${TOTAL_LEVELS} levels cleared!`}>
        <div className="mx-auto max-w-md rounded-3xl border-2 border-orange-500/40 bg-orange-500/10 p-8 text-center">
          <Trophy className="mx-auto h-12 w-12 text-amber-500" />
          <h3 className="mt-3 text-2xl font-bold">Legend!</h3>
          <p className="mt-1 text-sm text-muted-foreground">You demolished every wall. Best streak: {bestStreak}.</p>
          <Button onClick={restartGame} className="mt-4">
            <RotateCcw className="mr-2 h-4 w-4" /> Play again
          </Button>
        </div>
      </GameShell>
    );
  }

  return (
    <GameShell
      title="Bomb Blast"
      onExit={onExit}
      counter={`Level ${level}/${TOTAL_LEVELS}  ·  💣 ${bombs}  ·  🔥 ${streak}  ·  Best ${bestStreak}`}
    >
      {phase === "levelClear" ? (
        <div className="mx-auto max-w-md rounded-3xl border-2 border-emerald-500/40 bg-emerald-500/10 p-8 text-center">
          <Bomb className="mx-auto h-12 w-12 text-emerald-600 dark:text-emerald-400" />
          <h3 className="mt-3 text-2xl font-bold">Level {level} clear!</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {level >= TOTAL_LEVELS ? "Final wall down!" : `Next up: level ${level + 1} — ${LEVELS[level].name}.`}
          </p>
          <Button onClick={nextLevel} className="mt-4">
            {level >= TOTAL_LEVELS ? "Finish" : "Next level"} <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      ) : phase === "fail" ? (
        <div className="mx-auto max-w-md rounded-3xl border-2 border-red-500/40 bg-red-500/10 p-8 text-center">
          <Bomb className="mx-auto h-12 w-12 text-red-600 dark:text-red-400" />
          <h3 className="mt-3 text-2xl font-bold">Out of time!</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {bricksLeft} brick{bricksLeft === 1 ? "" : "s"} still standing. Restart level {level} and try again.
          </p>
          <Button onClick={restartLevel} className="mt-4">
            <RotateCcw className="mr-2 h-4 w-4" /> Restart level {level}
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          {/* Question card */}
          <div className="space-y-4">
            <div className={cn("flex items-center justify-between rounded-xl border-2 px-4 py-2 text-sm font-bold", secondsLeft <= 10 ? "border-red-500/50 bg-red-500/10" : "border-border bg-muted/40")}>
              <span className="text-muted-foreground">⏱ Time</span>
              <span className={cn("text-lg tabular-nums", timerColor)}>0:{String(secondsLeft).padStart(2, "0")}</span>
            </div>
            <Card className={cn("p-6 transition", feedback === "right" && "border-emerald-500/60 bg-emerald-500/10", feedback === "wrong" && "border-red-500/60 bg-red-500/10")}>
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Question {idx + 1}</div>
              <div className="mt-2 text-xl font-bold leading-snug">
                <ParagraphWithMath text={q.q} />
              </div>
              <div className="mt-4 flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && check()}
                  placeholder={locked ? `Locked · ${lockSecondsLeft}s…` : "Type your answer…"}
                  disabled={feedback !== null || locked}
                />
                <Button onClick={check} disabled={feedback !== null || locked}>
                  Answer
                </Button>
                <Button variant="ghost" onClick={skip} disabled={feedback !== null || locked}>
                  Skip
                </Button>
              </div>
              <AnimatePresence>
                {feedback === "wrong" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 rounded-lg bg-background/60 p-3 text-sm">
                    <span className="font-semibold text-red-600 dark:text-red-400">Not quite — locked {lockSecondsLeft}s.</span>{" "}
                    {(q.answers?.length ?? 0) > 1 ? "Accepted answers" : "Correct answer"}:{" "}
                    <span className="font-semibold">
                      <ParagraphWithMath text={(q.answers && q.answers.length ? q.answers : [q.a]).join(", ")} />
                    </span>
                  </motion.div>
                )}
                {feedback === "right" && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    +1 bomb! 💣
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
            <p className="text-xs text-muted-foreground">
              You have 1 minute per level. Correct answers earn bombs; wrong answers lock the input for 5 seconds. Fail the timer and you restart this level.
            </p>
          </div>

          {/* Wall */}
          <div className="space-y-2">
            <div className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Level {level} · {LEVELS[level - 1].name} · {bricksLeft} bricks
            </div>
            <div
              className="grid gap-[2px] rounded-xl border-2 border-border bg-muted/30 p-2 w-full max-w-[420px] mx-auto"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {wall.map((alive, i) => (
                <motion.button
                  key={i}
                  disabled={!alive || bombs === 0}
                  onClick={() => detonateOne(i)}
                  animate={{ scale: alive ? 1 : 0, opacity: alive ? 1 : 0 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "aspect-square rounded-[2px] transition",
                    alive
                      ? bombs > 0
                        ? "bg-gradient-to-br from-orange-400 to-red-500 shadow-inner hover:scale-110 cursor-pointer ring-1 ring-orange-600/30"
                        : "bg-gradient-to-br from-orange-300 to-red-400 opacity-70"
                      : "bg-transparent",
                  )}
                  aria-label={`Brick ${i + 1}`}
                />
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {bombs === 0 ? "Answer questions to earn bombs" : `Click a brick to blast (${bombs} bomb${bombs === 1 ? "" : "s"})`}
            </p>
          </div>

        </div>
      )}

    </GameShell>
  );
}

// ============================================================
// Shared shell
// ============================================================
function GameShell({ title, counter, onExit, children }: { title: string; counter?: string; onExit: () => void; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {counter && <p className="text-sm text-muted-foreground">{counter}</p>}
        </div>
        <Button variant="outline" onClick={onExit}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to games
        </Button>
      </div>
      {children}
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
