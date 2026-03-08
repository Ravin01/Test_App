import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const NotFoundScreen = ({ 
  onGoHome, 
  onGoBack,
  title = "Page Not Found",
  message = "Sorry, the page you're looking for doesn't exist or has been moved."
}) => {

  const handleGoHome = () => {
    onGoHome && onGoHome();
  };

  const handleGoBack = () => {
    onGoBack && onGoBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* 404 Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.numberContainer}>
            <Text style={styles.fourText}>4</Text>
            <View style={styles.zeroContainer}>
              <Icon name="search-off" size={60} color="#F7CE45" />
            </View>
            <Text style={styles.fourText}>4</Text>
          </View>
          <View style={styles.decorativeLine} />
        </View>

        {/* Error Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{message}</Text>
        </View>

        {/* Suggestions */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>What you can do:</Text>
          <View style={styles.suggestionItem}>
            <Icon name="refresh" size={16} color="#CCCCCC" />
            <Text style={styles.suggestionText}>Check the Internet and try again</Text>
          </View>
          <View style={styles.suggestionItem}>
            <Icon name="home" size={16} color="#CCCCCC" />
            <Text style={styles.suggestionText}>Go back to the homepage</Text>
          </View>
          <View style={styles.suggestionItem}>
            <Icon name="arrow-back" size={16} color="#CCCCCC" />
            <Text style={styles.suggestionText}>Return to the previous page</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.goBackButton]}
            onPress={handleGoBack}
            activeOpacity={0.8}
          >
            <Icon name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.homeButton]}
            onPress={handleGoHome}
            activeOpacity={0.8}
          >
            <Text style={styles.homeButtonText}>Go Home</Text>
            <Icon name="home" size={20} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            If this problem persists, please contact support
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    width: '100%',
    backgroundColor: '#000000', // Changed to black
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  numberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  fourText: {
    fontSize: 120,
    fontWeight: 'bold',
    color: '#FFFFFF', // Changed to white
    lineHeight: 120,
  },
  zeroContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1A1A1A', // Dark background instead of light yellow
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    borderWidth: 3,
    borderColor: '#F7CE45', // Keep the yellow accent
  },
  decorativeLine: {
    width: 60,
    height: 3,
    backgroundColor: '#F7CE45', // Keep the yellow accent
    borderRadius: 2,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF', // Changed to white
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC', // Light gray for secondary text
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: width - 80,
  },
  suggestionsContainer: {
    backgroundColor: '#1A1A1A', // Dark gray background
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#333333', // Dark border
    width: '100%',
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
    marginBottom: 15,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  suggestionText: {
    fontSize: 14,
    color: '#CCCCCC', // Light gray text
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 20,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  goBackButton: {
    backgroundColor: '#333333', // Dark gray background
    borderWidth: 1,
    borderColor: '#555555', // Slightly lighter border
  },
  homeButton: {
    backgroundColor: '#F7CE45', // Keep the yellow accent for primary action
    elevation: 3,
    shadowColor: '#F7CE45',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  goBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // White text
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000', // Keep black text on yellow button for contrast
  },
  footer: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333', // Dark border
    width: '100%',
  },
  footerText: {
    fontSize: 14,
    color: '#888888', // Medium gray for footer text
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default NotFoundScreen;