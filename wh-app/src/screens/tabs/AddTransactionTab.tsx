import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {COLORS, SIZES} from '../../constants/theme';

const AddTransactionTab = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Transaction</Text>
      <Text style={styles.subtitle}>Create a new transaction</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: SIZES.fontXXL,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: SIZES.fontMedium,
    color: COLORS.textSecondary,
  },
});

export default AddTransactionTab;

