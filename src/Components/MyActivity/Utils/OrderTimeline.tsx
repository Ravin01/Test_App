import { Box, Check, Package2, RefreshCcw, RefreshCw, Truck, X, MapPin, Clock } from 'lucide-react-native';
import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, Animated } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const OrderTimeline = ({ order, onRefreshTracking=false }) => {
    // Helper to format dates
    const formatDate = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Helper to format estimate dates
    const formatEstimateDate = (dateString) => {
        if (!dateString) return 'Not available';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Helper to get tracking URL
    const getTrackingUrl = (carrier, trackingNumber) => {
        if (!carrier || !trackingNumber) return '#';
        const carrierLower = carrier.toLowerCase();
        if (carrierLower.includes('fedex')) {
            return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
        }
        if (carrierLower.includes('ups')) {
            return `https://www.ups.com/track?loc=en_US&tracknum=${trackingNumber}`;
        }
        return `https://www.google.com/search?q=${carrier}+${trackingNumber}+tracking`;
    };

    // Status configuration - Updated to match web version
    const STATUS_MAP = {
        ORDERED: { title: 'Ordered', icon: <Box color={'#fff'} size={15}/> },
        PACKED: { title: 'Packed', icon: <Package2 color={'#fff'} size={15}/> },
        SHIPPED: { title: 'Shipped', icon: <Truck color={'#fff'} size={15}/> },
        OUT_FOR_DELIVERY: { title: 'Out for Delivery', icon: <Truck color={'#fff'} size={15}/> },
        DELIVERED: { title: 'Delivered', icon: <Check color={'#fff'} size={15}/> },
        CANCELLED: { title: 'Cancelled', icon: <X color={'#fff'} size={15}/>, isTerminal: true },
        RETURN_REQUESTED: { title: 'Return Requested', icon: <RefreshCcw color={'#fff'} size={15}/> },
        RETURN_APPROVED: { title: 'Return Approved', icon: <RefreshCw color={'#fff'} size={15}/> },
        RETURN_REJECTED: { title: 'Return Rejected', icon: <X color={'#fff'} size={15}/>, isTerminal: true },
        RETURN_SHIPPED: { title: 'Return Shipped', icon: <Truck color={'#fff'} size={15}/> },
        RETURN_RECEIVED: { title: 'Return Received', icon: <Check color={'#fff'} size={15}/> },
        REFUNDED: { title: 'Refunded', icon: <MaterialIcons name='savings' color={'#fff'} size={15}/>, isTerminal: true },
    };

    // Build timeline steps - Updated logic from web version
    const buildTimelineSteps = () => {
        let steps = [];
        const { statusTimeline, returnRequests, courierDetails, logisticsDetails } = order;
        const actualOrderStatus = order.orderStatus;

        // Check if we have logistics tracking data
        const hasLogisticsTracking = logisticsDetails?.tracking?.trackingTimeline?.length > 0;
        
        // Always add the actual order status as the primary step
        if (statusTimeline.ordered) {
            steps.push({
                status: 'ORDERED',
                date: statusTimeline.ordered,
                isActive: actualOrderStatus === 'ORDERED'
            });
        }
        
        if (statusTimeline.packed) {
            steps.push({
                status: 'PACKED',
                date: statusTimeline.packed,
                isActive: actualOrderStatus === 'PACKED'
            });
        }
        
        if (statusTimeline.shipped) {
            steps.push({
                status: 'SHIPPED',
                date: statusTimeline.shipped,
                carrier: courierDetails?.carrier,
                trackingNumber: courierDetails?.trackingNumber,
                isActive: actualOrderStatus === 'SHIPPED'
            });
        }
        
        if (statusTimeline.outForDelivery) {
            steps.push({
                status: 'OUT_FOR_DELIVERY',
                date: statusTimeline.outForDelivery,
                isActive: actualOrderStatus === 'OUT_FOR_DELIVERY'
            });
        }
        
        if (statusTimeline.delivered) {
            steps.push({
                status: 'DELIVERED',
                date: statusTimeline.delivered,
                isActive: actualOrderStatus === 'DELIVERED'
            });
        }
        
        // Add logistics tracking data as additional information
        if (hasLogisticsTracking) {
            const trackingTimeline = logisticsDetails.tracking.trackingTimeline;
            trackingTimeline.forEach(event => {
                steps.push({
                    status: 'TRACKING_UPDATE',
                    date: new Date(event.date),
                    location: event.location,
                    description: event.status,
                    icon: event.icon,
                    isLogisticsUpdate: true
                });
            });
        } else if (logisticsDetails?.tracking) {
            steps.push({
                status: 'TRACKING_UPDATE',
                date: logisticsDetails.tracking.lastSyncedAt,
                location: logisticsDetails.tracking.currentLocation,
                description: logisticsDetails.tracking.currentStatus,
                icon: '📦',
                isLogisticsUpdate: true
            });
        }

        // Add pending delivery step with estimate if shipped but not delivered
        if (statusTimeline.shipped && !statusTimeline.delivered && actualOrderStatus !== 'DELIVERED') {
            steps.push({
                status: 'DELIVERED',
                date: null,
                estimatedDate: courierDetails?.estimatedDelivery || logisticsDetails?.tracking?.estimatedDelivery,
                isActive: false
            });
        }

        // Add cancellation step if it exists
        if (statusTimeline.cancelled) {
            steps.push({ 
                status: 'CANCELLED', 
                date: statusTimeline.cancelled, 
                reason: order.cancelReason,
                isActive: actualOrderStatus === 'CANCELLED'
            });
            steps = steps.filter(step => !step.date || new Date(step.date) <= new Date(statusTimeline.cancelled));
        }
        
        // Add detailed return and refund steps
        if (returnRequests && returnRequests.length > 0) {
            returnRequests.forEach(req => {
                if (req.requestedAt) {
                    steps.push({ 
                        status: 'RETURN_REQUESTED', 
                        date: req.requestedAt,
                        reason: req.customerReason,
                        items: req.items,
                        isActive: actualOrderStatus === 'RETURN_REQUESTED'
                    });
                }
                
                if (req.processedAt) {
                    const status = req.status === 'REJECTED' ? 'RETURN_REJECTED' : 'RETURN_APPROVED';
                    steps.push({ 
                        status, 
                        date: req.processedAt, 
                        reason: req.sellerResponse,
                        isActive: actualOrderStatus === status
                    });
                }
                
                if (req.status !== 'REJECTED') {
                    if (req.shipmentDetails?.shippedAt) {
                        steps.push({ 
                            status: 'RETURN_SHIPPED', 
                            date: req.shipmentDetails.shippedAt,
                            carrier: req.shipmentDetails.carrier,
                            trackingNumber: req.shipmentDetails.trackingNumber,
                            isActive: actualOrderStatus === 'RETURN_SHIPPED'
                        });
                    }
                    if (req.receivedAt) steps.push({ 
                        status: 'RETURN_RECEIVED', 
                        date: req.receivedAt,
                        isActive: actualOrderStatus === 'RETURN_RECEIVED'
                    });
                    if (req.refundProcessedAt) steps.push({ 
                        status: 'REFUNDED', 
                        date: req.refundProcessedAt,
                        isActive: actualOrderStatus === 'REFUNDED'
                    });
                }
            });
        }

        // Sort steps by date
        steps.sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(a.date) - new Date(b.date);
        });
        
        return steps;
    };

    const timelineSteps = buildTimelineSteps();
    const lastCompletedIndex = timelineSteps.findLastIndex(s => s.date && !s.isLogisticsUpdate);
    const hasLogisticsTracking = order.logisticsDetails?.tracking;

    return (
        <View style={styles.container}>
            {/* Header with refresh button */}
            <View style={styles.header}>
                <Text style={styles.title}>Order Timeline</Text>
                
                {/* Show refresh button only for orders with logistics tracking */}
                {/* {hasLogisticsTracking && onRefreshTracking && (
                    <TouchableOpacity 
                        onPress={onRefreshTracking}
                        style={styles.refreshButton}
                    >
                        <RefreshCw color="#64B5F6" size={16} />
                        <Text style={styles.refreshText}>Refresh</Text>
                    </TouchableOpacity>
                )} */}
            </View>
            
            {/* Logistics Tracking Progress Bar */}
            {hasLogisticsTracking && order?.logisticsDetails?.currentStatus &&!onRefreshTracking&& (
                <View style={styles.logisticsContainer}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressStatus}>
                            {order.logisticsDetails.tracking.currentStatus}
                        </Text>
                        <Text style={styles.progressPercentage}>
                            {order.logisticsDetails.tracking.progressPercentage}%
                        </Text>
                    </View>
                    
                    <View style={styles.progressBarContainer}>
                        <View 
                            style={[
                                styles.progressBar, 
                                { width: `${order.logisticsDetails.tracking.progressPercentage}%` }
                            ]} 
                        />
                    </View>
                    
                    {order.logisticsDetails.tracking.currentLocation && (
                        <View style={styles.locationContainer}>
                            <MapPin color="#9CA3AF" size={12} />
                            <Text style={styles.locationText}>
                                Current Location: {order.logisticsDetails.tracking.currentLocation}
                            </Text>
                        </View>
                    )}
                    
                    {order.logisticsDetails.tracking.estimatedDelivery && (
                        <View style={styles.estimatedContainer}>
                            <Clock color="#FBBF24" size={12} />
                            <Text style={styles.estimatedText}>
                                Estimated Delivery: {formatEstimateDate(order.logisticsDetails.tracking.estimatedDelivery)}
                            </Text>
                        </View>
                    )}
                </View>
            )}
            
            <View style={styles.timelineContainer}>
                {timelineSteps.map((step, index) => {
                    // Skip logistics update steps in the main timeline
                    if (step.isLogisticsUpdate) return null;
                    
                    const stepInfo = STATUS_MAP[step.status];
                    if (!stepInfo) return null;

                    const isCompleted = !!step.date;
                    const isActive = step.isActive || false;

                    const getLineColor = () => {
                        if (isCompleted) {
                            if (step.status.includes('REJECTED') || step.status.includes('CANCELLED')) return styles.redLine;
                            return styles.greenLine;
                        }
                        return styles.grayLine;
                    };

                    const getIconStyle = () => {
                        if (isCompleted) {
                            if (step.status.includes('REJECTED') || step.status.includes('CANCELLED')) return styles.redIcon;
                            if (isActive) return styles.activeGreenIcon;
                            return styles.completedGreenIcon;
                        }
                        return styles.grayIcon;
                    };

                    return (
                        <View key={`${step.status}-${index}`} style={styles.stepContainer}>
                            <View style={styles.iconContainer}>
                                <View style={[styles.icon, getIconStyle()]}>
                                    {stepInfo.icon}
                                </View>
                                {index < timelineSteps.filter(s => !s.isLogisticsUpdate).length - 1 && (
                                    <View style={[styles.line, getLineColor()]} />
                                )}
                            </View>
                            <View style={styles.detailsContainer}>
                                <Text style={[styles.stepTitle, isCompleted ? styles.whiteText : styles.grayText]}>
                                    {stepInfo.title}
                                </Text>
                                {isCompleted ? (
                                    <Text style={styles.dateText}>{formatDate(step.date)}</Text>
                                ) : (
                                    step.status === 'DELIVERED' && (
                                        <Text style={styles.estimateText}>
                                            Estimated by {formatEstimateDate(step.estimatedDate)}
                                        </Text>
                                    )
                                )}
                                
                                <View style={styles.additionalInfo}>
                                    {/* Tracking info for SHIPPED and RETURN_SHIPPED */}
                                    {step.carrier && step.trackingNumber && (
                                        <View>
                                            <Text style={styles.infoText}>
                                                Carrier: <Text style={styles.boldText}>{step.carrier}</Text>
                                            </Text>
                                            <Text style={styles.infoText}>
                                                Tracking:{' '}
                                                <Text 
                                                    style={styles.linkText}
                                                    onPress={() => Linking.openURL(getTrackingUrl(step.carrier, step.trackingNumber))}
                                                >
                                                    {step.trackingNumber}
                                                </Text>
                                            </Text>
                                        </View>
                                    )}

                                    {/* Return items for RETURN_REQUESTED */}
                                    {step.status === 'RETURN_REQUESTED' && step.items && (
                                        <View>
                                            <Text style={styles.boldText}>Items in Request:</Text>
                                            {step.items.map(item => (
                                                <Text key={item.sku} style={styles.infoText}>
                                                    • {item.name} (Qty: {item.quantity})
                                                </Text>
                                            ))}
                                        </View>
                                    )}
                                    
                                    {/* Reason/note */}
                                    {step.reason && (
                                        <Text style={styles.noteText}>Note: {step.reason}</Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    );
                })}
            </View>
            
            {/* Logistics Tracking Details Section */}
            {hasLogisticsTracking && order.logisticsDetails.tracking.trackingTimeline?.length > 0 && (
                <View style={styles.trackingDetailsContainer}>
                    <Text style={styles.trackingDetailsTitle}>Tracking Details</Text>
                    <View style={styles.trackingDetailsContent}>
                        {order.logisticsDetails.tracking.trackingTimeline.map((event, index) => (
                            <View key={index} style={styles.trackingEvent}>
                                <Text style={styles.trackingIcon}>{event.icon}</Text>
                                <View style={styles.trackingEventContent}>
                                    <Text style={styles.trackingEventStatus}>{event.status}</Text>
                                    <View style={styles.trackingEventDetails}>
                                        <MapPin color="#9CA3AF" size={12} />
                                        <Text style={styles.trackingEventLocation}>{event.location}</Text>
                                        <Text style={styles.trackingEventSeparator}>•</Text>
                                        <Text style={styles.trackingEventDate}>{formatDate(event.date)}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderTopWidth: 1,
        borderTopColor: '#404040',
        paddingTop: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontWeight: '600',
        color: 'rgba(250, 250, 250, 0.6)',
        fontSize: 16,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    refreshText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64B5F6',
        marginLeft: 4,
    },
    logisticsContainer: {
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressStatus: {
        color: '#FFFFFF',
        fontWeight: '500',
        fontSize: 14,
    },
    progressPercentage: {
        color: '#FFFFFF',
        fontSize: 14,
    },
    progressBarContainer: {
        width: '100%',
        height: 10,
        backgroundColor: '#4B5563',
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 5,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },
    locationText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginLeft: 8,
    },
    estimatedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    estimatedText: {
        fontSize: 12,
        color: '#FBBF24',
        marginLeft: 8,
    },
    timelineContainer: {
        marginBottom: 16,
    },
    stepContainer: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    iconContainer: {
        alignItems: 'center',
        width: 40,
    },
    icon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    grayIcon: {
        backgroundColor: '#404040',
    },
    greenIcon: {
        backgroundColor: '#4CAF50',
    },
    activeGreenIcon: {
        backgroundColor: '#4CAF50',
    },
    completedGreenIcon: {
        backgroundColor: 'rgba(76, 175, 80, 0.3)',
    },
    redIcon: {
        backgroundColor: '#F44336',
    },
    line: {
        width: 2,
        flex: 1,
        marginVertical: 4,
    },
    grayLine: {
        backgroundColor: '#404040',
    },
    greenLine: {
        backgroundColor: '#4CAF50',
    },
    redLine: {
        backgroundColor: '#F44336',
    },
    detailsContainer: {
        flex: 1,
        paddingBottom: 16,
    },
    stepTitle: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    whiteText: {
        color: '#FFFFFF',
    },
    grayText: {
        color: 'rgba(255, 255, 255, 0.6)',
    },
    dateText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: 2,
    },
    estimateText: {
        fontSize: 12,
        color: '#FFEB3B',
        fontWeight: '600',
        marginTop: 2,
    },
    additionalInfo: {
        marginTop: 6,
    },
    infoText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 2,
    },
    boldText: {
        fontWeight: '600',
    },
    linkText: {
        color: '#64B5F6',
        fontWeight: '600',
    },
    noteText: {
        fontStyle: 'italic',
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 4,
    },
    trackingDetailsContainer: {
        marginTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#404040',
        paddingTop: 16,
    },
    trackingDetailsTitle: {
        fontWeight: '600',
        color: 'rgba(250, 250, 250, 0.6)',
        fontSize: 16,
        marginBottom: 12,
    },
    trackingDetailsContent: {
        gap: 8,
    },
    trackingEvent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    trackingIcon: {
        fontSize: 18,
    },
    trackingEventContent: {
        flex: 1,
    },
    trackingEventStatus: {
        color: '#FFFFFF',
        fontWeight: '500',
        fontSize: 14,
    },
    trackingEventDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    trackingEventLocation: {
        fontSize: 12,
        color: '#9CA3AF',
        marginLeft: 4,
    },
    trackingEventSeparator: {
        fontSize: 12,
        color: '#9CA3AF',
        marginHorizontal: 8,
    },
    trackingEventDate: {
        fontSize: 12,
        color: '#9CA3AF',
    },
});

export default OrderTimeline;