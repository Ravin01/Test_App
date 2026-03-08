import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { ArrowLeftCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

interface WebViewScreenProps {
  navigation: any;
  route: {
    params: {
      url: string;
      title: string;
    };
  };
}

const WebViewScreen: React.FC<WebViewScreenProps> = ({ navigation, route }) => {
  const { url, title } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <ArrowLeftCircle color="#fff" size={24} />
        </TouchableOpacity>
        <LinearGradient
          colors={['#B38728', '#FFD700']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerTitleContainer}>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </LinearGradient>
        <View style={styles.headerSpacer} />
      </View>

      {/* WebView */}
      <View style={styles.webViewContainer}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}
        
        {
        error
        ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load page</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setError(false);
                setLoading(true);
              }}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            source={{ uri: url }}
            style={styles.webView}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            onHttpError={() => {
              setLoading(false);
              setError(true);
            }}
            startInLoadingState={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scalesPageToFit={true}
            showsVerticalScrollIndicator={true}
            showsHorizontalScrollIndicator={false}
            injectedJavaScript={`
              (function() {
                function hideElements() {
                  // Hide Elementor headers specifically
                  const elementorHeaders = document.querySelectorAll('[data-elementor-type="header"], .elementor-location-header, [data-elementor-id="8446"]');
                  elementorHeaders.forEach(header => {
                    header.style.display = 'none';
                  });
                  
                  // Hide common header elements
                  const headers = document.querySelectorAll('header, .header, #header, nav, .navbar, .nav-bar, [role="banner"], .skip-link, .page-header, .entry-title');
                  headers.forEach(header => {
                    header.style.display = 'none';
                  });
                  
                  // Hide Intercom widget
                  const intercomElements = document.querySelectorAll('#intercom-container, #intercom-frame, iframe[name*="intercom"], [id*="intercom"], [class*="intercom"], .intercom-launcher, .intercom-messenger-frame');
                  intercomElements.forEach(el => {
                    el.style.display = 'none';
                  });
                  
                  // Hide elements with specific class patterns
                  const classPatterns = document.querySelectorAll('[class*="elementor-element-4e7728f"]');
                  classPatterns.forEach(el => {
                    if (el.tagName !== 'MAIN' && el.tagName !== 'ARTICLE' && el.tagName !== 'SECTION' && el.id !== 'content') {
                      el.style.display = 'none';
                    }
                  });
                  
                  // Hide any fixed/sticky elements at the top
                  const allElements = document.querySelectorAll('*');
                  allElements.forEach(el => {
                    const style = window.getComputedStyle(el);
                    if ((style.position === 'fixed' || style.position === 'sticky') && 
                        (parseInt(style.top) === 0 || style.top === '0px')) {
                      el.style.display = 'none';
                    }
                  });
                }
                
                // Run immediately
                hideElements();
                
                // Run after DOM is fully loaded
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', hideElements);
                } else {
                  hideElements();
                }
                
                // Run after a delay to catch dynamically loaded elements
                setTimeout(hideElements, 1000);
                setTimeout(hideElements, 2000);
                
                // Observe for dynamically added elements
                const observer = new MutationObserver(hideElements);
                observer.observe(document.body, { childList: true, subtree: true });
              })();
              true;
            `}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',  // '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#121212',  // '#000',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 45,
    marginHorizontal: 10,
  },
  titleContainer: {
    backgroundColor: '#1A1A1A',
    height: '90%',
    width: '98%',
    borderRadius: 20,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#121212'  //'#fff',
  },
  webView: {
    flex: 1,
    backgroundColor: '#121212', // '#fff',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 1,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WebViewScreen;