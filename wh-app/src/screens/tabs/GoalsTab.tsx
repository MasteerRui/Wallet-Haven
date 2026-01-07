import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../../constants/theme';
import CategoryIcon from '../../components/common/CategoryIcon';
import { ChevronRight, Plus } from 'lucide-react-native';
import GoalChart from '../../components/goal/GoalChart';
import goalService, { Goal } from '../../services/goalService';
import AddGoalSheet from '../../components/goal/AddGoalSheet';
import GoalDetailSheet from '../../components/goal/GoalDetailSheet';
import walletService from '../../services/walletService';
import PullToRefresh from '../../components/common/PullToRefresh';
import GoalSkeleton from '../../components/common/GoalSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { useTranslation } from '../../hooks/useTranslation';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GoalsTab = () => {
  const { t } = useTranslation();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [detailSheetVisible, setDetailSheetVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [totalBalance, setTotalBalance] = useState(0);
  const [selectedChartItem, setSelectedChartItem] = useState<
    number | string | null
  >(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [statusBarStyle, setStatusBarStyle] = useState<
    'light-content' | 'dark-content'
  >('dark-content');

  const hasLoadedInitially = React.useRef(false);

  const scrollY = React.useRef(new Animated.Value(0)).current;
  const miniHeaderOpacity = scrollY.interpolate({
    inputRange: [0, 60, 100],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  const miniHeaderTranslateY = scrollY.interpolate({
    inputRange: [0, 60, 100],
    outputRange: [-50, -50, 0],
    extrapolate: 'clamp',
  });

  const sortGoalsByPercentage = (goalsToSort: Goal[]): Goal[] => {
    return [...goalsToSort].sort((a, b) => {
      const percentageA =
        a.amount_goal > 0 ? ((a.amount_saved ?? 0) / a.amount_goal) * 100 : 0;
      const percentageB =
        b.amount_goal > 0 ? ((b.amount_saved ?? 0) / b.amount_goal) * 100 : 0;
      return percentageB - percentageA; 
    });
  };

  const fetchGoals = async (silent: boolean = false) => {
    
    const isInitialLoad = goals.length === 0 && !silent;

    if (isInitialLoad) {
      setLoading(true);
    }

    try {
      const res = await goalService.getGoals();
      if (res.success && res.data?.goals) {
        
        const sortedGoals = sortGoalsByPercentage(res.data.goals);
        setGoals(sortedGoals);
        setFilteredGoals(sortedGoals);
      } else {
        console.error('[GoalsTab] Failed to fetch goals:', res.message);
        setGoals([]);
        setFilteredGoals([]);
      }
    } catch (error) {
      console.error('[GoalsTab] Error fetching goals:', error);
      setGoals([]);
      setFilteredGoals([]);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  const loadCurrentWalletBalance = async () => {
    try {
      
      const savedWalletId = await walletService.getSavedWalletId();

      if (savedWalletId) {
        const walletIdNum = parseInt(savedWalletId);
        if (!isNaN(walletIdNum)) {
          
          const walletRes = await walletService.getWalletById(walletIdNum);
          if (walletRes.success && walletRes.data) {
            setTotalBalance(walletRes.data.balance || 0);
            return;
          }
        }
      }

      const walletsRes = await walletService.getWallets();
      if (
        walletsRes.success &&
        walletsRes.data?.wallets &&
        walletsRes.data.wallets.length > 0
      ) {
        setTotalBalance(walletsRes.data.wallets[0].balance || 0);
      } else {
        setTotalBalance(0);
      }
    } catch (error) {
      console.error('[GoalsTab] Error loading wallet balance:', error);
      setTotalBalance(0);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      
      setStatusBarStyle('dark-content');

      const isSilent = hasLoadedInitially.current;

      loadCurrentWalletBalance();
      fetchGoals(isSilent); 

      hasLoadedInitially.current = true;
    }, []),
  );

  const handleChartItemPress = (item: any) => {
    
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });

    if (item.id === 'balance') {
      
      setFilteredGoals(sortGoalsByPercentage(goals));
      setSelectedChartItem(null);
    } else if (item.id === 'outros') {
      
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
      const top3GoalIds = sortedGoals.slice(0, 3).map(item => item.goal.id);
      const outrosGoals = goals.filter(goal => !top3GoalIds.includes(goal.id));
      setFilteredGoals(sortGoalsByPercentage(outrosGoals));
      setSelectedChartItem('outros');
    } else {
      
      const selectedGoal = goals.find(g => g.id === item.id);
      if (selectedGoal) {
        setFilteredGoals([selectedGoal]);
        setSelectedChartItem(item.id);
      }
    }
  };

  const formatCurrency = (amount: number, goal?: Goal): string => {
    
    const formatted = amount.toFixed(2);
    const [integer, decimal] = formatted.split('.');
    const integerWithDots = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    const symbol = goal?.currency_info?.symbol || '€';
    return `${symbol}${integerWithDots},${decimal}`;
  };

  const calculateDaysRemaining = (endDate?: string): string => {
    if (!endDate) return '-';

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); 

      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0); 

      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return 'Concluído';
      } else if (diffDays === 0) {
        return 'Hoje';
      } else if (diffDays === 1) {
        return '1 dia restante';
      } else {
        return `${diffDays} dias restantes`;
      }
    } catch (error) {
      console.error('Error calculating days remaining:', error);
      return '-';
    }
  };

  const handleGoalPress = (goal: Goal) => {
    setSelectedGoal(goal);
    setDetailSheetVisible(true);
  };

  const renderContainerGoals = (goal: Goal) => {
    const daysRemaining = calculateDaysRemaining(goal.end_date);
    const categoryIcon = goal.category?.icon || 'Target';
    const categoryColor = goal.category?.color || COLORS.primary;

    return (
      <TouchableOpacity
        style={styles.containerGoal}
        key={goal.id}
        onPress={() => handleGoalPress(goal)}
        activeOpacity={0.7}
      >
        <View style={styles.innerContainerGoal}>
          <View style={styles.nameIconContainer}>
            <View
              style={[
                styles.listIconContainer,
                { backgroundColor: categoryColor + '15' },
              ]}
            >
              <CategoryIcon
                iconName={categoryIcon}
                size={18}
                color={categoryColor}
              />
            </View>
            <Text style={styles.listNameGoal}>{goal.name}</Text>
          </View>
          <View style={styles.arrowGoalContainer}>
            <ChevronRight size={18} />
          </View>
        </View>
        <View style={styles.moreInfoContainer}>
          <View style={styles.textInfoContainer}>
            <Text>{formatCurrency(goal.amount_saved ?? 0, goal)}</Text>
            <Text>{formatCurrency(goal.amount_goal, goal)}</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progress,
                {
                  width: `${Math.round(
                    ((goal.amount_saved ?? 0) / goal.amount_goal) * 100,
                  )}%`,
                  backgroundColor: categoryColor,
                },
              ]}
            ></View>
          </View>
          <View style={styles.textInfoContainer}>
            <Text>{daysRemaining}</Text>
            <Text>
              {Math.round(((goal.amount_saved ?? 0) / goal.amount_goal) * 100)}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleRefresh = async () => {
    await Promise.all([loadCurrentWalletBalance(), fetchGoals()]);
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setScrollOffset(offsetY);
    scrollY.setValue(offsetY);
  };

  const handlePullStateChange = (isPulling: boolean) => {
    if (isPulling) {
      setStatusBarStyle('light-content');
    } else {
      setStatusBarStyle('dark-content');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle={statusBarStyle} animated={true} />
      {}
      <Animated.View
        style={[
          styles.miniHeader,
          {
            opacity: miniHeaderOpacity,
            transform: [{ translateY: miniHeaderTranslateY }],
          },
        ]}
      >
        <Text style={styles.miniHeaderTitle}>Goals</Text>
        <TouchableOpacity
          style={styles.miniHeaderButton}
          onPress={() => setAddSheetVisible(true)}
          activeOpacity={0.7}
        >
          <Plus size={18} color={'#fff'} />
        </TouchableOpacity>
      </Animated.View>

      <PullToRefresh
        onRefresh={handleRefresh}
        pullThreshold={40}
        primaryColor={COLORS.primary}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onPullStateChange={handlePullStateChange}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Goals</Text>
          <TouchableOpacity
            style={styles.addGoalButton}
            onPress={() => setAddSheetVisible(true)}
          >
            <View style={styles.addGoalIconContainer}>
              <Plus size={18} color={'#fff'} />
            </View>
            <Text style={styles.addGoalButtonText}>{t('goals.addGoal')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.chartContainer}>
          <GoalChart
            goals={goals}
            totalBalance={totalBalance}
            onItemPress={handleChartItemPress}
            selectedItemId={selectedChartItem}
          />
        </View>
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            {selectedChartItem === null
              ? t('goals.allMyGoals')
              : selectedChartItem === 'outros'
              ? t('goals.otherGoals')
              : t('goals.selectedGoal')}
          </Text>
          {loading ? (
            <>
              <GoalSkeleton />
              <GoalSkeleton />
              <GoalSkeleton />
            </>
          ) : filteredGoals.length > 0 ? (
            filteredGoals.map(renderContainerGoals)
          ) : (
            <EmptyState
              icon="Target"
              title={t('goals.noGoalsYet')}
              subtitle={t('goals.noGoalsSubtitle')}
            />
          )}
        </View>

        <View style={{ height: 130 }} />
      </PullToRefresh>

      <AddGoalSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
        onGoalAdded={fetchGoals}
      />
      <GoalDetailSheet
        isVisible={detailSheetVisible}
        onClose={() => {
          setDetailSheetVisible(false);
          
          setTimeout(() => {
            setSelectedGoal(null);
          }, 300);
        }}
        goal={selectedGoal}
        onGoalUpdated={() => {
          
          fetchGoals();
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    paddingHorizontal: SIZES.padding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
    marginTop: 10,
  },
  addGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  addGoalIconContainer: {
    backgroundColor: '#121212',
    borderRadius: 999,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  addGoalButtonText: {
    fontWeight: '600',
    fontSize: 16,
    color: '#121212',
  },
  miniHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 110,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
    zIndex: 100,
  },
  miniHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#121212',
  },
  miniHeaderButton: {
    backgroundColor: '#121212',
    borderRadius: 999,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionContainer: {
    paddingHorizontal: SIZES.padding,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: SIZES.fontMedium,
    fontWeight: 600,
  },
  containerGoal: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 11,
    marginTop: 14,
  },
  innerContainerGoal: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameIconContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: '10',
  },
  listIconContainer: {
    backgroundColor: COLORS.background,
    padding: 10,
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  listNameGoal: {
    fontSize: SIZES.fontMedium,
    fontWeight: 400,
  },
  arrowGoalContainer: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    width: 36,
    borderRadius: 10,
  },
  moreInfoContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    marginTop: 10,
    borderRadius: 16,
    padding: 14,
  },
  textInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressBar: {
    marginVertical: 7,
    backgroundColor: COLORS.backgroundSecondary,
    height: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 100,
  },
  chartContainer: {
    paddingHorizontal: SIZES.padding,
  },
});

export default GoalsTab;
