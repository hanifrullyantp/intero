import type { LucideIcon } from "lucide-react";
import {
  Droplets,
  BugOff,
  Sparkles,
  Award,
  MessageCircle,
  Layout,
  Hammer,
  Eye,
  ShieldCheck,
  Gift,
  Zap,
  X,
  HelpCircle,
  Check,
} from "lucide-react";

const stepIcons: Record<string, LucideIcon> = {
  MessageCircle,
  Layout,
  Hammer,
  Eye,
  ShieldCheck,
};

const heroIcons: Record<string, LucideIcon> = {
  Droplets,
  BugOff,
  Sparkles,
  Award,
};

const bonusIcons: Record<string, LucideIcon> = {
  Layout,
  Gift,
  Zap,
};

const cmpIcons: Record<string, LucideIcon> = {
  X,
  HelpCircle,
  Check,
};

export function StepIcon({ name, size = 36 }: { name: string; size?: number }) {
  const I = stepIcons[name] || MessageCircle;
  return <I size={size} />;
}

export function HeroIcon({ name, className }: { name: string; className?: string }) {
  const I = heroIcons[name] || Award;
  return <I className={className} />;
}

export function BonusIcon({ name, className, size = 32 }: { name: string; className?: string; size?: number }) {
  const I = bonusIcons[name] || Gift;
  return <I className={className} size={size} />;
}

export function CmpIcon({ name, className }: { name: string; className?: string }) {
  const I = cmpIcons[name] || HelpCircle;
  return <I className={className} />;
}
