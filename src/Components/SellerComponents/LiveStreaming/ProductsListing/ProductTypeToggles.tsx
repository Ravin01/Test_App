import React from "react";
import { View, Text, Switch, StyleSheet } from "react-native";
import { ShoppingCart, Hammer, Gift, Package } from "lucide-react-native"; // or another RN icon lib
import ToggleSwitch from "toggle-switch-react-native";

const ProductTypeToggles = ({ formData, setFormData, isAnyLoading, }) => {
  return (
    <View style={styles.container}>
      {/* Buy Now Toggle */}
      {/* {console.log(formData.enabledProductTypes.buyNow)} */}
      <View>
        <View style={styles.card}>
          <View style={styles.labelContainer}>
            <ShoppingCart size={20} color="#FFD700" />
            <Text style={styles.label}>Buy Now</Text>
          </View>
          <ToggleSwitch
          isOn={formData.enabledProductTypes.buyNow}
          onColor={'#FFD700'}
            // trackColor={{ false: "#444", true: "#FFD700" }}
            // thumbColor={formData.enabledProductTypes.buyNow ? "#fff" : "#888"}
            onToggle={(value) =>
              setFormData((prev) => ({
                ...prev,
                enabledProductTypes: {
                  ...prev.enabledProductTypes,
                  buyNow: value,
                  // If Buy Now is disabled, also disable Bundle Sale
                  bundleSale: value ? prev.enabledProductTypes.bundleSale : false,
                },
              }))
            }
            disabled={isAnyLoading}
          />
        </View>

        {/* Bundle Sale Toggle - Nested inside Buy Now */}
        {/* {formData.enabledProductTypes.buyNow && (
          <View style={[styles.card, styles.nestedCard]}>
            <View style={styles.labelContainer}>
              <Package size={18} color="#FFD700" />
              <Text style={[styles.label, styles.nestedLabel]}>Bundle Sale</Text>
            </View>
            <ToggleSwitch
              isOn={formData.enabledProductTypes.bundleSale}
              onColor={'#FFD700'}
              onToggle={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  enabledProductTypes: {
                    ...prev.enabledProductTypes,
                    bundleSale: value,
                  },
                }))
              }
              disabled={isAnyLoading}
            />
          </View>
        )} */}
      </View>

      {/* Auction Toggle */}
      <View style={styles.card}>
        <View style={styles.labelContainer}>
          <Hammer size={20} color="#FFD700" />
          <Text style={styles.label}>Auction</Text>
        </View>
        <ToggleSwitch
          // trackColor={{ false: "#444", true: "#FFD700" }}
          // thumbColor={formData.enabledProductTypes.auction ? "#fff" : "#888"}
          isOn={formData.enabledProductTypes.auction}
             onColor={'#FFD700'}
          onToggle={(value) =>
            setFormData((prev) => ({
              ...prev,
              enabledProductTypes: {
                ...prev.enabledProductTypes,
                auction: value,
              },
            }))
          }
          // value={formData.enabledProductTypes.auction}
          disabled={isAnyLoading}
        />
      </View>

      {/* Giveaway Toggle */}
      <View style={styles.card}>
        <View style={styles.labelContainer}>
          <Gift size={20} color="#FFD700" />
          <Text style={styles.label}>Giveaway</Text>
        </View>
        <ToggleSwitch
        isOn={formData.enabledProductTypes.giveaway}
          // trackColor={{ false: "#444", true: "#FFD700" }}
          // thumbColor={formData.enabledProductTypes.giveaway ? "#fff" : "#888"}
             onColor={'#FFD700'}
          onToggle={(value) =>
            setFormData((prev) => ({
              ...prev,
              enabledProductTypes: {
                ...prev.enabledProductTypes,
                giveaway: value,
              },
            }))
          }
          // value={formData.enabledProductTypes.giveaway}
          disabled={isAnyLoading}
        />
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "column", // stacked like `grid-cols-1`
    gap: 12,
    padding: 12,
    backgroundColor: "#1a1a1a", // blackLight
    borderRadius: 12,
    //borderWidth: 1,
   // borderColor: "#333", // greyLight
    //marginBottom: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderWidth:1,
    borderColor:'#444',
    backgroundColor: "#222", // blackDark
    borderRadius: 12,
  },
  nestedCard: {
    marginTop: 8,
    marginLeft: 16,
    backgroundColor: "#2a2a2a",
    borderColor: "#555",
    borderLeftWidth: 3,
    borderLeftColor: "#FFD700",
  },
  nestedLabel: {
    fontSize: 14,
    color: "#ccc",
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    color: "#ddd", // whiteLight
    fontWeight: "500",
    fontSize: 16,
  },
});

export default ProductTypeToggles;
