import React, { Component, ErrorInfo, ReactNode } from "react";
import { Text, View, Pressable } from "react-native";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <View className="items-center justify-center flex-1 p-6">
                    <Text className="mb-2 text-lg font-semibold text-foreground">
                        Something went wrong
                    </Text>
                    <Text className="mb-4 text-center text-muted-foreground">
                        {this.state.error?.message ||
                            "An unexpected error occurred"}
                    </Text>
                    <Pressable
                        onPress={this.handleRetry}
                        className="px-4 py-2 rounded-lg bg-primary active:opacity-80">
                        <Text className="font-semibold text-primary-foreground">
                            Try again
                        </Text>
                    </Pressable>
                </View>
            );
        }

        return this.props.children;
    }
}
