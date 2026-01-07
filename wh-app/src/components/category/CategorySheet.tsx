import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
  PanResponder,
} from 'react-native';
import { Search, Plus, Check, Pencil, Trash2, X } from 'lucide-react-native';
import * as LucideIcons from 'lucide-react-native';
import AddCategorySheet from './AddCategorySheet';
import { COLORS } from '../../constants/theme';
import { useToast } from '../../hooks/useToast';
import { useTranslation } from '../../hooks/useTranslation';
import { API_ENDPOINTS } from '../../constants/config';
import apiService from '../../services/apiService';

interface CategorySheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (category: Category) => void;
  selectedCategoryId?: number | null;
  type?: 'expense' | 'income';
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  type?: 'expense' | 'income';
  is_global?: boolean;
}

const SwipeableCategoryItem = ({
  category,
  isSelected,
  isGlobal,
  onPress,
  onEdit,
  onDelete,
  renderIcon,
  onSwipeOpen,
  isOpen,
}: {
  category: Category;
  isSelected: boolean;
  isGlobal: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  renderIcon: (iconName: string, size: number, color: string) => React.ReactNode;
  onSwipeOpen: (id: number | null) => void;
  isOpen: boolean;
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const ACTION_WIDTH = 80; 

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        
        if (isGlobal) return false;
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderGrant: () => {
        
        onSwipeOpen(null);
      },
      onPanResponderMove: (_, gestureState) => {
        
        const newValue = Math.min(0, Math.max(-ACTION_WIDTH, gestureState.dx));
        translateX.setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        
        if (gestureState.dx < -ACTION_WIDTH / 2) {
          Animated.spring(translateX, {
            toValue: -ACTION_WIDTH,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
          onSwipeOpen(category.id);
        } else {
          
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
          onSwipeOpen(null);
        }
      },
    })
  ).current;

  useEffect(() => {
    if (!isOpen) {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
    }
  }, [isOpen, translateX]);

  const handlePress = () => {
    if (isOpen) {
      
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
      onSwipeOpen(null);
    } else {
      onPress();
    }
  };

  return (
    <View style={styles.swipeableContainer}>
      {}
      {!isGlobal && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.swipeAction, styles.editAction]}
            onPress={() => {
              onSwipeOpen(null);
              onEdit();
            }}
          >
            <Pencil size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.swipeAction, styles.deleteAction]}
            onPress={() => {
              onSwipeOpen(null);
              onDelete();
            }}
          >
            <Trash2 size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {}
      <Animated.View
        style={[
          styles.categoryItemWrapper,
          { transform: [{ translateX }] },
        ]}
        {...(isGlobal ? {} : panResponder.panHandlers)}
      >
        <TouchableOpacity
          style={[
            styles.categoryItem,
            isSelected && styles.selectedCategory,
          ]}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <View style={styles.categoryInfo}>
            <View style={[styles.iconContainer, { backgroundColor: category.color + '12' }]}>
              {renderIcon(category.icon, 20, category.color)}
            </View>
            <Text style={[styles.categoryName, isSelected && { color: category.color }]} numberOfLines={1}>
              {category.name}
            </Text>
          </View>
          {isSelected && (
            <Check size={20} color={category.color} strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const CategorySkeleton: React.FC = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const shimmerStyle = {
    opacity: shimmerAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.6, 1, 0.6],
    }),
  };

  return (
    <Animated.View style={[{ flex: 1 }, shimmerStyle]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <View key={index} style={styles.skeletonItem}>
            <View style={styles.skeletonIcon} />
            <View style={styles.skeletonText} />
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const CategorySheet: React.FC<CategorySheetProps> = ({
  isVisible,
  onClose,
  onSelect,
  selectedCategoryId,
  type = 'expense',
}) => {
  const { showSuccess, showError } = useToast();
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(selectedCategoryId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [openSwipeId, setOpenSwipeId] = useState<number | null>(null);

  useEffect(() => {
    if (isVisible) {
      loadCategories();
      setSelectedCategory(selectedCategoryId || null);
      setOpenSwipeId(null);
    }
  }, [isVisible, selectedCategoryId]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(API_ENDPOINTS.categories.list);
      
      if (response.success && response.data?.categories) {
        setCategories(response.data.categories);
      } else if (response.needsLogin) {
        
        showError('Session expired. Please sign in again.');
        onClose();
      } else {
        setCategories(getDefaultCategories());
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories(getDefaultCategories());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultCategories = (): Category[] => [
    { id: 1, name: 'Alimentação', icon: 'UtensilsCrossed', color: '#F97316', is_global: true },
    { id: 2, name: 'Compras', icon: 'ShoppingCart', color: '#8B5CF6', is_global: true },
    { id: 3, name: 'Transporte', icon: 'Car', color: '#3B82F6', is_global: true },
    { id: 4, name: 'Contas', icon: 'FileText', color: '#EF4444', is_global: true },
    { id: 5, name: 'Entretenimento', icon: 'Film', color: '#EC4899', is_global: true },
    { id: 6, name: 'Saúde', icon: 'Heart', color: '#22C55E', is_global: true },
    { id: 7, name: 'Educação', icon: 'GraduationCap', color: '#06B6D4', is_global: true },
    { id: 8, name: 'Viagens', icon: 'Plane', color: '#F59E0B', is_global: true },
    { id: 9, name: 'Casa', icon: 'Home', color: '#84CC16', is_global: true },
    { id: 10, name: 'Outros', icon: 'Grid3X3', color: '#64748B', is_global: true },
  ];

  const handleCategorySelect = useCallback((category: Category) => {
    setSelectedCategory(category.id);
    onSelect(category);
    onClose();
  }, [onSelect, onClose]);

  const handleEditCategory = useCallback((category: Category) => {
    setEditingCategory(category);
    setShowAddSheet(true);
  }, []);

  const handleDeleteCategory = useCallback(async (categoryId: number) => {
    try {
      const response = await apiService.delete(API_ENDPOINTS.categories.delete(categoryId));
      if (response.success) {
        setCategories(prev => prev.filter(cat => cat.id !== categoryId));
        showSuccess('Category deleted successfully');
      } else if (response.needsLogin) {
        showError('Session expired. Please sign in again.');
        onClose();
      } else {
        showError(response.message || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      showError('Error deleting category');
    }
  }, [onClose, showSuccess, showError]);

  const handleSaveCategory = useCallback(async (name: string, icon: string, color: string) => {
    try {
      if (editingCategory) {
        const response = await apiService.put(
          API_ENDPOINTS.categories.update(editingCategory.id),
          { name, icon, color }
        );
        
        if (response.success) {
          const updatedCategory = response.data?.category || { ...editingCategory, name, icon, color };
          setCategories(prev =>
            prev.map(cat =>
              cat.id === editingCategory.id ? updatedCategory : cat,
            ),
          );
          onSelect(updatedCategory);
        } else if (response.needsLogin) {
          Alert.alert('Sessão expirada', 'Por favor, inicia sessão novamente.');
          onClose();
        } else {
          Alert.alert('Erro', response.message || 'Não foi possível atualizar a categoria');
        }
      } else {
        const response = await apiService.post(
          API_ENDPOINTS.categories.create,
          { name, icon, color }
        );
        
        if (response.success && response.data?.category) {
          const newCategory = response.data.category;
          setCategories(prev => [...prev, newCategory]);
          setSelectedCategory(newCategory.id);
          onSelect(newCategory);
        } else if (response.needsLogin) {
          showError('Session expired. Please sign in again.');
          onClose();
        } else {
          showError(response.message || 'Failed to create category');
        }
      }
    } catch (error) {
      console.error('Error saving category:', error);
      showError('Failed to save category');
    }
    
    setEditingCategory(null);
  }, [editingCategory, onSelect, onClose, showSuccess, showError]);

  const renderIcon = useCallback((iconName: string, size: number, color: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (IconComponent) {
      return <IconComponent size={size} color={color} strokeWidth={2} />;
    }
    return <LucideIcons.CircleDot size={size} color={color} strokeWidth={2} />;
  }, []);

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.handle} />
        
        <View style={styles.header}>
          <Text style={styles.title}>{t('categorySheet.title')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Search size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('categorySheet.searchPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setShowAddSheet(true);
              setEditingCategory(null);
            }}
            activeOpacity={0.7}
          >
            <Plus size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <CategorySkeleton />
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {filteredCategories.map(category => (
              <SwipeableCategoryItem
                key={category.id}
                category={category}
                isSelected={selectedCategory === category.id}
                isGlobal={category.is_global === true}
                onPress={() => handleCategorySelect(category)}
                onEdit={() => handleEditCategory(category)}
                onDelete={() => handleDeleteCategory(category.id)}
                renderIcon={renderIcon}
                onSwipeOpen={setOpenSwipeId}
                isOpen={openSwipeId === category.id}
              />
            ))}
            {filteredCategories.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('categorySheet.noCategoriesFound')}</Text>
              </View>
            ) : (
              filteredCategories.some(c => !c.is_global) && (
                <Text style={styles.hint}>{t('categorySheet.swipeToEdit')}</Text>
              )
            )}
          </ScrollView>
        )}

        <AddCategorySheet
          isVisible={showAddSheet}
          onClose={() => {
            setShowAddSheet(false);
            setEditingCategory(null);
          }}
          onSave={handleSaveCategory}
          editingCategory={editingCategory}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  swipeableContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  actionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeAction: {
    width: 40,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAction: {
    backgroundColor: '#6B7280',
  },
  deleteAction: {
    backgroundColor: '#EF4444',
  },
  categoryItemWrapper: {
    backgroundColor: COLORS.background,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedCategory: {
    
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  hint: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    marginRight: 12,
  },
  skeletonText: {
    flex: 1,
    height: 16,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
});

export default CategorySheet;
