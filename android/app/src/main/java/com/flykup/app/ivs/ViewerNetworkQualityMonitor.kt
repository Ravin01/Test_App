package com.flykup.app.ivs

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi

/**
 * ViewerNetworkQualityMonitor
 * 
 * Monitors network quality for IVS Stage viewers to provide optimal streaming experience.
 * Provides real-time network assessment and quality recommendations.
 */
class ViewerNetworkQualityMonitor(private val context: Context) {
    
    private val TAG = "ViewerNetworkMonitor"
    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    
    enum class QualityLevel {
        EXCELLENT,  // 5+ Mbps - Perfect for 1080p @ 30fps
        GOOD,       // 2.5-5 Mbps - Great for 720p @ 30fps
        FAIR,       // 1-2.5 Mbps - Acceptable for 480p @ 24fps
        POOR        // < 1 Mbps - Audio-only or 360p @ 20fps
    }
    
    enum class NetworkType {
        WIFI,
        CELLULAR_5G,
        CELLULAR_4G,
        CELLULAR_3G,
        CELLULAR_2G,
        ETHERNET,
        UNKNOWN
    }
    
    data class NetworkQuality(
        val qualityLevel: QualityLevel,
        val networkType: NetworkType,
        val estimatedBandwidthKbps: Int,
        val isMetered: Boolean,
        val recommendMaxResolution: String,
        val recommendMaxFPS: Int,
        val shouldUseAudioOnly: Boolean,
        val timestamp: Long = System.currentTimeMillis()
    )
    
    var onNetworkQualityChanged: ((NetworkQuality) -> Unit)? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var currentQuality: NetworkQuality? = null
    private var isMonitoring = false
    
    init {
        Log.d(TAG, "ViewerNetworkQualityMonitor initialized")
    }
    
    /**
     * Start monitoring network quality
     */
    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    fun startMonitoring() {
        if (isMonitoring) {
            Log.w(TAG, "Already monitoring network quality")
            return
        }
        
        Log.d(TAG, "Starting network monitoring...")
        
        try {
            val networkRequest = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()
            
            networkCallback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    Log.d(TAG, "Network available")
                    assessNetworkQuality()
                }
                
                override fun onCapabilitiesChanged(
                    network: Network,
                    networkCapabilities: NetworkCapabilities
                ) {
                    Log.d(TAG, "Network capabilities changed")
                    assessNetworkQuality()
                }
                
                override fun onLost(network: Network) {
                    Log.w(TAG, "Network lost")
                    // Report poor quality on network loss
                    reportQuality(QualityLevel.POOR, NetworkType.UNKNOWN, 0, false)
                }
            }
            
            connectivityManager.registerNetworkCallback(networkRequest, networkCallback!!)
            isMonitoring = true
            
            // Initial assessment
            assessNetworkQuality()
            
        } catch (e: Exception) {
            Log.e(TAG, "Error starting network monitoring: ${e.message}", e)
        }
    }
    
    /**
     * Stop monitoring network quality
     */
    fun stopMonitoring() {
        if (!isMonitoring) return
        
        Log.d(TAG, "Stopping network monitoring...")
        
        try {
            networkCallback?.let {
                connectivityManager.unregisterNetworkCallback(it)
            }
            networkCallback = null
            isMonitoring = false
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping network monitoring: ${e.message}", e)
        }
    }
    
    /**
     * Assess current network quality
     */
    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    private fun assessNetworkQuality() {
        try {
            val activeNetwork = connectivityManager.activeNetwork
            if (activeNetwork == null) {
                Log.w(TAG, "No active network")
                reportQuality(QualityLevel.POOR, NetworkType.UNKNOWN, 0, false)
                return
            }
            
            val capabilities = connectivityManager.getNetworkCapabilities(activeNetwork)
            if (capabilities == null) {
                Log.w(TAG, "No network capabilities")
                reportQuality(QualityLevel.POOR, NetworkType.UNKNOWN, 0, false)
                return
            }
            
            // Determine network type
            val networkType = when {
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> NetworkType.WIFI
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> NetworkType.ETHERNET
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> {
                    // Try to determine cellular generation
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        // Android 10+ can differentiate 5G
                        NetworkType.CELLULAR_4G // Simplified for now
                    } else {
                        NetworkType.CELLULAR_4G
                    }
                }
                else -> NetworkType.UNKNOWN
            }
            
            // Check if metered (cellular data)
            val isMetered = !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
            
            // Estimate bandwidth based on network type
            val estimatedBandwidthKbps = estimateBandwidth(networkType, capabilities)
            
            // Determine quality level
            val qualityLevel = when {
                estimatedBandwidthKbps >= 5000 -> QualityLevel.EXCELLENT
                estimatedBandwidthKbps >= 2500 -> QualityLevel.GOOD
                estimatedBandwidthKbps >= 1000 -> QualityLevel.FAIR
                else -> QualityLevel.POOR
            }
            
            Log.d(TAG, "Network quality: $qualityLevel, Type: $networkType, Bandwidth: ${estimatedBandwidthKbps}Kbps")
            
            reportQuality(qualityLevel, networkType, estimatedBandwidthKbps, isMetered)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error assessing network quality: ${e.message}", e)
            reportQuality(QualityLevel.FAIR, NetworkType.UNKNOWN, 2000, false)
        }
    }
    
    /**
     * Estimate bandwidth based on network type and capabilities
     */
    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    private fun estimateBandwidth(networkType: NetworkType, capabilities: NetworkCapabilities): Int {
        // Try to get actual bandwidth if available (Android M+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val downlinkKbps = capabilities.linkDownstreamBandwidthKbps
            if (downlinkKbps > 0 && downlinkKbps < 1000000) { // Sanity check
                // Use 70% of reported bandwidth for conservative estimate
                val conservativeBandwidth = (downlinkKbps * 0.7).toInt()
                Log.d(TAG, "Using reported bandwidth: ${downlinkKbps}Kbps → Conservative: ${conservativeBandwidth}Kbps")
                return conservativeBandwidth
            }
        }
        
        // Fallback to type-based estimation
        return when (networkType) {
            NetworkType.WIFI -> 8000 // 8 Mbps typical WiFi
            NetworkType.ETHERNET -> 10000 // 10 Mbps typical wired
            NetworkType.CELLULAR_5G -> 7000 // 7 Mbps 5G
            NetworkType.CELLULAR_4G -> 4000 // 4 Mbps 4G/LTE
            NetworkType.CELLULAR_3G -> 1500 // 1.5 Mbps 3G
            NetworkType.CELLULAR_2G -> 300 // 300 Kbps 2G
            NetworkType.UNKNOWN -> 2000 // 2 Mbps safe default
        }
    }
    
    /**
     * Report quality change
     */
    private fun reportQuality(
        qualityLevel: QualityLevel,
        networkType: NetworkType,
        bandwidthKbps: Int,
        isMetered: Boolean
    ) {
        // Determine recommendations based on quality
        val (maxResolution, maxFPS, audioOnly) = when (qualityLevel) {
            QualityLevel.EXCELLENT -> Triple("1080p", 30, false)
            QualityLevel.GOOD -> Triple("720p", 30, false)
            QualityLevel.FAIR -> Triple("480p", 24, false)
            QualityLevel.POOR -> Triple("360p", 20, true) // Suggest audio-only
        }
        
        val quality = NetworkQuality(
            qualityLevel = qualityLevel,
            networkType = networkType,
            estimatedBandwidthKbps = bandwidthKbps,
            isMetered = isMetered,
            recommendMaxResolution = maxResolution,
            recommendMaxFPS = maxFPS,
            shouldUseAudioOnly = audioOnly
        )
        
        // Only notify if quality level changed
        if (currentQuality?.qualityLevel != qualityLevel || 
            currentQuality?.networkType != networkType) {
            
            currentQuality = quality
            
            Log.d(TAG, "📊 Quality changed: $qualityLevel ($maxResolution @ ${maxFPS}fps, AudioOnly: $audioOnly)")
            
            onNetworkQualityChanged?.invoke(quality)
        }
    }
    
    /**
     * Get current quality assessment
     */
    fun getCurrentQuality(): NetworkQuality {
        return currentQuality ?: NetworkQuality(
            qualityLevel = QualityLevel.FAIR,
            networkType = NetworkType.UNKNOWN,
            estimatedBandwidthKbps = 2000,
            isMetered = false,
            recommendMaxResolution = "480p",
            recommendMaxFPS = 24,
            shouldUseAudioOnly = false
        )
    }
    
    /**
     * Check if high quality is supported
     */
    fun isHighQualitySupported(): Boolean {
        val quality = getCurrentQuality()
        return quality.qualityLevel == QualityLevel.EXCELLENT || 
               quality.qualityLevel == QualityLevel.GOOD
    }
    
    /**
     * Check if on metered network (cellular data)
     */
    fun isOnMeteredNetwork(): Boolean {
        return getCurrentQuality().isMetered
    }
    
    /**
     * Clean up resources
     */
    fun cleanup() {
        Log.d(TAG, "Cleaning up ViewerNetworkQualityMonitor")
        stopMonitoring()
        onNetworkQualityChanged = null
        currentQuality = null
    }
}
