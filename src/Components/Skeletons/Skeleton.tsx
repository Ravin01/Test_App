import React from 'react';
import { View, StyleSheet } from 'react-native';

const SkeletonItem = ({ width = '100%', height = 50, style }) => (
  <View style={[
    styles.skeletonItem,
    { width, height },
    style
  ]} />
);

const ListSkeleton = ({ itemCount = 5 }) => (
  <View style={styles.container}>
    {[...Array(itemCount)].map((_, index) => (
      <View key={index} style={styles.listItem}>
        <SkeletonItem width={70} height={60} />
        <View style={styles.textContainer}>
          <SkeletonItem width="100%" height={20} />
          <SkeletonItem width="100%" height={15} />
          <SkeletonItem width="100%" height={20} />
          <SkeletonItem width="100%" height={15} />
          <SkeletonItem width="100%" height={20} />{/* 
          <SkeletonItem width="100%" height={15} /> */}
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 16,
    // backgroundColor: '#F7CE45',
    height: '100%',
  },
  skeletonItem: {
    backgroundColor: '#fff', // Lighter yellow to match the background
    marginBottom: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  textContainer: {
    marginLeft: 10,
    flex: 1,
    // flexDirection:'row'
  },
});

export { SkeletonItem, ListSkeleton };
