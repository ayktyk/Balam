import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

interface Props {
  children: ReactNode;
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
    if (__DEV__) {
      console.log('ErrorBoundary caught:', error.message, errorInfo.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>🌿</Text>
          <Text style={styles.title}>Bir seyler ters gitti</Text>
          <Text style={styles.message}>
            Endise etme, verilerin guvende. Asagidaki butona basarak tekrar deneyebilirsin.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.errorDetail}>{this.state.error.message}</Text>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  message: {
    fontSize: 15,
    fontFamily: FONTS.body,
    color: COLORS.inkLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.lg,
    maxWidth: 300,
  },
  errorDetail: {
    fontSize: 12,
    fontFamily: FONTS.ui,
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  button: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  buttonText: {
    color: COLORS.warmWhite,
    fontSize: 15,
    fontFamily: FONTS.uiBold,
  },
});
