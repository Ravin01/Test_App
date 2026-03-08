import React, { useMemo } from "react";
import { View, FlatList, StyleSheet, Image , TouchableOpacity} from "react-native";
import { AWS_CDN_URL } from "../../../Config";

const SCREEN_WIDTH = 375;
const GAP = 6;
const COLS = 3;
const COL_WIDTH = (SCREEN_WIDTH - GAP * (COLS + 1)) / COLS;

// pattern you want to repeat
const PATTERN = [
  { height: 120, span: 2 }, // wide
  { height: 120, span: 1 },
  { height: 120, span: 1 },
  { height: 246, span: 1 }, // tall
  { height: 120, span: 3 },
  { height: 120, span: 2 }, // wide
  { height: 120, span: 1 },
  { height: 120, span: 1 },
  { height: 246, span: 1 }, // tall
  { height: 120, span: 1 },
];

export default function MixedGrid({ products, navigation }) {
  // generate data dynamically by mapping products with repeating pattern
  console.log(products.length, 'products length in MixedGrid');
  const gridData = useMemo(
    () =>
      products.map((product, index) => {
        const pattern = PATTERN[index % PATTERN.length]; // cycle through pattern
        return {
          ...product,
          height: pattern.height,
          span: pattern.span,
        };
      }),
    [products]
  );

  return (
<FlatList
  data={gridData}
  keyExtractor={(item) => String(item._id)}
  numColumns={2} // important, we handle wrapping ourselves
  contentContainerStyle={{
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
    padding: GAP,
  }}
  renderItem={({ item }) => (
    <TouchableOpacity
      key={item.id}
      onPress={() => navigation.navigate("ProductDetails", { id: item._id })}
      style={[
        styles.card,
        {
          height: item.height,
          width:
            COL_WIDTH * (item.span || 1) +
            GAP * ((item.span || 1) - 1),
        },
      ]}
    >
      <Image
        source={{
          uri: item?.images?.[0]?.key
            ? `${AWS_CDN_URL}${item?.images[0].key}`
            : undefined,
        }}
        style={{ width: "100%", height: "100%", borderRadius: 10 }}
        resizeMode="cover"
      />
    </TouchableOpacity>
  )}
/>


  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#141414",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: GAP,
    overflow: "hidden",
  },
});
