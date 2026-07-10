"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches Recharts / encoding render crashes so a bad recommendation
 * cannot take down the whole /chart route ("This page couldn't load").
 */
export default class ChartErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error("[ChartErrorBoundary]", error, info.componentStack);
    }
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm font-medium text-text-primary">
            Chart could not be rendered
          </p>
          <p className="text-xs text-text-muted max-w-md">
            This recommendation produced an invalid plot. Go back and pick
            another chart type.
          </p>
          <button
            type="button"
            className="pill-cta pill-cta-secondary mt-2"
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
