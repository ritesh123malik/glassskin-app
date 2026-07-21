import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
// import * as Sentry from '@sentry/react-native';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: any;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidMount() {
    this.props.resetOnPropsChange;
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.props.resetOnPropsChange !== prevProps.resetOnPropsChange) {
      this.resetError();
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Sentry.withScope((scope) => {
    //   scope.setExtra('componentStack', errorInfo.componentStack || '');
    //   scope.setExtra('errorBoundary', true);
    //   if (__DEV__) {
    //     console.error('[Sentry] Captured by ErrorBoundary:', error);
    //   }
    //   Sentry.captureException(error);
    // });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <View style={styles.container}>
          <GlassCard intensity="high" style={styles.card}>
            <Text style={styles.title}>Something Went Wrong</Text>
            <Text style={styles.subtitle}>
              An unexpected error occurred. The issue has been reported and we will look into it.
            </Text>
            {__DEV__ && (
              <Text style={styles.devError} numberOfLines={6}>
                {this.state.error.message}
              </Text>
            )}
            <GlassButton
              title="Try Again"
              onPress={this.resetError}
              variant="primary"
              style={styles.button}
            />
          </GlassCard>
        </View>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = (props: ErrorBoundaryProps) => {
  return <ErrorBoundaryClass {...props} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F2EE',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  title: {
    color: '#0B0B0C',
    fontSize: 20,
    fontFamily: 'Raleway_700Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: '#6B6660',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  devError: {
    color: '#B91C1C',
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', web: 'monospace' }),
    textAlign: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    overflow: 'hidden',
  },
  button: {
    width: '100%',
  },
});
