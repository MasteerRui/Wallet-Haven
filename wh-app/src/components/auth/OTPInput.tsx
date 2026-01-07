import React, {useState, useRef, useEffect} from 'react';
import {View, TextInput, StyleSheet, Animated, Easing} from 'react-native';

interface OTPInputProps {
  codeLength?: number;
  onCodeFilled: (code: string) => void;
  onCodeChanged: (code: string) => void;
}

const OTPInput: React.FC<OTPInputProps> = ({codeLength = 6, onCodeFilled, onCodeChanged}) => {
  const [code, setCode] = useState('');
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const animatedValues = useRef(
    [...Array(codeLength)].map(() => new Animated.Value(0)),
  );

  const [filledInputs, setFilledInputs] = useState(
    Array(codeLength).fill(false),
  );

  useEffect(() => {
    if (code.length === codeLength) {
      onCodeFilled(code);
    } else {
      onCodeChanged(code);
    }
  }, [code, codeLength, onCodeFilled, onCodeChanged]);

  const animateInput = (index: number) => {
    animatedValues.current[index].setValue(0);

    Animated.sequence([
      Animated.timing(animatedValues.current[index], {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animatedValues.current[index], {
        toValue: 0.9,
        duration: 100,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animatedValues.current[index], {
        toValue: 1,
        duration: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleChangeText = (text: string, index: number) => {
    const newCode = code.slice(0, index) + text + code.slice(index + 1);
    setCode(newCode);

    const newFilledInputs = [...filledInputs];
    newFilledInputs[index] = text.length > 0;
    setFilledInputs(newFilledInputs);

    if (text.length !== 0) {
      animateInput(index);

      if (index < codeLength - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (event: any, index: number) => {
    if (event.nativeEvent.key === 'Backspace' && index > 0 && !code[index]) {
      const newFilledInputs = [...filledInputs];
      newFilledInputs[index - 1] = false;
      setFilledInputs(newFilledInputs);

      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {[...Array(codeLength)].map((_, index) => {
        const animatedBackgroundColor = animatedValues.current[
          index
        ].interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [
            filledInputs[index] ? 'rgba(26, 26, 26, 0.15)' : '#F5F5F5',
            'rgba(26, 26, 26, 0.3)',
            filledInputs[index] ? 'rgba(26, 26, 26, 0.15)' : '#F5F5F5',
          ],
        });

        const scale = animatedValues.current[index].interpolate({
          inputRange: [0, 0.5, 0.9, 1],
          outputRange: [1, 1.1, 0.95, 1],
        });

        const animatedBorderColor = animatedValues.current[index].interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [
            filledInputs[index]
              ? 'rgba(26, 26, 26, 0.5)'
              : '#E0E0E0',
            'rgba(26, 26, 26, 0.8)',
            filledInputs[index]
              ? 'rgba(26, 26, 26, 0.5)'
              : '#E0E0E0',
          ],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.inputContainer,
              {
                transform: [{scale}],
                backgroundColor: animatedBackgroundColor,
                borderColor: animatedBorderColor,
              },
            ]}>
            <TextInput
              ref={ref => (inputRefs.current[index] = ref)}
              style={[styles.input, filledInputs[index] && styles.filledInput]}
              maxLength={1}
              selectionColor="#1A1A1A"
              keyboardType="numeric"
              onChangeText={text => handleChangeText(text, index)}
              onKeyPress={event => handleKeyPress(event, index)}
              value={code[index] || ''}
            />
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  inputContainer: {
    width: 50,
    height: 60,
    borderWidth: 1,
    justifyContent: 'center',
    borderRadius: 8,
    alignItems: 'center',
    overflow: 'hidden',
  },
  input: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 20,
    color: '#1A1A1A',
    paddingHorizontal: 0,
  },
  filledInput: {
    color: '#1A1A1A',
    fontWeight: 'bold',
  },
});

export default OTPInput;

