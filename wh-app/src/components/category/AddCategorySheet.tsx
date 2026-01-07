import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Search } from 'lucide-react-native';
import * as LucideIcons from 'lucide-react-native';
import { COLORS } from '../../constants/theme';
import { useTranslation } from '../../hooks/useTranslation';

interface AddCategorySheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (name: string, icon: string, color: string) => void;
  editingCategory?: { name: string; icon: string; color: string } | null;
}

const iconCategories: Record<string, string[]> = {
  'Finance & Money': [
    'Wallet',
    'CreditCard',
    'Banknote',
    'Receipt',
    'TrendingUp',
    'TrendingDown',
    'BarChart3',
    'PieChart',
    'DollarSign',
    'Euro',
    'Coins',
    'PiggyBank',
  ],
  'Food & Drinks': [
    'UtensilsCrossed',
    'Coffee',
    'Beer',
    'Wine',
    'Pizza',
    'IceCream',
    'Apple',
    'Beef',
    'Cake',
    'Cookie',
    'Salad',
    'Soup',
  ],
  'Shopping & Retail': [
    'ShoppingCart',
    'ShoppingBag',
    'ShoppingBasket',
    'Gift',
    'Tag',
    'Tags',
    'Shirt',
    'Store',
    'Package',
    'Gem',
    'Watch',
    'Glasses',
  ],
  'Transportation': [
    'Car',
    'Bus',
    'Train',
    'Plane',
    'Bike',
    'Ship',
    'Fuel',
    'ParkingCircle',
    'CarTaxiFront',
    'Truck',
    'Ambulance',
    'Rocket',
  ],
  'Home & Living': [
    'Home',
    'Bed',
    'Tv',
    'Monitor',
    'Hammer',
    'Lightbulb',
    'Droplets',
    'Sofa',
    'Bath',
    'Key',
    'DoorOpen',
    'Armchair',
  ],
  'Health & Fitness': [
    'Heart',
    'Dumbbell',
    'Activity',
    'Pill',
    'Stethoscope',
    'Syringe',
    'Brain',
    'Eye',
    'Footprints',
    'HeartPulse',
    'Hospital',
  ],
  'Education': [
    'GraduationCap',
    'BookOpen',
    'Book',
    'Pencil',
    'FileText',
    'Library',
    'School',
    'Backpack',
    'Calculator',
    'Ruler',
    'Languages',
    'Award',
  ],
  'Entertainment': [
    'Film',
    'Gamepad2',
    'Music',
    'Headphones',
    'Ticket',
    'Tv2',
    'Camera',
    'Clapperboard',
    'Mic',
    'Radio',
  ],
  'Technology': [
    'Smartphone',
    'Laptop',
    'Cpu',
    'Wifi',
    'Bluetooth',
    'Monitor',
    'Tablet',
    'Printer',
    'HardDrive',
    'Server',
    'Cloud',
  ],
  'Sports & Travel': [
    'Trophy',
    'Medal',
    'Target',
    'Timer',
    'Flag',
    'Mountain',
    'Tent',
    'Sailboat',
    'Map',
    'Compass',
    'Globe',
    'Luggage',
  ],
  'Utilities': [
    'Wrench',
    'Settings',
    'Phone',
    'Mail',
    'Zap',
    'Flame',
    'Droplet',
    'Wind',
    'Trash2',
    'Recycle',
    'Shield',
  ],
  'Others': [
    'Grid3X3',
    'LayoutGrid',
    'List',
    'Folder',
    'Star',
    'Bookmark',
    'Bell',
    'Calendar',
    'Clock',
    'CircleDot',
  ],
};

const colorPalette = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#64748B',
];

const IconButton = React.memo(({ 
  iconName, 
  isSelected, 
  selectedColor, 
  onPress 
}: { 
  iconName: string; 
  isSelected: boolean; 
  selectedColor: string;
  onPress: () => void;
}) => {
  const IconComponent = (LucideIcons as any)[iconName];
  const icon = IconComponent ? (
    <IconComponent 
      size={20} 
      color={isSelected ? selectedColor : COLORS.textSecondary} 
      strokeWidth={2} 
    />
  ) : (
    <LucideIcons.CircleDot 
      size={20} 
      color={isSelected ? selectedColor : COLORS.textSecondary} 
      strokeWidth={2} 
    />
  );

  return (
    <TouchableOpacity
      style={[
        styles.iconButton,
        isSelected && [styles.selectedIcon, { borderColor: selectedColor }],
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon}
    </TouchableOpacity>
  );
});

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const AddCategorySheet: React.FC<AddCategorySheetProps> = ({
  isVisible,
  onClose,
  onSave,
  editingCategory,
}) => {
  const { t } = useTranslation();
  const [categoryName, setCategoryName] = React.useState('');
  const [selectedIcon, setSelectedIcon] = React.useState('Grid3X3');
  const [selectedColor, setSelectedColor] = React.useState('#3B82F6');
  const [searchQuery, setSearchQuery] = React.useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (isVisible) {
      if (editingCategory) {
        setCategoryName(editingCategory.name);
        setSelectedIcon(editingCategory.icon);
        setSelectedColor(editingCategory.color || '#3B82F6');
      } else {
        setCategoryName('');
        setSelectedIcon('Grid3X3');
        setSelectedColor('#3B82F6');
      }
      setSearchQuery('');

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
      
      fadeAnim.setValue(0);
      slideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [isVisible, editingCategory]);

  const handleClose = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [onClose]);

  const handleSave = useCallback(() => {
    if (categoryName.trim()) {
      onSave(categoryName.trim(), selectedIcon, selectedColor);
      handleClose();
    }
  }, [categoryName, selectedIcon, selectedColor, onSave, handleClose]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return iconCategories;

    const filtered: Record<string, string[]> = {};
    Object.entries(iconCategories).forEach(([category, icons]) => {
      const filteredIcons = icons.filter(icon =>
        icon.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      if (filteredIcons.length > 0) {
        filtered[category] = filteredIcons;
      }
    });
    return filtered;
  }, [searchQuery]);

  const iconPreview = useMemo(() => {
    const IconComponent = (LucideIcons as any)[selectedIcon];
    if (IconComponent) {
      return <IconComponent size={20} color={selectedColor} strokeWidth={2} />;
    }
    return <LucideIcons.CircleDot size={20} color={selectedColor} strokeWidth={2} />;
  }, [selectedIcon, selectedColor]);

  const handleIconSelect = useCallback((icon: string) => {
    setSelectedIcon(icon);
  }, []);

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
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>
              {editingCategory ? t('categorySheet.editCategory') : t('categorySheet.newCategory')}
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <View style={[styles.iconPreview, { backgroundColor: selectedColor + '15' }]}>
              {iconPreview}
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('categorySheet.categoryNamePlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              value={categoryName}
              onChangeText={setCategoryName}
            />
          </View>

          {}
          <Text style={styles.sectionLabel}>{t('categorySheet.color')}</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.colorScrollView}
            contentContainerStyle={styles.colorContainer}
          >
            {colorPalette.map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorButton,
                  { backgroundColor: color },
                  selectedColor === color && styles.selectedColorButton,
                ]}
                onPress={() => setSelectedColor(color)}
                activeOpacity={0.7}
              />
            ))}
          </ScrollView>

          <View style={styles.searchContainer}>
            <Search size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('categorySheet.searchIcons')}
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView
            style={styles.iconScrollView}
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(filteredCategories).map(([category, icons]) => (
              <View key={category} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{category}</Text>
                <View style={styles.iconsGrid}>
                  {icons.map(icon => (
                    <IconButton
                      key={icon}
                      iconName={icon}
                      isSelected={selectedIcon === icon}
                      selectedColor={selectedColor}
                      onPress={() => handleIconSelect(icon)}
                    />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>{t('categorySheet.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: selectedColor }]} 
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>{t('categorySheet.save')}</Text>
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
    marginBottom: 12,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 48,
    marginBottom: 16,
  },
  iconPreview: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    padding: 0,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  colorScrollView: {
    marginBottom: 12,
    maxHeight: 36,
  },
  colorContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  colorButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  selectedColorButton: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    padding: 0,
  },
  iconScrollView: {
    height: 280,
  },
  categorySection: {
    marginBottom: 14,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  selectedIcon: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AddCategorySheet;
