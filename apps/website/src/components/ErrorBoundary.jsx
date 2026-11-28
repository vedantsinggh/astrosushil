import { Component } from "react";

/**
 * Top-level error boundary preventing blank screens on unexpected runtime
 * exceptions or stale lazy-chunk fetches after production deployments.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error) {
    const message = String(error?.message || error || "");
    const isChunkError =
      /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
        message,
      );
    return { hasError: true, isChunkError };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#e3d9c6] shadow-sm p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#100d42]/10 flex items-center justify-center">
            <span
              className="text-2xl font-bold text-[#100d42]"
              aria-hidden="true"
            >
              ✦
            </span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-[#100d42] mb-2">
            {this.state.isChunkError
              ? "A new version is ready"
              : "Something went wrong"}
          </h1>
          <p className="text-sm text-[#4b4b63] leading-relaxed mb-6">
            {this.state.isChunkError
              ? "We recently updated Astro Sushil. Please reload this page to load the latest version cleanly."
              : "An unexpected error occurred while displaying this page. Reloading usually resolves it right away."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="px-6 py-3 rounded-xl bg-[#100d42] text-white text-sm font-semibold hover:opacity-95 transition-opacity cursor-pointer"
            >
              Reload Page
            </button>
            <a
              href="/"
              className="px-6 py-3 rounded-xl border border-[#d6ccb8] text-[#100d42] text-sm font-semibold hover:bg-[#faf6ef] transition-colors"
            >
              Go Home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
