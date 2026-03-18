export function WaterDropAnimation({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const scale = size === "sm" ? 0.6 : size === "lg" ? 1.4 : 1;

  return (
    <>
      <style>{`
        @keyframes wdrop1 {
          0%   { transform: translateY(-18px) scale(0.6); opacity: 0; }
          15%  { opacity: 1; }
          70%  { transform: translateY(18px) scale(1); opacity: 0.9; }
          85%  { transform: translateY(22px) scale(1.15, 0.6); opacity: 0.5; }
          100% { transform: translateY(22px) scale(0); opacity: 0; }
        }
        @keyframes wdrop2 {
          0%   { transform: translateY(-14px) scale(0.5); opacity: 0; }
          20%  { opacity: 0.85; }
          65%  { transform: translateY(14px) scale(0.85); opacity: 0.8; }
          80%  { transform: translateY(17px) scale(1, 0.5); opacity: 0.4; }
          100% { transform: translateY(17px) scale(0); opacity: 0; }
        }
        @keyframes wdrop3 {
          0%   { transform: translateY(-10px) scale(0.4); opacity: 0; }
          25%  { opacity: 0.7; }
          60%  { transform: translateY(10px) scale(0.7); opacity: 0.6; }
          75%  { transform: translateY(12px) scale(0.9, 0.4); opacity: 0.3; }
          100% { transform: translateY(12px) scale(0); opacity: 0; }
        }
        @keyframes ripple1 {
          0%   { transform: scale(0); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes ripple2 {
          0%   { transform: scale(0); opacity: 0.4; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes wrise {
          0%   { transform: translateY(20px) scale(0.5); opacity: 0; }
          20%  { opacity: 0.5; }
          80%  { opacity: 0.3; }
          100% { transform: translateY(-24px) scale(0.3); opacity: 0; }
        }
        @keyframes wrise2 {
          0%   { transform: translateY(18px) scale(0.4); opacity: 0; }
          25%  { opacity: 0.4; }
          85%  { opacity: 0.2; }
          100% { transform: translateY(-20px) scale(0.25); opacity: 0; }
        }
        @keyframes wglow {
          0%, 100% { opacity: 0.15; }
          50%      { opacity: 0.4; }
        }
      `}</style>

      <div
        className="relative inline-flex items-center justify-center pointer-events-none select-none"
        style={{ width: 56 * scale, height: 56 * scale }}
      >
        {/* Ambient glow */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%)",
          animation: "wglow 2.8s ease-in-out infinite",
        }} />

        {/* Drop 1 — main large */}
        <svg
          style={{
            position: "absolute", left: "50%", top: "6%",
            transform: "translateX(-50%)",
            animation: "wdrop1 2.2s cubic-bezier(0.4,0,0.6,1) infinite",
            animationDelay: "0s",
            width: 13 * scale, height: 17 * scale,
          }}
          viewBox="0 0 13 17" fill="none"
        >
          <path d="M6.5 0 C6.5 0 0 8 0 11.5 A6.5 6.5 0 0 0 13 11.5 C13 8 6.5 0 6.5 0Z"
            fill="url(#dg1)" />
          <ellipse cx="4.5" cy="10" rx="1.5" ry="2" fill="rgba(255,255,255,0.35)" />
          <defs>
            <linearGradient id="dg1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
          </defs>
        </svg>

        {/* Drop 2 — smaller, offset left */}
        <svg
          style={{
            position: "absolute", left: "22%", top: "10%",
            animation: "wdrop2 2.2s cubic-bezier(0.4,0,0.6,1) infinite",
            animationDelay: "0.75s",
            width: 9 * scale, height: 12 * scale,
          }}
          viewBox="0 0 9 12" fill="none"
        >
          <path d="M4.5 0 C4.5 0 0 5.5 0 8 A4.5 4.5 0 0 0 9 8 C9 5.5 4.5 0 4.5 0Z"
            fill="url(#dg2)" />
          <ellipse cx="3" cy="7" rx="1" ry="1.4" fill="rgba(255,255,255,0.3)" />
          <defs>
            <linearGradient id="dg2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a5f3fc" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>

        {/* Drop 3 — tiny, offset right */}
        <svg
          style={{
            position: "absolute", right: "18%", top: "14%",
            animation: "wdrop3 2.2s cubic-bezier(0.4,0,0.6,1) infinite",
            animationDelay: "1.35s",
            width: 7 * scale, height: 9 * scale,
          }}
          viewBox="0 0 7 9" fill="none"
        >
          <path d="M3.5 0 C3.5 0 0 4 0 6 A3.5 3.5 0 0 0 7 6 C7 4 3.5 0 3.5 0Z"
            fill="url(#dg3)" />
          <defs>
            <linearGradient id="dg3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cffafe" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
        </svg>

        {/* Ripple at center-bottom */}
        <div style={{
          position: "absolute", bottom: "12%", left: "50%",
          transform: "translateX(-50%)",
          width: 12 * scale, height: 4 * scale,
        }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: `1.5px solid rgba(6,182,212,0.7)`,
            animation: "ripple1 2.2s ease-out infinite",
            animationDelay: "0.9s",
          }} />
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: `1px solid rgba(6,182,212,0.5)`,
            animation: "ripple2 2.2s ease-out infinite",
            animationDelay: "1.1s",
          }} />
        </div>

        {/* Rising bubbles (recycle upward) */}
        <div style={{
          position: "absolute", bottom: "18%", left: "38%",
          width: 5 * scale, height: 5 * scale,
          borderRadius: "50%",
          background: "rgba(34,211,238,0.45)",
          animation: "wrise 2.8s ease-in-out infinite",
          animationDelay: "1.4s",
        }} />
        <div style={{
          position: "absolute", bottom: "18%", right: "30%",
          width: 3.5 * scale, height: 3.5 * scale,
          borderRadius: "50%",
          background: "rgba(103,232,249,0.35)",
          animation: "wrise2 2.8s ease-in-out infinite",
          animationDelay: "2.1s",
        }} />
      </div>
    </>
  );
}
