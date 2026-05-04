import { useEffect, useRef } from "react";
import { cn } from "../lib/utils";

/**
 * Tiny live-mic visualizer. Reads raw RMS off an existing AnalyserNode and
 * paints 5 vertical bars without triggering React re-renders (DOM mutation
 * inside a requestAnimationFrame loop).
 *
 * Bars stay flat when:
 *   - `active` is false (recording stopped / paused)
 *   - the analyser ref isn't set yet
 *   - there's no audio coming through (mic muted or hardware dead)
 *
 * So if the user starts recording and the bars don't move, the mic isn't
 * actually capturing — exactly the "mic working or not" signal asked for.
 */
export function MicLevelBars({
  analyserRef,
  active,
  className,
  barClassName,
}: {
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  active: boolean;
  className?: string;
  barClassName?: string;
}) {
  const barRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);
  const histRef = useRef<number[]>([0, 0, 0, 0, 0]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset to flat whenever we leave the active state.
    if (!active) {
      barRefs.current.forEach((el) => { if (el) el.style.height = "12%"; });
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }

    const buf = new Uint8Array(1024);
    const tick = () => {
      const an = analyserRef.current;
      if (an) {
        // AnalyserNode.getByteTimeDomainData expects a buffer matching fftSize;
        // re-allocate if the analyser's fftSize differs.
        const view = an.fftSize === buf.length ? buf : new Uint8Array(an.fftSize);
        an.getByteTimeDomainData(view);
        let sumSq = 0;
        for (let i = 0; i < view.length; i++) {
          const v = (view[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / view.length);
        // Push into a 5-slot ring so each bar shows a slightly-delayed sample,
        // creating the "wave" travelling across the bars.
        histRef.current.shift();
        histRef.current.push(rms);
        for (let i = 0; i < 5; i++) {
          const el = barRefs.current[i];
          if (!el) continue;
          const v = histRef.current[i] || 0;
          // Map RMS (~0–0.4 in normal speech) to 12–100% bar height.
          const pct = Math.min(100, Math.max(12, v * 600));
          el.style.height = `${pct}%`;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [active, analyserRef]);

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-[2px] h-4 w-9",
        className,
      )}
      title={active ? "Microphone active" : "Microphone idle"}
      aria-label={active ? "Microphone active" : "Microphone idle"}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          ref={(el) => { barRefs.current[i] = el; }}
          className={cn(
            "w-[2px] rounded-full transition-[height] duration-75 ease-out",
            active ? "bg-rose-500" : "bg-gray-300",
            barClassName,
          )}
          style={{ height: "12%" }}
        />
      ))}
    </div>
  );
}
