const fs = require('fs');
const path = require('path');

// List of all screens that need to be made responsive
const screensToUpdate = [
  // Authentication Screens
  'src/Components/AuthScreens/Register.tsx',
  'src/Components/AuthScreens/OTPScreen.tsx',
  'src/Components/AuthScreens/OnboardingScreen.tsx', 
  'src/Components/AuthScreens/DeliveryScreen.tsx',
  'src/Components/AuthScreens/ForgotPassword.tsx',
  'src/Components/AuthScreens/ConfirmPassword.tsx',
  'src/Components/AuthScreens/ConfirmReset.tsx',
  'src/Components/AuthScreens/ResetSuccess.tsx',
  'src/Components/AuthScreens/Verify.tsx',
  'src/Components/AuthScreens/VerifyOtp.tsx',
  'src/Components/AuthScreens/VerifySuccess.tsx',
  'src/Components/AuthScreens/WelcomeScreen.tsx',
  'src/Components/AuthScreens/MapAddressget.tsx',

  // Main Components
  'src/Components/Dashboard.tsx',
  'src/Components/CategoriesScreen/Categories.tsx',

  // Seller Components
  'src/Components/SellerComponents/SellerForm/SellerFormIndex.tsx',
  'src/Components/SellerComponents/SellerForm/SuccessScreen.tsx',
  'src/Components/SellerComponents/ProductsScreen/Products.tsx',
  'src/Components/SellerComponents/ProductsScreen/AddingProducts.tsx',
  'src/Components/SellerComponents/ProductsScreen/ProductAnalytics.tsx',
  'src/Components/SellerComponents/LiveStreaming/LiveStreaming.tsx',
  'src/Components/SellerComponents/LiveStreaming/StreamPreviewScreen.tsx',
  'src/Components/SellerComponents/LiveStreaming/RegistrationsScreen.tsx',
  'src/Components/SellerComponents/ORM/SellerOrders.tsx',

  // Shows & Live Streaming
  'src/Components/Shows/Shows.tsx',
  'src/Components/Shows/LiveScreen.tsx',
  'src/Components/Shows/StoreScreen.tsx',
  'src/Components/Shows/PreBiddingScreen.tsx',

  // Order Management
  'src/Components/MyActivity/MainActivity.tsx',
  'src/Components/MyActivity/OrderDetailedScreen.tsx',
  'src/Components/MyActivity/ReturnReasonScreen.tsx',
  'src/Components/MyActivity/ReturnOrderScreen.tsx',
  'src/Components/MyActivity/ReturnConfirmScreen.tsx',
  'src/Components/MyActivity/ExchangeReasonScreen.tsx',
  'src/Components/MyActivity/ExchangeConfirmScreen.tsx',
  'src/Components/MyActivity/CancelOrderScreen.tsx',
  'src/Components/MyActivity/CancelConfirmScreen.tsx',

  // Chat & Communication
  'src/Components/ChatScreens/ChatScreen.tsx',
  'src/Components/ChatScreens/UltraChatScreen.tsx',
  'src/Components/ChatScreens/IntegratedUltraChatScreen.tsx',

  // Profile & Settings
  'src/Components/Profile/AboutUser.tsx',
  'src/Components/Profile/SavedScreen.tsx',
  'src/Components/Profile/VerificationFlowScreen.tsx',
  'src/Components/SellerProfile/ViewSellerProfile.tsx',
  'src/Components/SellerProfile/SubscriptionScreen.tsx',
  'src/Components/AboutApp/Settings.tsx',
  'src/Components/AboutApp/About.tsx',
  'src/Components/AboutApp/FAQ.tsx',
  'src/Components/AboutApp/Terms&condition.tsx',
  'src/Components/AboutApp/PrivacyPolicy.tsx',

  // Payment
  'src/Components/Payment/CashfreePaymentGateway.tsx',
  'src/Components/Payment/PaymentSuccess.tsx',
  'src/Components/Payment/PaymentFailed.tsx',

  // Notifications & Search
  'src/Components/NotificationScreen.tsx',
  'src/Components/GloabalSearch/GlobalSearch.tsx',

  // Analytics
  'src/Components/AnalyticalScreens/Analyse.tsx',
];

// Template for responsive screen wrapper
const responsiveWrapperTemplate = `
// Responsive imports - Add these to your existing imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { ResponsiveText, ResponsiveButton, ResponsiveInput } from '../ResponsiveComponents/ResponsiveComponents';

// Add this hook inside your component function:
// const { theme } = useTheme();
// const { styles: responsiveStyles } = useResponsiveScreen();

// Replace hardcoded styles with responsive ones:
// Example: fontSize: 16 → fontSize: theme.typography.medium
// Example: padding: 20 → padding: theme.spacing.lg
// Example: <Text> → <ResponsiveText>
// Example: <TouchableOpacity> (for buttons) → <ResponsiveButton>
// Example: <TextInput> → <ResponsiveInput>

// Add accessibility props to touchable elements:
// {...getAccessibilityProps('Button label', 'Button action description', 'button')}
`;

// Function to add responsive imports to a file
function addResponsiveImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if responsive imports already exist
    if (content.includes('useTheme')) {
      console.log(`✓ ${filePath} - Already has responsive imports`);
      return;
    }

    // Find the last import statement
    const importRegex = /^import.*from.*['"];$/gm;
    let lastImportIndex = -1;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      lastImportIndex = match.index + match[0].length;
    }

    if (lastImportIndex === -1) {
      console.log(`⚠ ${filePath} - No imports found, skipping`);
      return;
    }

    // Add responsive imports after the last import
    const responsiveImports = `
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';`;

    content = content.slice(0, lastImportIndex) + responsiveImports + content.slice(lastImportIndex);

    // Add a comment block with instructions
    const instructionComment = `
/*
RESPONSIVE DESIGN INTEGRATION GUIDE:
1. Add this inside your component function:
   const { theme } = useTheme();
   const { styles: responsiveStyles } = useResponsiveScreen();

2. Replace hardcoded values:
   - fontSize: 16 → fontSize: theme.typography.medium
   - padding: 20 → padding: theme.spacing.lg
   - margin: 10 → margin: theme.spacing.sm
   - backgroundColor: '#FFFFFF' → backgroundColor: theme.colors.background

3. Use responsive components:
   - <Text> → <ResponsiveText variant="body">
   - <TouchableOpacity> (buttons) → <ResponsiveButton>
   - <TextInput> → <ResponsiveInput>

4. Add accessibility:
   - Add {...getAccessibilityProps('Label', 'Description', 'button')} to touchable elements

5. Use responsive styles:
   - style={responsiveStyles.container} for main containers
   - style={responsiveStyles.title} for titles
   - style={responsiveStyles.primaryButton} for primary buttons
*/`;

    // Find the component function and add the comment before it
    const componentRegex = /(export\s+default\s+function\s+\w+|const\s+\w+\s*=\s*\(\s*\)\s*=>|function\s+\w+\s*\()/;
    const componentMatch = content.match(componentRegex);
    
    if (componentMatch) {
      const insertIndex = componentMatch.index;
      content = content.slice(0, insertIndex) + instructionComment + '\n\n' + content.slice(insertIndex);
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${filePath} - Added responsive imports and instructions`);
    
  } catch (error) {
    console.log(`✗ ${filePath} - Error: ${error.message}`);
  }
}

// Function to create a responsive version of a screen
function createResponsiveVersion(originalPath) {
  try {
    const dir = path.dirname(originalPath);
    const fileName = path.basename(originalPath, '.tsx');
    const responsivePath = path.join(dir, `Responsive${fileName}.tsx`);

    // Check if responsive version already exists
    if (fs.existsSync(responsivePath)) {
      console.log(`✓ ${responsivePath} - Responsive version already exists`);
      return responsivePath;
    }

    let content = fs.readFileSync(originalPath, 'utf8');
    
    // Add responsive imports
    const responsiveImports = `
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { ResponsiveText, ResponsiveButton, ResponsiveInput } from '../ResponsiveComponents/ResponsiveComponents';`;

    // Find the last import and add responsive imports
    const importRegex = /^import.*from.*['"];$/gm;
    let lastImportIndex = -1;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      lastImportIndex = match.index + match[0].length;
    }

    if (lastImportIndex !== -1) {
      content = content.slice(0, lastImportIndex) + responsiveImports + content.slice(lastImportIndex);
    }

    // Update the component name to be responsive
    content = content.replace(
      new RegExp(`export default function ${fileName}`, 'g'),
      `export default function Responsive${fileName}`
    );

    // Add responsive hooks at the start of the component
    const hookTemplate = `
  // Responsive Design Hooks
  const { theme } = useTheme();
  const { styles: responsiveStyles } = useResponsiveScreen();
`;

    // Find the component function body and add hooks
    const functionBodyRegex = /(\{\s*$)/m;
    content = content.replace(functionBodyRegex, `{${hookTemplate}`);

    fs.writeFileSync(responsivePath, content, 'utf8');
    console.log(`✓ Created responsive version: ${responsivePath}`);
    
    return responsivePath;
    
  } catch (error) {
    console.log(`✗ Error creating responsive version of ${originalPath}: ${error.message}`);
    return null;
  }
}

// Main execution
console.log('🚀 Starting responsive design integration...\n');

let updatedCount = 0;
let createdCount = 0;

screensToUpdate.forEach(screenPath => {
  const fullPath = path.join(__dirname, '..', screenPath);
  
  if (fs.existsSync(fullPath)) {
    // Add responsive imports to existing file
    addResponsiveImports(fullPath);
    updatedCount++;
    
    // Create a responsive version
    const responsivePath = createResponsiveVersion(fullPath);
    if (responsivePath) {
      createdCount++;
    }
  } else {
    console.log(`⚠ File not found: ${fullPath}`);
  }
});

console.log('\n📊 Summary:');
console.log(`✓ Updated ${updatedCount} existing screens with responsive imports`);
console.log(`✓ Created ${createdCount} responsive screen versions`);
console.log('\n🎯 Next Steps:');
console.log('1. Update navigation files to use responsive versions');
console.log('2. Follow the integration guide comments in each file');
console.log('3. Test on different screen sizes');
console.log('4. Replace hardcoded styles with responsive equivalents');

console.log('\n🔧 Quick Replace Guide:');
console.log('- fontSize: 14 → fontSize: theme.typography.medium');
console.log('- padding: 16 → padding: theme.spacing.md'); 
console.log('- margin: 20 → margin: theme.spacing.lg');
console.log('- backgroundColor: "#FFFFFF" → backgroundColor: theme.colors.background');
console.log('- <Text> → <ResponsiveText variant="body">');
console.log('- <TouchableOpacity> → <ResponsiveButton> (for buttons)');
console.log('- <TextInput> → <ResponsiveInput>');