"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in component:", error, errorInfo);
    // You can also log the error to an error reporting service here
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive bg-destructive/10 text-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Displaying Results
            </CardTitle>
            <CardDescription className="text-destructive/80">
              There was a problem rendering the commute results.
              {this.props.fallbackMessage && <p>{this.props.fallbackMessage}</p>}
              {this.state.error && (
                <pre className="mt-2 whitespace-pre-wrap text-xs">{this.state.error.toString()}</pre>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 