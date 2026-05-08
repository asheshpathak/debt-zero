import { useEffect, useState, useRef } from "react";

type TerminalMode = "payment" | "synthesis";

const PAYMENT_LINES = [
  { text: "$ debtzero unlock --submit", delay: 0 },
  { text: ">> POST /payment/order …", delay: 400 },
  { text: ">> authorising session …", delay: 900 },
  { text: ">> persisting unlock record …", delay: 1400 },
  { text: ">> queueing roadmap synthesis (background) …", delay: 1700 },
  { text: ">> closing handshake — opening dashboard", delay: 2100 },
];

const SYNTHESIS_LINES = [
  { text: "$ debtzero plan --generate --all-strategies", delay: 0 },
  { text: ">> loading intake from store …", delay: 600 },
  { text: ">> building cashflow context …", delay: 1200 },
  { text: ">> computing amortization for all debts …", delay: 1900 },
  { text: ">> applying safe / balanced / aggressive parameters …", delay: 2700 },
  { text: ">> calculating milestone schedule …", delay: 3500 },
  { text: ">> running intelligent analysis (4 payoff models) …", delay: 4400 },
  { text: ">> this step often takes 60s–3min — safe to wait", delay: 5400 },
  { text: ">> streaming structured JSON response …", delay: 12000 },
  { text: ">> validating schedules & debt order …", delay: 18000 },
  { text: ">> assembling roadmap narrative …", delay: 23000 },
  { text: ">> finalising plan data …", delay: 27000 },
];

function linesForMode(mode: TerminalMode) {
  return mode === "payment" ? PAYMENT_LINES : SYNTHESIS_LINES;
}

interface TerminalProgressProps {
  active: boolean;
  mode: TerminalMode;
  title?: string;
  className?: string;
}

/**
 * Fake terminal output while an async API / long poll is in flight.
 * Does not reflect real server steps — sets expectations only.
 */
export function TerminalProgress({ active, mode, title, className = "" }: TerminalProgressProps) {
  const [visible, setVisible] = useState<{ text: string }[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!active) {
      setVisible([]);
      setElapsed(0);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      return;
    }

    const lines = linesForMode(mode);
    setVisible([]);
    timersRef.current = [];

    lines.forEach((line) => {
      const id = setTimeout(() => {
        setVisible((v) => [...v, { text: line.text }]);
      }, line.delay);
      timersRef.current.push(id);
    });

    const start = Date.now();
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      clearInterval(tick);
    };
  }, [active, mode]);

  if (!active) return null;

  return (
    <div
      className={`rounded-lg overflow-hidden text-left font-mono text-[11px] leading-relaxed ${className}`}
      style={{
        background: "rgba(0,0,0,0.45)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div
        className="px-3 py-2 flex items-center justify-between gap-2 border-b border-white/[0.06]"
        style={{ background: "rgba(0,0,0,0.35)" }}
      >
        <span className="text-[#5b5fc7] tracking-[0.08em] uppercase text-[9px] font-semibold">
          {title ?? "session.log"}
        </span>
        <span className="text-[#44475a] tabular-nums text-[10px]">t+{elapsed}s</span>
      </div>
      <div className="p-3 max-h-48 overflow-y-auto space-y-1 text-[#8b95a8]">
        {visible.map((line, i) => (
          <p key={`${i}-${line.text}`} className="break-words">
            <span className="text-[#44475a] select-none mr-1.5">{String(i + 1).padStart(2, "0")}</span>
            {line.text.startsWith("$") ? (
              <>
                <span className="text-[#22c55e]/90">$</span>
                <span className="text-[#dce1ea]">{line.text.slice(1)}</span>
              </>
            ) : (
              <span className="text-[#7b7f9a]">{line.text}</span>
            )}
          </p>
        ))}
        <p className="text-[#5b5fc7] animate-pulse pt-1">▌</p>
      </div>
    </div>
  );
}
