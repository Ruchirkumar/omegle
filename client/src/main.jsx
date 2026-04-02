import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: ""
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Unknown runtime error"
    };
  }

  componentDidCatch(error) {
    console.error("RootErrorBoundary:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto mt-10 max-w-2xl rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">Frontend crashed while rendering.</p>
          <p className="mt-1">{this.state.errorMessage}</p>
          <p className="mt-2 text-xs">
            Try hard refresh (Ctrl+Shift+R). If it persists, clear site storage for this origin.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
