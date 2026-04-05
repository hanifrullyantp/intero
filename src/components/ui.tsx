import React from "react";
import { motion } from "framer-motion";
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

export const FadeUp = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
  >
    {children}
  </motion.div>
);
