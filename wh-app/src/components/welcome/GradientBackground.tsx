import React from 'react';
import { View, Dimensions } from 'react-native';
import { welcomeStyles as styles } from '../../styles/welcomeStyles';
import { COLORS } from '../../constants/theme';

const gridSize = 20;
const { width } = Dimensions.get('window');
const numColumns = Math.ceil(width / gridSize);
const numRows = Math.ceil(400 / gridSize);

export const GradientBackground: React.FC = () => {
  return (
    <View style={styles.gradientTop}>
      {}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#F9FAFB',
        }}
      />

      {}
      <View
        style={{
          position: 'absolute',
          top: -100,
          left: -100,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: 'rgba(28, 28, 30, 0.03)',
        }}
      />

      {}
      <View
        style={{
          position: 'absolute',
          top: 50,
          right: -80,
          width: 250,
          height: 250,
          borderRadius: 125,
          backgroundColor: 'rgba(28, 28, 30, 0.02)',
        }}
      />

      <View style={styles.gridOverlay}>
        {Array.from({ length: numRows }).map((_, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.gridRow}>
            {Array.from({ length: numColumns }).map((_, colIndex) => {
              const opacity = 1 - (rowIndex / numRows) * 2;
              return (
                <View
                  key={`cell-${rowIndex}-${colIndex}`}
                  style={[
                    styles.gridCell,
                    {
                      borderColor: `rgba(28, 28, 30, ${Math.max(
                        0,
                        opacity * 0.04,
                      )})`,
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};
