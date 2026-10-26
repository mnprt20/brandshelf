import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("Application Error caught by ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "var(--color-bg)",
            fontFamily: "var(--font-ui)"
          }}
        >
          <div
            style={{
              maxWidth: "480px",
              width: "100%",
              background: "#FFFFFF",
              padding: "32px",
              borderRadius: "24px",
              border: "1px solid #E5EADF",
              textAlign: "center"
            }}
          >
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🌿</div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px" }}>Something interrupted your view</h2>
            <p style={{ color: "var(--color-muted)", fontSize: "14px", lineHeight: "22px", margin: "0 0 20px" }}>
              The application recovered gracefully. You can reload the view or return to the main catalogue.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.hash = "#/";
                window.location.reload();
              }}
              style={{
                padding: "12px 28px",
                borderRadius: "9999px",
                background: "var(--color-forest)",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "14px"
              }}
            >
              Reload MintShelf
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
