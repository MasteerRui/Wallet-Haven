import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../../constants/theme';
import CategoryIcon from './CategoryIcon';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle: string;
  iconSize?: number;
  iconColor?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'Receipt',
  title,
  subtitle,
  iconSize = 64,
  iconColor = COLORS.textMuted,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <CategoryIcon iconName={icon} size={iconSize} color={iconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default EmptyState;
