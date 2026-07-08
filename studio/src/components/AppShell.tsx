"use client";

import { BarChart3, FileSpreadsheet, Sparkles } from "lucide-react";
import type { AppStep } from "@/types";

interface AppShellProps {
  step: AppStep;
  children: React.ReactNode;
}

const STEPS: { key: AppStep; label: string; icon: React.ReactNode }[] = [
  { key: "input", label: "Data Input", icon: <FileSpreadsheet size={14} /> },
  { key: "review", label: "Review Data", icon: <FileSpreadsheet size={14} /> },
  { key: "recommend", label: "Recommend", icon: <Sparkles size={14} /> },
  { key: "chart", label: "Chart", icon: <BarChart3 size={14} /> },
];

export default function AppShell({ step, children }: AppShellProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Header ─── */}
      <header className="border-b border-border-subtle bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center">
              <BarChart3 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-text-primary tracking-tight">
                Reports to Charts Studio
              </h1>
              <p className="text-[0.65rem] text-text-muted">
                Evident · AI Intelligence
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <nav className="hidden md:flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    i === currentIndex
                      ? "bg-accent-500/15 text-accent-400 border border-accent-500/30"
                      : i < currentIndex
                        ? "text-accent-400/60"
                        : "text-text-muted/50"
                  }`}
                >
                  {s.icon}
                  {s.label}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-6 h-px mx-1 ${
                      i < currentIndex
                        ? "bg-accent-500/40"
                        : "bg-border-subtle"
                    }`}
                  />
                )}
              </div>
            ))}
          </nav>
        </div>
      </header>

      {/* ─── Main content ─── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {children}
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border-subtle py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-[0.65rem] text-text-muted">
          <span>
            Demo only · Synthetic data · Not affiliated with Evident Insights
          </span>
          <span>Built for portfolio demonstration</span>
        </div>
      </footer>
    </div>
  );
}
