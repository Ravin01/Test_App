import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Check, Package, Truck } from 'lucide-react-native';

const OrderConfirmation = ({ orderId, onDone, onTrackOrder }) => {
  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.iconContainer}>
        <Check size={48} color="rgba(250,250,250,1)" strokeWidth={3} />
      </View>

      <Text style={styles.title}>Order Confirmed!</Text>

      <Text style={styles.subtitle}>Thank you for your purchase.</Text>

      <Text style={styles.orderId}>
        Order ID: <Text style={styles.orderIdValue}>{orderId}</Text>
      </Text>

      {/* Order Status Steps */}
      <View style={styles.statusContainer}>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <View style={styles.statusIconActive}>
                <Check size={16} color="white" strokeWidth={2} />
              </View>
              <Text style={styles.statusLabel}>Confirmed</Text>
            </View>
            <View style={styles.statusLine} />
            <View style={styles.statusItem}>
              <View style={styles.statusIconInactive}>
                <Package size={16} color="rgba(250,250,250,.62)" strokeWidth={2} />
              </View>
              <Text style={styles.statusLabel}>Packed</Text>
            </View>
            <View style={styles.statusLine} />
            <View style={styles.statusItem}>
              <View style={styles.statusIconInactive}>
                <Truck size={16} color="rgba(250,250,250,.62)" strokeWidth={2} />
              </View>
              <Text style={styles.statusLabel}>Delivered</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onTrackOrder}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Track Your Order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onDone}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 90,
    height: 90,
    backgroundColor: '#22C55E',
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
    color: 'rgba(250,250,250,1)',
  },
  subtitle: {
    color: 'rgba(250,250,250,.62)',
    marginBottom: 6,
    fontSize: 15,
  },
  orderId: {
    color: 'rgba(250,250,250,0.42)',
    marginBottom: 20,
    fontSize: 13,
  },
  orderIdValue: {
    fontFamily: 'monospace',
    color: 'rgba(250,250,250,.62)',
  },
  statusContainer: {
    width: '100%',
    maxWidth: 384,
    marginBottom: 24,
  },
  statusCard: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(250,250,250,0.05)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusIconActive: {
    width: 32,
    height: 32,
    backgroundColor: '#22C55E',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statusIconInactive: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(250,250,250,0.1)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statusLabel: {
    fontSize: 11,
    color: 'rgba(250,250,250,.62)',
  },
  statusLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(250,250,250,0.1)',
    marginHorizontal: 8,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 384,
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: 'rgba(247,206,69,1)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'rgba(0,0,0,1)',
    fontWeight: 'bold',
    fontSize: 15,
  },
  secondaryButton: {
    width: '100%',
    borderWidth: 2,
    borderColor: 'rgba(250,250,250,0.25)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: 'rgba(250,250,250,1)',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default OrderConfirmation;
