import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { COLORS } from '../../constants/theme';

interface CalculatorSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onAmountChange: (amount: string) => void;
  initialAmount: string;
  currencySymbol?: string;
}

const formatAmount = (amount: string) => {
  const cleanAmount = amount.replace(/[\s.]/g, '');

  if (cleanAmount.includes(',')) {
    const [whole, decimal] = cleanAmount.split(',');
    const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedWhole},${decimal}`;
  }
  return cleanAmount.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const CalculatorSheet: React.FC<CalculatorSheetProps> = ({
  isVisible,
  onClose,
  onAmountChange,
  initialAmount,
  currencySymbol = '€',
}) => {
  const { height, width } = useWindowDimensions();
  const buttonSize = width * 0.18;
  const fontSize = width * 0.07;
  const displayFontSize = width * 0.12;

  const [displayValue, setDisplayValue] = React.useState(initialAmount);
  const [operator, setOperator] = React.useState('');
  const [previousValue, setPreviousValue] = React.useState('');
  const [shouldResetDisplay, setShouldResetDisplay] = React.useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(
    new Animated.Value(Dimensions.get('window').height),
  ).current;
  const amountScale = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isVisible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();

      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').height,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const animateAmount = () => {
    Animated.sequence([
      Animated.timing(amountScale, {
        toValue: 1.1,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(amountScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    Animated.timing(slideAnim, {
      toValue: Dimensions.get('window').height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleNumberPress = (num: string) => {
    if (shouldResetDisplay) {
      setDisplayValue(num);
      setShouldResetDisplay(false);
    } else {
      if (num === ',' && !displayValue.includes(',')) {
        setDisplayValue(displayValue + num);
      } else if (num !== ',') {
        setDisplayValue(displayValue === '0' ? num : displayValue + num);
      }
    }
    animateAmount();
  };

  const handleOperator = (op: string) => {
    if (op === '=') {
      calculateResult();
    } else {
      setOperator(op);
      setPreviousValue(displayValue);
      setShouldResetDisplay(true);
    }
    animateAmount();
  };

  const calculateResult = () => {
    if (!operator || !previousValue) return;

    const prev = parseFloat(previousValue.replace(',', '.'));
    const current = parseFloat(displayValue.replace(',', '.'));
    let result = 0;

    switch (operator) {
      case '+':
        result = prev + current;
        break;
      case '-':
        result = prev - current;
        break;
      case '×':
        result = prev * current;
        break;
      case '÷':
        result = prev / current;
        break;
    }

    setDisplayValue(result.toString().replace('.', ','));
    setOperator('');
    setPreviousValue('');
    setShouldResetDisplay(true);
    animateAmount();
  };

  const handleBackspace = () => {
    setDisplayValue(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    animateAmount();
  };

  const keypad = [
    ['7', '8', '9', '÷'],
    ['4', '5', '6', '×'],
    ['1', '2', '3', '-'],
    [',', '0', '=', '+'],
  ];

  const getAdjustedFontSize = (value: string) => {
    const length = value.length;
    if (length > 12) {
      return displayFontSize * 0.5;
    } else if (length > 9) {
      return displayFontSize * 0.7;
    } else if (length > 6) {
      return displayFontSize * 0.85;
    }
    return displayFontSize;
  };

  return (
    <Modal visible={isVisible} transparent onRequestClose={handleClose}>
      <View style={styles.mainContainer}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(0, 0, 0, 0.5)', opacity: fadeAnim },
          ]}
        />
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          activeOpacity={1}
        />
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.displayContainer}>
            <View style={styles.amountRow}>
              <Animated.Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[
                  styles.displayText,
                  {
                    fontSize: getAdjustedFontSize(displayValue),
                    transform: [{ scale: amountScale }],
                  },
                ]}
              >
                {currencySymbol}
                {formatAmount(displayValue)}
              </Animated.Text>
              <TouchableOpacity
                onPress={handleBackspace}
                style={styles.deleteButton}
              >
                <Text
                  style={[
                    styles.deleteButtonText,
                    { fontSize: fontSize * 0.8 },
                  ]}
                >
                  ⌫
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.calculatorPad}>
            {keypad.map((row, i) => (
              <View key={i} style={styles.row}>
                {row.map(btn => (
                  <TouchableOpacity
                    key={btn}
                    style={[
                      styles.button,
                      {
                        width: buttonSize,
                        height: buttonSize,
                      },
                      ['÷', '×', '-', '+', '='].includes(btn) &&
                        styles.operatorButton,
                    ]}
                    onPress={() => {
                      if (['÷', '×', '-', '+', '='].includes(btn))
                        handleOperator(btn);
                      else handleNumberPress(btn);
                    }}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        { fontSize: fontSize },
                        ['÷', '×', '-', '+', '='].includes(btn) &&
                          styles.operatorText,
                      ]}
                    >
                      {btn}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.bottomButtons}>
            <TouchableOpacity
              style={[styles.bottomButton]}
              onPress={handleClose}
            >
              <Text style={styles.cancelButton}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bottomButton, styles.doneButtonBg]}
              onPress={() => {
                onAmountChange(displayValue);
                handleClose();
              }}
            >
              <Text style={styles.doneButton}>Concluir</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginTop: 'auto',
    gap: 12,
    width: '100%',
  },
  bottomButton: {
    flex: 1,
    paddingVertical: 17,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  doneButtonBg: {
    backgroundColor: COLORS.primary,
  },
  cancelButton: {
    color: '#1F2937',
    fontSize: 17,
    fontWeight: '500',
  },
  doneButton: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '500',
  },
  displayContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
  },
  displayText: {
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'right',
  },
  deleteButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#6B7280',
    opacity: 0.8,
  },
  calculatorPad: {
    flex: 0,
    marginTop: 30,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  operatorButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: '#1F2937',
    fontWeight: '500',
    textAlign: 'center',
  },
  operatorText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlignVertical: 'center',
    paddingLeft: 1,
    paddingBottom: 1,
  },
});

export default CalculatorSheet;
