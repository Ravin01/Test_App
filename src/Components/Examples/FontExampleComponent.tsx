/**
 * FontExampleComponent - Demonstrates proper font usage with accessibility support
 * This component shows various ways to use FontManager to prevent text disappearing
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getSafeFontStyle, FONT_STYLES, createTextStyle, FONT_FAMILIES } from '../../Utils/FontManager';
import { useAccessibility } from '../../Utils/AccessibilityUtils';

const FontExampleComponent = () => {
  const accessibilityConfig = useAccessibility();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Font Accessibility Examples</Text>
        <Text style={styles.info}>
          Bold text enabled: {accessibilityConfig.isBoldTextEnabled ? 'Yes' : 'No'}
        </Text>
      </View>

      {/* Method 1: Using getSafeFontStyle */}
      <View style={styles.section}>
        <Text style={styles.methodTitle}>Method 1: getSafeFontStyle()</Text>
        <Text style={styles.regularText}>Regular text using getSafeFontStyle</Text>
        <Text style={styles.boldText}>Bold text using getSafeFontStyle</Text>
        <Text style={styles.mediumText}>Medium weight using getSafeFontStyle</Text>
      </View>

      {/* Method 2: Using FONT_STYLES constants */}
      <View style={styles.section}>
        <Text style={styles.methodTitle}>Method 2: FONT_STYLES constants</Text>
        <Text style={styles.regularConstant}>Regular using FONT_STYLES.regular</Text>
        <Text style={styles.boldConstant}>Bold using FONT_STYLES.bold</Text>
      </View>

      {/* Method 3: Using createTextStyle helper */}
      <View style={styles.section}>
        <Text style={styles.methodTitle}>Method 3: createTextStyle()</Text>
        <Text style={styles.titleCreated}>Title created with createTextStyle</Text>
        <Text style={styles.bodyCreated}>Body created with createTextStyle</Text>
        <Text style={styles.captionCreated}>Caption created with createTextStyle</Text>
      </View>

      {/* Method 4: Direct font family usage */}
      <View style={styles.section}>
        <Text style={styles.methodTitle}>Method 4: Direct FONT_FAMILIES</Text>
        <Text style={styles.directRegular}>Direct regular font family</Text>
        <Text style={styles.directBold}>Direct bold font family</Text>
      </View>

      {/* Real-world examples */}
      <View style={styles.section}>
        <Text style={styles.methodTitle}>Real-World Examples</Text>
        
        {/* Button example */}
        <View style={styles.button}>
          <Text style={styles.buttonText}>Button with Safe Font</Text>
        </View>

        {/* Card example */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Product Card</Text>
          <Text style={styles.cardPrice}>$29.99</Text>
          <Text style={styles.cardDescription}>
            This is a description that remains visible even when bold text is enabled.
          </Text>
        </View>

        {/* List item example */}
        <View style={styles.listItem}>
          <Text style={styles.listItemTitle}>List Item Title</Text>
          <Text style={styles.listItemSubtitle}>Subtitle that won't disappear</Text>
        </View>
      </View>

      {/* Warning about old method */}
      <View style={[styles.section, styles.warningSection]}>
        <Text style={styles.warningTitle}>⚠️ Don't Use fontWeight Directly</Text>
        <Text style={styles.warningText}>
          Using fontWeight without proper fontFamily can cause text to disappear when
          users enable bold text in accessibility settings.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    ...createTextStyle({ size: 24, weight: 'bold', color: '#000' }),
    marginBottom: 8,
  },
  info: {
    ...getSafeFontStyle('regular'),
    fontSize: 14,
    color: '#666',
  },
  methodTitle: {
    ...getSafeFontStyle('bold'),
    fontSize: 18,
    color: '#2563eb',
    marginBottom: 12,
  },

  // Method 1 examples
  regularText: {
    ...getSafeFontStyle('regular'),
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  boldText: {
    ...getSafeFontStyle('bold'),
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  mediumText: {
    ...getSafeFontStyle('600'),
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },

  // Method 2 examples
  regularConstant: {
    ...FONT_STYLES.regular,
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  boldConstant: {
    ...FONT_STYLES.bold,
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },

  // Method 3 examples
  titleCreated: createTextStyle({
    size: 20,
    weight: 'bold',
    color: '#000',
  }),
  bodyCreated: {
    ...createTextStyle({
      size: 16,
      weight: 'regular',
      color: '#333',
    }),
    marginTop: 8,
  },
  captionCreated: {
    ...createTextStyle({
      size: 12,
      weight: 'regular',
      color: '#666',
    }),
    marginTop: 8,
  },

  // Method 4 examples
  directRegular: {
    fontFamily: FONT_FAMILIES.regular,
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  directBold: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },

  // Real-world examples
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    ...getSafeFontStyle('bold'),
    fontSize: 16,
    color: '#fff',
  },
  card: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    ...getSafeFontStyle('bold'),
    fontSize: 18,
    color: '#000',
    marginBottom: 4,
  },
  cardPrice: {
    ...getSafeFontStyle('bold'),
    fontSize: 24,
    color: '#10b981',
    marginBottom: 8,
  },
  cardDescription: {
    ...getSafeFontStyle('regular'),
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  listItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  listItemTitle: {
    ...getSafeFontStyle('600'),
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
  },
  listItemSubtitle: {
    ...getSafeFontStyle('regular'),
    fontSize: 14,
    color: '#666',
  },

  // Warning section
  warningSection: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 2,
  },
  warningTitle: {
    ...getSafeFontStyle('bold'),
    fontSize: 16,
    color: '#92400e',
    marginBottom: 8,
  },
  warningText: {
    ...getSafeFontStyle('regular'),
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
});

export default FontExampleComponent;
