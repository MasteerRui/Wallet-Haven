import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as LucideIcons from 'lucide-react-native';

interface CategoryIconProps {
  iconName: string | null | undefined;
  size?: number;
  color?: string;
  fallbackEmoji?: string;
}

const CategoryIcon: React.FC<CategoryIconProps> = ({
  iconName,
  size = 24,
  color = '#000000',
  fallbackEmoji,
}) => {
  
  if (!iconName) {
    if (fallbackEmoji) {
      return <Text style={[styles.emoji, { fontSize: size * 0.9 }]}>{fallbackEmoji}</Text>;
    }
    
    const DefaultIcon = LucideIcons.CircleDot;
    return <DefaultIcon size={size} color={color} strokeWidth={2} />;
  }

  const isEmoji = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(iconName);
  
  if (isEmoji) {
    return <Text style={[styles.emoji, { fontSize: size * 0.9 }]}>{iconName}</Text>;
  }

  const normalizedName = iconName
    .split(/[-_\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  const IconComponent = (LucideIcons as any)[normalizedName] || (LucideIcons as any)[iconName];

  if (IconComponent) {
    return <IconComponent size={size} color={color} strokeWidth={2} />;
  }

  if (fallbackEmoji) {
    return <Text style={[styles.emoji, { fontSize: size * 0.9 }]}>{fallbackEmoji}</Text>;
  }

  const FallbackIcon = LucideIcons.CircleDot;
  return <FallbackIcon size={size} color={color} strokeWidth={2} />;
};

const styles = StyleSheet.create({
  emoji: {
    textAlign: 'center',
  },
});

export default CategoryIcon;

