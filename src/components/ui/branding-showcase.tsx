import type { ReactNode } from "react";
import { BrandingCard } from "@/components/ui/branding-card";

interface Showcase {
  category: string;
  title: string;
  subtitle: string;
  display: ReactNode;
  colors: string[];
}

const showcases: Showcase[] = [
  {
    category: "Branding",
    title: "Brand Style Guide",
    subtitle: "Core identity",
    display: (
      <span>
        Aa<span className="text-muted-foreground/50">Bb</span>
      </span>
    ),
    colors: ["#2A2A2A", "#5D4435", "#A5B592", "#F0F0E6"],
  },
  {
    category: "Design System",
    title: "Design System Showcase",
    subtitle: "Components & tokens",
    display: (
      <span>
        UI<span className="text-muted-foreground/50">/</span>
      </span>
    ),
    colors: ["#0F172A", "#3B82F6", "#93C5FD", "#E2E8F0"],
  },
  {
    category: "Typography",
    title: "Typography Showcase",
    subtitle: "SF Pro",
    display: (
      <span>
        Aa<span className="text-muted-foreground/50">Bb</span>
      </span>
    ),
    colors: ["#1C1917", "#57534E", "#A8A29E", "#F5F5F4"],
  },
];

export function BrandingShowcase() {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 2xl:grid-cols-3">
      {showcases.map((item) => (
        <BrandingCard
          key={item.title}
          className="max-w-none"
          category={item.category}
          title={item.title}
          subtitle={item.subtitle}
          displayElement={item.display}
          colors={item.colors}
        />
      ))}
    </div>
  );
}
