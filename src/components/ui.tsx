import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "outline" | "whatsapp";
    size?: "sm" | "md" | "lg" | "xl";
  }
>(({ className, variant = "primary", size = "md", ...props }, ref) => {
  const variants = {
    primary: "bg-navy-900 text-white hover:bg-navy-800 shadow-lg",
    secondary: "bg-gold-500 text-navy-900 hover:bg-gold-400 font-bold",
    outline: "border-2 border-navy-900 text-navy-900 hover:bg-navy-50",
    whatsapp: "bg-green-500 text-white hover:bg-green-600 shadow-xl pulse-animation",
  };
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg font-bold",
    xl: "px-10 py-5 text-xl font-black uppercase tracking-wider",
  };

  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-all duration-300 active:scale-95 disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";

export const Section = ({
  children,
  className,
  id,
  bg = "white",
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  bg?: "white" | "gray" | "navy" | "gold";
}) => {
  const bgClasses = {
    white: "bg-white",
    gray: "bg-gray-50",
    navy: "bg-navy-900 text-white",
    gold: "bg-gold-50",
  };
  return (
    <section id={id} className={cn("py-20 px-6 overflow-hidden", bgClasses[bg], className)}>
      <div className="max-w-6xl mx-auto">{children}</div>
    </section>
  );
};

/** Reveal ringan tanpa framer-motion. `eager` = langsung terlihat (penting untuk LCP hero). */
export const FadeUp = ({
  children,
  delay = 0,
  eager = false,
}: {
  children: React.ReactNode;
  delay?: number;
  eager?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (eager) return;
    const el = ref.current;
    if (!el) return;

    const show = () => setVisible(true);
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight + 100 && r.bottom > -100) {
      show();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          show();
          io.disconnect();
        }
      },
      { rootMargin: "100px 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager]);

  return (
    <div
      ref={ref}
      className={cn(
        "will-change-[opacity,transform]",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
      )}
      style={{
        transitionProperty: "opacity, transform",
        transitionDuration: "0.65s",
        transitionTimingFunction: "cubic-bezier(0.21, 0.47, 0.32, 0.98)",
        transitionDelay: visible ? `${delay}s` : "0s",
      }}
    >
      {children}
    </div>
  );
};
