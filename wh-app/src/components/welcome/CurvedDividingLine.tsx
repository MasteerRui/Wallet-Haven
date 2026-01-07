import React from 'react';
import {View, Dimensions} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {welcomeStyles as styles} from '../../styles/welcomeStyles';

const {width} = Dimensions.get('window');

export const CurvedDividingLine: React.FC = () => {
  return (
    <View style={styles.curvedLineContainer}>
      <Svg height="60" width={width}>
        <Path
          d={`M 0 0 Q ${width / 4} 60, ${width} 35`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />
      </Svg>
    </View>
  );
};

