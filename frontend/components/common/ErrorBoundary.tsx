"use client";

import React from "react";

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
      return (
        <main className="min-h-screen flex items-center justify-center p-4">
          <div className="card max-w-md text-center space-y-3">
            <h1 className="text-xl font-bold text-danger">문제가 발생했습니다</h1>
            <p className="text-text-2 text-sm">
              화면을 표시하는 중 오류가 발생했습니다. 다시 시도해 주세요.
            </p>
            <div className="text-xs text-text-2 break-all">{this.state.err.message}</div>
            <button onClick={this.reset} className="btn-primary">
              다시 시도
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
