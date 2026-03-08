# Products.tsx Performance Analysis Report

## Summary
The Products.tsx screen has **12 major performance issues** that can cause:
- Unnecessary re-renders
- Memory leaks
- Slow list scrolling
- Janky animations
- Increased bundle size

---

## 🔴 Critical Performance Issues

### 1. **renderProduct and renderStock are NOT memoized**
**Location:** Lines 196-340 and 342-420
**Impact:** HIGH - Every render recreates these functions causing all list items to re-render

```typescript
// ❌ CURRENT (BAD)
const renderProduct = ({item: selectedProduct, index}) => {
  // ... renders on every parent re-render
};

// ✅ FIX - Use useCallback
const renderProduct = useCallback(({item: selectedProduct, index}) => {
  // ... only recreates when dependencies change
}, [canEdit, navigation]);
```

### 2. **Inline Functions in JSX cause re-renders**
**Location:** Multiple places in renderProduct and renderStock
**Impact:** HIGH - Creates new function references on every render

```typescript
// ❌ CURRENT (BAD)
onPress={() => navigation.navigate('ProductDetailScreen', {product: selectedProduct})}
onPress={() => navigation.navigate('ProductAnalyse', {productId: selectedProduct._id})}

// ✅ FIX - Move handlers outside or use useCallback
```

### 3. **Inline Style Objects create new references every render**
**Location:** Multiple places
**Impact:** MEDIUM - Forces style recalculation

```typescript
// ❌ CURRENT (BAD)
style={[styles.stockImage, {height: 150}]}
style={[styles.column, {maxWidth: 40}]}
style={{color: '#9CA3AF'}}
style={{fontSize: 10, color: 'green'}}

// ✅ FIX - Define in StyleSheet or useMemo
const dynamicStyles = useMemo(() => ({
  stockImageTall: [styles.stockImage, {height: 150}],
  columnNarrow: [styles.column, {maxWidth: 40}],
}), []);
```

### 4. **moment() called on every render for each item**
**Location:** Lines 262 and 407
**Impact:** MEDIUM - moment is heavy, called N times per render

```typescript
// ❌ CURRENT (BAD)
{moment(selectedProduct.createdAt).format('MMMM Do YYYY')}

// ✅ FIX - Memoize in item component or pre-format data
```

### 5. **Missing getItemLayout for SectionList**
**Location:** SectionList component
**Impact:** HIGH - Without this, React Native can't optimize scroll position calculations

```typescript
// ✅ ADD this prop to SectionList
getItemLayout={(data, index) => ({
  length: ITEM_HEIGHT, // fixed height
  offset: ITEM_HEIGHT * index,
  index,
})}
```

### 6. **ListHeaderComponent and ListFooterComponent are inline**
**Location:** Lines 547-615 and 627-665
**Impact:** MEDIUM - Recreated every render

```typescript
// ❌ CURRENT (BAD)
ListHeaderComponent={
  <>
    <View style={styles.headerContainer}>
      <SearchComponent ... />
    </View>
  </>
}

// ✅ FIX - Extract and memoize
const ListHeader = useMemo(() => (
  <View style={styles.headerContainer}>
    <SearchComponent searchTerm={searchQuerry} setSearchTerm={setSearchQuery} />
  </View>
), [searchQuerry]);
```

### 7. **removeClippedSubviews={false} disables optimization**
**Location:** Line 621
**Impact:** HIGH - Prevents memory optimization for off-screen items

```typescript
// ❌ CURRENT (BAD)
removeClippedSubviews={false}

// ✅ FIX - Enable for Android (test for iOS)
removeClippedSubviews={Platform.OS === 'android'}
```

### 8. **handleScroll creates new function every render**
**Location:** Lines 434-462
**Impact:** MEDIUM - Though not currently used in SectionList, if added would cause issues

```typescript
// ✅ FIX - Wrap in useCallback
const handleScroll = useCallback((event) => {
  // ...
}, [currentPage, totalPages, isFetchingMore, loading]);
```

### 9. **Unused imports increase bundle size**
**Location:** Top of file
**Impact:** LOW - But unnecessary code

```typescript
// ❌ UNUSED IMPORTS
import AsyncStorage from '@react-native-async-storage/async-storage'; // NEVER USED
import AntDesign from 'react-native-vector-icons/AntDesign'; // NEVER USED
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons'; // NEVER USED
import Feather from 'react-native-vector-icons/Feather'; // NEVER USED
import {TextInput} from 'react-native-paper'; // NEVER USED
import Header from '../../Reuse/Header'; // NEVER USED
import {AlignVerticalSpaceBetween, ChartBar, EarthIcon, Plus, Zap, AlertCircle} from 'lucide-react-native'; // MANY UNUSED
```

### 10. **fetchProducts missing useCallback**
**Location:** Lines 83-156
**Impact:** MEDIUM - Recreated every render, causes useFocusEffect issues

```typescript
// ✅ FIX - Wrap in useCallback
const fetchProducts = useCallback(async (page = 1, refreshing = false) => {
  // ...
}, [searchQuerry, effectiveSellerId, selectedTab, PAGELIMIT]);
```

### 11. **useFocusEffect dependency array issues**
**Location:** Lines 186-194
**Impact:** HIGH - fetchProducts is recreated every render but not in deps

```typescript
// ❌ CURRENT (BAD)
useFocusEffect(
  React.useCallback(() => {
    if (canView) {
      fetchProducts(1, false); // fetchProducts changes every render!
    }
  }, [searchQuerry, canView]), // fetchProducts missing from deps
);

// ✅ FIX - Add fetchProducts to dependencies after memoizing it
```

### 12. **Console.log statements in production code**
**Location:** Multiple places (lines 173, 362-365, 427, 453-461)
**Impact:** LOW-MEDIUM - Unnecessary processing

```typescript
// ❌ CURRENT (BAD)
console.log('✅ Conditions met - Loading more... Page:', nextPage);

// ✅ FIX - Remove or use __DEV__ check
if (__DEV__) {
  console.log('✅ Conditions met - Loading more... Page:', nextPage);
}
```

---

## 🟡 Additional Recommendations

### 13. **Extract ProductCard as separate memoized component**
```typescript
// Create ProductCard.tsx
const ProductCard = React.memo(({ product, canEdit, onNavigate, onEdit, onAnalyse }) => {
  // ... product card JSX
});
```

### 14. **Use FlashList instead of SectionList**
FlashList from Shopify is significantly faster for large lists:
```bash
npm install @shopify/flash-list
```

### 15. **Image optimization**
```typescript
// ✅ Add loading placeholder and cache
<Image
  source={{uri: `${AWS_CDN_URL}${imageKeys[0]?.key}`}}
  style={styles.stockImage}
  resizeMode="cover"
  defaultSource={require('../../../assets/images/placeholder.png')} // Add placeholder
/>
```

### 16. **Debounce search input**
The search currently triggers on every keystroke. Add debounce:
```typescript
const debouncedSearch = useMemo(
  () => debounce((text) => setSearchQuery(text), 300),
  []
);
```

---

## 📊 Performance Impact Summary

| Issue | Severity | Fix Difficulty | Impact on UX |
|-------|----------|----------------|--------------|
| Non-memoized render functions | HIGH | Easy | Janky scrolling |
| Inline functions/styles | HIGH | Medium | Re-renders |
| removeClippedSubviews=false | HIGH | Easy | Memory usage |
| Missing getItemLayout | HIGH | Easy | Scroll performance |
| moment() per item | MEDIUM | Easy | CPU usage |
| Inline ListHeader/Footer | MEDIUM | Easy | Re-renders |
| fetchProducts not memoized | MEDIUM | Easy | Unnecessary calls |
| Unused imports | LOW | Easy | Bundle size |
| Console logs | LOW | Easy | Processing |

---

## ✅ Quick Wins (Apply These First)

1. Remove unused imports
2. Set `removeClippedSubviews={true}` (or Platform-specific)
3. Wrap `renderProduct` and `renderStock` in `useCallback`
4. Wrap `fetchProducts` in `useCallback`
5. Remove console.log statements or guard with `__DEV__`
6. Memoize `ListHeaderComponent` and `ListFooterComponent`
7. Add `getItemLayout` if items have fixed height
