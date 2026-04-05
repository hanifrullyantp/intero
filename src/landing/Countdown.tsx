import React, { useEffect, useState } from "react";

export function Countdown() {
  const [timeLeft, setTimeLeft] = useState({ h: 2, m: 45, s: 30 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.s > 0) return { ...prev, s: prev.s - 1 };
        if (prev.m > 0) return { ...prev, m: prev.m - 1, s: 59 };
        if (prev.h > 0) return { ...prev, h: prev.h - 1, m: 59, s: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex gap-4 justify-center items-center font-mono">
      {[
        { label: "JAM", val: timeLeft.h },
        { label: "MENIT", val: timeLeft.m },
        { label: "DETIK", val: timeLeft.s },
      ].map((item, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="bg-navy-900 text-white text-3xl md:text-5xl font-bold p-3 md:p-4 rounded-xl min-w-[70px] md:min-w-[90px] shadow-lg border border-gold-500/30">
            {item.val.toString().padStart(2, "0")}
          </div>
          <span className="text-[10px] md:text-xs font-bold mt-2 text-navy-800 tracking-widest">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
