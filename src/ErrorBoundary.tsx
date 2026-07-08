import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Rendered in place of the crashed subtree; falls back to a default panel. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render/lifecycle crashes in the subtree so one bad panel doesn't
 * white-screen the whole atlas. loadWorld already guards *data* errors up front
 * (see App.tsx); this guards everything that can throw *after* a valid load — a
 * live GM tool should degrade to a message, not a blank page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep the crash visible in the console for debugging the live tool.
    console.error("Atlas render error:", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  override render(): ReactNode {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset);
      return (
        <div className="app__panel" role="alert">
          <div className="panel__eyebrow">Algo quebrou</div>
          <h2 className="panel__title">Erro inesperado</h2>
          <p className="panel__desc">Ocorreu um erro ao renderizar esta parte do atlas.</p>
          <pre style={{ whiteSpace: "pre-wrap", color: "#e88", marginTop: 12 }}>
            {error.message}
          </pre>
          <button
            type="button"
            className="app__mode"
            onClick={this.reset}
            style={{ marginTop: 12 }}
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
