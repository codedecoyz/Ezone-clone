import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '../../styles/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
  variant?: 'default' | 'gradient';
}

export function Card({ children, style, noPadding = false, variant = 'default' }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        !noPadding && styles.cardPadding,
        variant === 'gradient' && styles.gradientCard,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    ...Shadows.md,
  },
  cardPadding: {
    padding: Spacing.md,
  },
  gradientCard: {
    backgroundColor: Colors.primary,
  },
});

export default Card;
