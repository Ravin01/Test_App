import React from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Card } from 'react-native-paper';

const CategorySkeleton = () => {
  const skeletonBoxes = Array.from({ length: 8 });

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} >
      <View style={styles.headerSkeleton} />

      <View style={styles.grid}>
        {skeletonBoxes.map((_, index) => (
          <Card key={index} style={styles.cardSkeleton} />
        ))}
      </View>

      <View style={styles.bottomNav}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={styles.navIconSkeleton} />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 110,
    alignItems: 'center',
    backgroundColor: '#121212',  //'#000',
  },
  headerSkeleton: {
    width: '80%',
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2e2e2e',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
  },
  cardSkeleton: {
    width: Dimensions.get('window').width / 2.5,
    height: 120,
    margin: 10,
    borderRadius: 12,
    backgroundColor: '#2e2e2e',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1a1a1a',
    width: '100%',
    paddingVertical: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  navIconSkeleton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3a3a3a',
  },
});

export default CategorySkeleton;
