"use client";

import { useState } from "react";
import { Copy, Check, FileText } from "lucide-react";
import type { GeneratedCaption } from "@/types";
import { formatCaptionMarkdown } from "@/lib/captionFormatting";

interface AnalystCaptionProps {
  caption: GeneratedCaption;
}

export default function AnalystCaption({ caption }: AnalystCaptionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const markdown = formatCaptionMarkdown(caption);
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card-elevated p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-label mb-1">Analyst Caption</p>
          <h3 className="text-base font-bold text-text-primary">
            {caption.headline}
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Generated via{" "}
            {caption.generationMethod === "minimax-m3"
              ? "MiniMax M3"
              : "rules-based fallback"}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="pill-cta pill-cta-secondary text-xs flex-shrink-0"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy Markdown"}
        </button>
      </div>

      <CaptionSection title="Extracted facts" items={caption.extractedFacts} />
      <CaptionSection
        title="Interpretation"
        items={caption.interpretation}
        emptyText="No additional interpretation provided."
      />
      <CaptionSection title="Caveats" items={caption.caveats} />

      <div className="pt-3 border-t border-border-subtle flex items-start gap-2">
        <FileText size={14} className="text-text-muted mt-0.5 flex-shrink-0" />
        <p className="text-xs text-text-muted leading-relaxed">
          {caption.sourceNote}
        </p>
      </div>
    </div>
  );
}

function CaptionSection({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText?: string;
}) {
  return (
    <div>
      <p className="text-[0.65rem] uppercase tracking-wider text-text-muted mb-2">
        {title}
      </p>
      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.map((item, index) => (
            <li
              key={`${title}-${index}`}
              className="text-sm text-text-secondary leading-relaxed flex gap-2"
            >
              <span className="text-accent-400 flex-shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-muted italic">{emptyText}</p>
      )}
    </div>
  );
}
