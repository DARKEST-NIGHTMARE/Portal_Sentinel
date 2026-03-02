import React from "react";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error("ErrorBoundary caught:", error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = "/";
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    fontFamily: "'Inter', sans-serif",
                }}>
                    <div style={{
                        background: "white",
                        borderRadius: "16px",
                        padding: "48px 40px",
                        maxWidth: "480px",
                        width: "90%",
                        textAlign: "center",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                    }}>
                        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>⚠️</div>
                        <h2 style={{ color: "#2d3748", marginBottom: "12px", fontSize: "1.4rem" }}>
                            Something went wrong
                        </h2>
                        <p style={{ color: "#718096", marginBottom: "8px", fontSize: "0.9rem" }}>
                            An unexpected error occurred in the UI.
                        </p>
                        {this.state.error && (
                            <pre style={{
                                background: "#fff5f5",
                                border: "1px solid #fed7d7",
                                borderRadius: "8px",
                                padding: "12px",
                                fontSize: "0.75rem",
                                color: "#c53030",
                                textAlign: "left",
                                overflowX: "auto",
                                marginBottom: "24px",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                            }}>
                                {this.state.error.message}
                            </pre>
                        )}
                        <button
                            onClick={this.handleReset}
                            style={{
                                background: "linear-gradient(135deg, #667eea, #764ba2)",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                padding: "12px 28px",
                                fontSize: "0.95rem",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            Go Back Home
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
