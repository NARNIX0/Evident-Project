"use client";

import Link from "next/link";
import { BarChart3, FileSpreadsheet, Sparkles } from "lucide-react";
import type { AppStep } from "@/types";
import { pathForStep } from "@/lib/workflowRoutes";

interface AppShellProps {
  step: AppStep;
  children: React.ReactNode;
  onNavigate?: (step: AppStep) => void;
}

const STEPS: { key: AppStep; label: string; icon: React.ReactNode }[] = [
  { key: "input", label: "Data Input", icon: <FileSpreadsheet size={14} /> },
  { key: "review", label: "Review Data", icon: <FileSpreadsheet size={14} /> },
  { key: "recommend", label: "Recommend", icon: <Sparkles size={14} /> },
  { key: "chart", label: "Chart", icon: <BarChart3 size={14} /> },
];

export default function AppShell({ step, children, onNavigate }: AppShellProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen flex flex-col bg-evident-motif">
      <header className="border-b border-border-subtle bg-navy-900 shadow-md sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-8 py-4 flex items-center justify-between">
          <Link
            href="/"
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault();
                onNavigate("input");
              }
            }}
            className="flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-[12px] bg-accent-500 flex items-center justify-center">
              <BarChart3 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-text-primary tracking-tight">
                Reports to Charts Studio
              </h1>
              <p className="text-[0.65rem] text-text-muted uppercase tracking-wider">
                Evident Insights
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <button
                  type="button"
                  onClick={() => i <= currentIndex && onNavigate?.(s.key)}
                  disabled={i > currentIndex}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    i === currentIndex
                      ? "bg-navy-800 text-accent-400 border border-accent-500 shadow-sm"
                      : i < currentIndex
                        ? "text-accent-400 hover:text-text-primary hover:bg-navy-800 cursor-pointer"
                        : "text-text-muted cursor-default"
                  }`}
                  title={pathForStep(s.key)}
                >
                  {s.icon}
                  {s.label}
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-6 h-px mx-1 ${
                      i < currentIndex ? "bg-accent-500" : "bg-border-subtle"
                    }`}
                  />
                )}
              </div>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-[1280px] mx-auto w-full px-8 py-8">
        {children}
      </main>
    </div>
  );
}
