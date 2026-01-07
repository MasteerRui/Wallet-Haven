import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
} from 'lucide-react-native';
import { COLORS } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';

interface DateSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  initialDate?: Date;
  minDate?: Date;
  showTimePicker?: boolean;
}

const DateSheet: React.FC<DateSheetProps> = ({
  isVisible,
  onClose,
  onSelect,
  initialDate = new Date(),
  minDate,
  showTimePicker = false,
}) => {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [currentMonth, setCurrentMonth] = useState(initialDate);
  const [selectedHour, setSelectedHour] = useState(initialDate.getHours());
  const [selectedMinute, setSelectedMinute] = useState(
    initialDate.getMinutes(),
  );
  const [showTimeStep, setShowTimeStep] = useState(false); 
  const { t } = useTranslation();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(
    new Animated.Value(Dimensions.get('window').height),
  ).current;

  const weekDays = [
    t('dateSelector.sunday'),
    t('dateSelector.monday'),
    t('dateSelector.tuesday'),
    t('dateSelector.wednesday'),
    t('dateSelector.thursday'),
    t('dateSelector.friday'),
    t('dateSelector.saturday'),
  ];
  const months = [
    t('dateSelector.january'),
    t('dateSelector.february'),
    t('dateSelector.march'),
    t('dateSelector.april'),
    t('dateSelector.may'),
    t('dateSelector.june'),
    t('dateSelector.july'),
    t('dateSelector.august'),
    t('dateSelector.september'),
    t('dateSelector.october'),
    t('dateSelector.november'),
    t('dateSelector.december'),
  ];

  useEffect(() => {
    if (isVisible) {
      setSelectedDate(initialDate);
      setCurrentMonth(initialDate);
      setSelectedHour(initialDate.getHours());
      setSelectedMinute(initialDate.getMinutes());
      setShowTimeStep(false); 

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
  }, [isVisible, initialDate]);

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    Animated.timing(slideAnim, {
      toValue: Dimensions.get('window').height,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const renderQuickDates = () => {
    const today = new Date();
    const quickDates = [
      {
        label: t('dateSelector.yesterday'),
        date: new Date(new Date().setDate(today.getDate() - 1)),
      },
      {
        label: t('dateSelector.today'),
        date: today,
      },
      {
        label: t('dateSelector.tomorrow'),
        date: new Date(new Date().setDate(today.getDate() + 1)),
      },
    ];

    const normalizedMinDate = minDate ? new Date(minDate) : null;
    if (normalizedMinDate) {
      normalizedMinDate.setHours(0, 0, 0, 0);
    }

    return (
      <View style={styles.quickDatesContainer}>
        {quickDates.map((item, index) => {
          const itemDate = new Date(item.date);
          itemDate.setHours(0, 0, 0, 0);
          const isDisabled = normalizedMinDate && itemDate < normalizedMinDate;
          const isSelected =
            selectedDate.toDateString() === item.date.toDateString();

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.quickDateItem,
                isSelected && styles.selectedQuickDate,
                isDisabled && styles.disabledQuickDate,
              ]}
              onPress={() => !isDisabled && handleDateSelect(item.date)}
              activeOpacity={0.7}
              disabled={!!isDisabled}
            >
              <View style={styles.quickDateContent}>
                <View
                  style={[
                    styles.quickIconContainer,
                    isSelected && styles.selectedQuickIcon,
                    isDisabled && styles.disabledQuickIcon,
                  ]}
                >
                  {item.label === t('dateSelector.today') ? (
                    <CalendarDays
                      size={18}
                      color={
                        isDisabled
                          ? '#D1D5DB'
                          : isSelected
                          ? '#FFFFFF'
                          : COLORS.primary
                      }
                    />
                  ) : (
                    <Calendar
                      size={18}
                      color={
                        isDisabled
                          ? '#D1D5DB'
                          : isSelected
                          ? '#FFFFFF'
                          : COLORS.primary
                      }
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.quickDateLabel,
                    isSelected && styles.selectedQuickDateLabel,
                    isDisabled && styles.disabledQuickDateLabel,
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    return { daysInMonth, startingDay };
  };

  const handleDateSelect = (date: Date) => {
    if (showTimePicker && !showTimeStep) {
      
      setSelectedDate(date);
    } else if (!showTimePicker) {
      
      setSelectedDate(date);
      onSelect(date);
      handleClose();
    }
  };

  const handleNext = () => {
    
    setShowTimeStep(true);
  };

  const handleBack = () => {
    
    setShowTimeStep(false);
  };

  const handleConfirm = () => {
    if (showTimePicker) {
      
      const finalDate = new Date(selectedDate);
      finalDate.setHours(selectedHour);
      finalDate.setMinutes(selectedMinute);
      onSelect(finalDate);
    } else {
      onSelect(selectedDate);
    }
    handleClose();
  };

  const changeMonth = (increment: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCurrentMonth(newMonth);
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const normalizedMinDate = minDate ? new Date(minDate) : null;
    if (normalizedMinDate) {
      normalizedMinDate.setHours(0, 0, 0, 0);
    }

    const prevMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      0,
    );
    const prevMonthDays = prevMonth.getDate();

    for (let i = 0; i < startingDay; i++) {
      const day = prevMonthDays - startingDay + i + 1;
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        day,
      );
      date.setHours(0, 0, 0, 0);

      const isDisabled = normalizedMinDate && date < normalizedMinDate;

      days.push(
        <TouchableOpacity
          key={`prev-${i}`}
          style={[styles.dayCell, isDisabled && styles.disabledDay]}
          onPress={() => !isDisabled && handleDateSelect(date)}
          activeOpacity={0.7}
          disabled={!!isDisabled}
        >
          <Text
            style={[
              styles.dayText,
              styles.inactiveDayText,
              isDisabled && styles.disabledDayText,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>,
      );
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        i,
      );
      date.setHours(0, 0, 0, 0);

      const isSelected = selectedDate.toDateString() === date.toDateString();
      const isToday = today.toDateString() === date.toDateString();
      const isDisabled = normalizedMinDate && date < normalizedMinDate;

      days.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.dayCell,
            isSelected && !isDisabled && styles.selectedDay,
            isToday && !isSelected && !isDisabled && styles.todayCell,
            isDisabled && styles.disabledDay,
          ]}
          onPress={() => !isDisabled && handleDateSelect(date)}
          activeOpacity={0.7}
          disabled={!!isDisabled}
        >
          <Text
            style={[
              styles.dayText,
              isSelected && !isDisabled && styles.selectedDayText,
              isToday && !isSelected && !isDisabled && styles.todayText,
              isDisabled && styles.disabledDayText,
            ]}
          >
            {i}
          </Text>
        </TouchableOpacity>,
      );
    }

    const totalDays = days.length;
    const remainingDays = 42 - totalDays;

    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        i,
      );
      date.setHours(0, 0, 0, 0);

      const isDisabled = normalizedMinDate && date < normalizedMinDate;

      days.push(
        <TouchableOpacity
          key={`next-${i}`}
          style={[styles.dayCell, isDisabled && styles.disabledDay]}
          onPress={() => !isDisabled && handleDateSelect(date)}
          activeOpacity={0.7}
          disabled={!!isDisabled}
        >
          <Text
            style={[
              styles.dayText,
              styles.inactiveDayText,
              isDisabled && styles.disabledDayText,
            ]}
          >
            {i}
          </Text>
        </TouchableOpacity>,
      );
    }

    return days;
  };

  const renderTimePicker = () => {
    if (!showTimePicker || !showTimeStep) return null; 

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
      <View style={styles.timePickerContainer}>
        <Text style={styles.timePickerTitle}>{t('dateSelector.hour')}</Text>
        <View style={styles.timePickerRow}>
          {}
          <View style={styles.timePickerColumn}>
            <Text style={styles.timeLabel}>{t('dateSelector.hour')}</Text>
            <ScrollView
              style={styles.timeScrollContainer}
              showsVerticalScrollIndicator={false}
            >
              {hours.map(hour => (
                <TouchableOpacity
                  key={`hour-${hour}`}
                  style={[
                    styles.timeItem,
                    selectedHour === hour && styles.selectedTimeItem,
                  ]}
                  onPress={() => setSelectedHour(hour)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.timeText,
                      selectedHour === hour && styles.selectedTimeText,
                    ]}
                  >
                    {hour.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Text style={styles.timeSeparator}>:</Text>

          {}
          <View style={styles.timePickerColumn}>
            <Text style={styles.timeLabel}>{t('dateSelector.minute')}</Text>
            <ScrollView
              style={styles.timeScrollContainer}
              showsVerticalScrollIndicator={false}
            >
              {minutes.map(minute => (
                <TouchableOpacity
                  key={`minute-${minute}`}
                  style={[
                    styles.timeItem,
                    selectedMinute === minute && styles.selectedTimeItem,
                  ]}
                  onPress={() => setSelectedMinute(minute)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.timeText,
                      selectedMinute === minute && styles.selectedTimeText,
                    ]}
                  >
                    {minute.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    );
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
          style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>
              {showTimePicker && showTimeStep
                ? t('dateSelector.selectTime')
                : t('dateSelector.selectDate')}
            </Text>
            {!showTimeStep && renderQuickDates()}
          </View>

          {}
          {!showTimeStep && (
            <View style={styles.calendarContainer}>
              <View style={styles.monthSelector}>
                <TouchableOpacity
                  onPress={() => changeMonth(-1)}
                  style={styles.monthButton}
                >
                  <ChevronLeft size={22} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.monthYear}>
                  {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </Text>
                <TouchableOpacity
                  onPress={() => changeMonth(1)}
                  style={styles.monthButton}
                >
                  <ChevronRight size={22} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.weekDaysRow}>
                {weekDays.map(day => (
                  <View key={day} style={styles.weekDayCell}>
                    <Text style={styles.weekDay}>{day}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.calendarGrid}>{renderCalendar()}</View>
            </View>
          )}

          {}
          {renderTimePicker()}

          <View style={styles.footer}>
            {showTimePicker ? (
              showTimeStep ? (
                
                <>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleBack}
                  >
                    <Text style={styles.cancelButtonText}>{t('dateSelector.back')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleConfirm}
                  >
                    <Text style={styles.confirmButtonText}>{t('dateSelector.confirm')}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                
                <>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleClose}
                  >
                    <Text style={styles.cancelButtonText}>{t('dateSelector.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleNext}
                  >
                    <Text style={styles.confirmButtonText}>{t('dateSelector.next')}</Text>
                  </TouchableOpacity>
                </>
              )
            ) : (
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>{t('dateSelector.cancel')}</Text>
              </TouchableOpacity>
            )}
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
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    gap: 14,
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  quickDatesContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  quickDateItem: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedQuickDate: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  disabledQuickDate: {
    opacity: 0.5,
    backgroundColor: '#F9FAFB',
  },
  quickDateContent: {
    alignItems: 'center',
    gap: 6,
  },
  quickIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedQuickIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  disabledQuickIcon: {
    backgroundColor: '#F3F4F6',
  },
  quickDateLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '500',
  },
  selectedQuickDateLabel: {
    color: '#FFFFFF',
  },
  disabledQuickDateLabel: {
    color: '#D1D5DB',
  },
  calendarContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthButton: {
    padding: 6,
  },
  monthYear: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekDay: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1.1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  dayText: {
    color: COLORS.text,
    fontSize: 14,
    textAlign: 'center',
    textAlignVertical: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    height: '55%',
    includeFontPadding: false,
  },
  selectedDay: {
    backgroundColor: COLORS.primary,
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  todayText: {
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  inactiveDayText: {
    color: '#C9CDD3',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  disabledDay: {
    opacity: 0.3,
  },
  disabledDayText: {
    color: '#E5E7EB',
    textDecorationLine: 'line-through',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  timePickerContainer: {
    marginTop: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timePickerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  timePickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  timeScrollContainer: {
    maxHeight: 120,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timeItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedTimeItem: {
    backgroundColor: COLORS.primary + '15',
  },
  timeText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  selectedTimeText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 20,
  },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default DateSheet;
