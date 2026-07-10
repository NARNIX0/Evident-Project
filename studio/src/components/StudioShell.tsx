"use client";

import AppShell from "@/components/AppShell";
import { WorkflowProvider, useWorkflow } from "@/components/WorkflowProvider";

function StudioShellInner({ children }: { children: React.ReactNode }) {
  const { hydrated, step, goToStep, goHome } = useWorkflow();

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-evident-motif">
        <p className="text-sm text-text-muted">Restoring session…</p>
      </div>
    );
  }

  return (
    <AppShell
      step={step}
      onNavigate={(target) => {
        if (target === "input") {
          goHome();
        } else {
          goToStep(target);
        }
      }}
    >
      {children}
    </AppShell>
  );
}

export default function StudioShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkflowProvider>
      <StudioShellInner>{children}</StudioShellInner>
    </WorkflowProvider>
  );
}
