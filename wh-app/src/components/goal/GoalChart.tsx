import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants/theme';
import { PanelBottomClose, Wallet } from 'lucide-react-native';
import CategoryIcon from '../common/CategoryIcon';
import { Goal } from '../../services/goalService';

interface GoalChartItem {
  id: number | string;
  icon: string;
  color: string;
  currentValue: number;
  goalValue: number;
  isTotal?: boolean;
  isOthers?: boolean;
  goal?: Goal;
}

interface GoalChartProps {
  goals: Goal[];
  totalBalance: number;
  onItemPress?: (item: GoalChartItem) => void;
  selectedItemId?: number | string | null;
}

const getProgressValue = (item: GoalChartItem) => {
  if (item.isTotal) return 1; 

  const MAX_HEIGHT = 0.8;
  
  const MIN_HEIGHT = 0.18;

  if (item.isOthers) {
    
    if (item.goalValue === 0) return MIN_HEIGHT;
    const progress = item.currentValue / item.goalValue;
    
    return Math.max(progress * MAX_HEIGHT, MIN_HEIGHT);
  }

  if (item.goalValue === 0) return MIN_HEIGHT;
  const progress = item.currentValue / item.goalValue;
  
  return Math.max(progress * MAX_HEIGHT, MIN_HEIGHT);
};

const GoalChart: React.FC<GoalChartProps> = ({
  goals,
  totalBalance,
  onItemPress,
  selectedItemId,
}) => {
  
  const goalsWithPercentage = goals.map(goal => ({
    goal,
    percentage:
      goal.amount_goal > 0
        ? ((goal.amount_saved ?? 0) / goal.amount_goal) * 100
        : 0,
  }));

  const sortedGoals = [...goalsWithPercentage].sort(
    (a, b) => b.percentage - a.percentage,
  );

  const top3Goals = sortedGoals.slice(0, 3).map(item => item.goal);
  const remainingGoals = sortedGoals.slice(3).map(item => item.goal);

  const shouldShowOutros = goals.length > 4;
  const fourthGoal = goals.length === 4 ? remainingGoals[0] : null;
  const outrosGoals = shouldShowOutros ? remainingGoals : [];

  const outrosTotal = outrosGoals.reduce(
    (sum, goal) => sum + (goal.amount_saved ?? 0),
    0,
  );
  const outrosGoal = outrosGoals.reduce(
    (sum, goal) => sum + goal.amount_goal,
    0,
  );

  const chartData: GoalChartItem[] = [];

  chartData.push({
    id: 'balance',
    icon: 'Wallet',
    color: '#1A1C1E',
    currentValue: totalBalance,
    goalValue: totalBalance,
    isTotal: true,
  });

  top3Goals.forEach((goal, index) => {
    const defaultColors = ['#F28C33', '#52B445', '#536DFE'];
    const defaultIcons = ['Target', 'PiggyBank', 'TrendingUp'];

    let icon = goal.category?.icon || defaultIcons[index] || 'Target';
    if (icon && !icon.match(/^[A-Z]/)) {
      
      icon = icon.charAt(0).toUpperCase() + icon.slice(1);
    }
    const color = goal.category?.color || defaultColors[index];

    chartData.push({
      id: goal.id!,
      icon: icon,
      color: color,
      currentValue: goal.amount_saved ?? 0,
      goalValue: goal.amount_goal,
      goal: goal,
    });
  });

  if (fourthGoal) {
    
    const defaultColors = ['#F28C33', '#52B445', '#536DFE', '#812344'];
    const defaultIcons = ['Target', 'PiggyBank', 'TrendingUp', 'Grid3X3'];

    let icon = fourthGoal.category?.icon || defaultIcons[3] || 'Target';
    if (icon && !icon.match(/^[A-Z]/)) {
      icon = icon.charAt(0).toUpperCase() + icon.slice(1);
    }
    const color = fourthGoal.category?.color || defaultColors[3];

    chartData.push({
      id: fourthGoal.id!,
      icon: icon,
      color: color,
      currentValue: fourthGoal.amount_saved ?? 0,
      goalValue: fourthGoal.amount_goal,
      goal: fourthGoal,
    });
  } else if (shouldShowOutros && outrosGoals.length > 0) {
    
    chartData.push({
      id: 'outros',
      icon: 'Grid3X3',
      color: '#812344',
      currentValue: outrosTotal,
      goalValue: outrosGoal,
      isOthers: true,
      goal: undefined,
    });
  }

  const goalBars = chartData.filter(item => !item.isTotal);
  const maxGoalBarHeight = Math.max(
    ...goalBars.map(item => {
      const progress = getProgressValue(item);
      return progress * 240;
    }),
    0,
  );

  const dashedLineTop = 223 - maxGoalBarHeight;

  const formatCurrency = (amount: number, goal?: Goal): string => {
    const formatted = amount.toFixed(2);
    const [integer, decimal] = formatted.split('.');
    const integerWithDots = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    const symbol = goal?.currency_info?.symbol || '€';
    return `${symbol}${integerWithDots},${decimal}`;
  };

  const renderChartBars = (
    item: GoalChartItem,
    i: number,
  ): React.ReactElement => {
    const progress = getProgressValue(item);
    const barHeight = progress * 240;
    const isSelected = selectedItemId === item.id;
    const spacerHeight = 0;

    const barContent = (
      <View style={styles.barWrapper}>
        <View
          style={[
            styles.chartBar,
            {
              height: barHeight,
              backgroundColor: item.color,
              shadowColor: item.color,
            },
            isSelected && {
              shadowOffset: {
                width: 0,
                height: 0,
              },
              shadowOpacity: 0.6,
              shadowRadius: 8,
            },
          ]}
        >
          <View
            style={[
              styles.chartBarIcon,
              !item.isTotal &&
                !item.isOthers && {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
            ]}
          >
            {item.isTotal ? (
              <Wallet size={18} color="#FFFFFF" />
            ) : (
              <CategoryIcon iconName={item.icon} size={18} color="#FFFFFF" />
            )}
          </View>
        </View>
        <View style={[styles.barSpacer, { height: spacerHeight }]} />
      </View>
    );

    if (onItemPress) {
      return (
        <TouchableOpacity
          style={styles.chartBarContainer}
          key={item.id}
          onPress={() => onItemPress(item)}
          activeOpacity={0.7}
        >
          {barContent}
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.chartBarContainer} key={item.id}>
        {barContent}
      </View>
    );
  };

  const totalItem = chartData.find(item => item.isTotal);

  return (
    <View style={styles.goalChartContainer}>
      <View style={[styles.dashedLine, { top: dashedLineTop }]} />

      {}
      {totalItem && (
        <View style={styles.balanceBadgeWrapper}>
          <View style={styles.balanceBadge}>
            <View style={styles.balanceBadgeTriangle} />
            <Text style={styles.balanceBadgeText}>
              {formatCurrency(totalItem.currentValue)}
            </Text>
          </View>
          <Text style={styles.balanceBadgeLabel}>Saldo Atual</Text>
        </View>
      )}

      <View style={styles.innerGoalChartItems}>
        {chartData.map((item, i) => (
          <View key={item.id} style={styles.barWithDivider}>
            {renderChartBars(item, i)}
            {i < chartData.length - 1 && (
              <View style={styles.verticalDivider} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  goalChartContainer: {
    marginVertical: 20,
    height: 240,
    padding: 15,
    overflow: 'visible',
  },
  innerGoalChartItems: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    height: '100%',
    overflow: 'visible',
    gap: 12,
  },
  chartBarContainer: {
    alignItems: 'center',
    width: 42,
  },
  barWithDivider: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  chartBar: {
    backgroundColor: '#121212',
    width: 42,
    borderRadius: 14,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 20,
  },
  chartBarIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 9,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barSpacer: {
    width: '100%',
  },
  verticalDivider: {
    width: 2,
    height: 30,
    backgroundColor: '#E5E7EB',
    top: 0,
    marginLeft: 13.3,
    marginRight: 3.3,
    borderRadius: 1,
  },
  outrosLabel: {
    marginTop: 4,
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  dashedLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0.7,
    borderStyle: 'dashed',
    borderWidth: 1,
    backgroundColor: '#121212',
    borderColor: 'white',
    borderRadius: 1,
  },
  balanceBadgeWrapper: {
    alignItems: 'flex-start',
    position: 'absolute',
    left: 70,
    top: -25,
    zIndex: 2,
  },
  balanceBadge: {
    backgroundColor: '#1A1C1E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceBadgeTriangle: {
    position: 'absolute',
    left: -6,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 0,
    borderTopColor: 'transparent',
    borderRightColor: '#1A1C1E',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  balanceBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  balanceBadgeLabel: {
    color: 'gray',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '400',
  },
});

export default GoalChart;
