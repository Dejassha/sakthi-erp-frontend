import { Component } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "@/components/ReusableComponents/Button";

class GlobalErrorBoundary extends Component {
  state = {
    hasError: false,
    error: null,
  };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Here you could send the error to a logging service like Sentry
  }
  handleReload = () => {
    window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-100 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-8">
              A critical error occurred in the ERP system. We&apos;ve logged the
              issue and are working on a fix.
            </p>

            <div className="space-y-4">
              <Button
                onClick={this.handleReload}
                icon="lucide:rotate-cw"
                color="blue"
                size="md"
                className="w-full justify-center"
              >
                Reload Application
              </Button>

              <p className="text-xs text-gray-400">
                Error: {this.state.error?.message || "Unknown Error"}
              </p>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
export default GlobalErrorBoundary;
