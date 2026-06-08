"use client";

import React from "react";
import { translate, getStoredLocale } from "@/lib/i18n";

interface State {
  err: Error | null;
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error);
  }

  reset = () => this.setState({ err: null });

  render() {
    if (this.state.err) {
      const locale = getStoredLocale();
      return (
        <main className="min-h-screen flex items-center justify-center p-4">
          <div className="card max-w-md text-center space-y-3">
            <h1 className="text-xl font-bold text-danger">{translate(locale, "common.errorBoundaryTitle")}</h1>
            <p className="text-text-2 text-sm">
              {translate(locale, "common.errorBoundaryBody")}
            </p>
            <div className="text-xs text-text-2 break-all">{this.state.err.message}</div>
            <button onClick={this.reset} className="btn-primary">
              {translate(locale, "common.retry")}
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
