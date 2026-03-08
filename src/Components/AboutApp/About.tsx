import { ArrowLeftCircle } from 'lucide-react-native';
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import { colors } from '../../Utils/Colors';
const { width,height } = Dimensions.get('window');
import { SafeAreaView } from 'react-native-safe-area-context';
// import { handleGoBack } from '../../Utils/dateUtils';
import { useDebouncedGoBack } from '../../Utils/useDebouncedGoBack';
import { profileImg } from '../../Utils/Constants';
import FastImage from 'react-native-fast-image';
// Responsive Design Imports
import { useTheme, useThemedStyles } from '../../Theme/ResponsiveTheme';
import { useResponsiveScreen } from '../../Utils/ResponsiveScreenWrapper';
import { getAccessibilityProps } from '../../Utils/AccessibilityUtils';
import { flykupLogo } from '../../assets/assets';

interface ServiceItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface TeamMemberProps {
  name: string;
  role: string;
  image: string;
}

const ServiceItem: React.FC<ServiceItemProps> = ({ icon, title, description }) => (
  <View style={styles.serviceItem}>
    <View style={styles.serviceIcon}>{icon}</View>
    <View style={styles.serviceContent}>
      <Text style={styles.serviceTitle}>{title}</Text>
      <Text style={styles.serviceDescription}>{description}</Text>
    </View>
  </View>
);

const TeamMember: React.FC<TeamMemberProps> = ({ name, role, image }) => (
  <View style={styles.teamMember}>
    <View style={styles.teamImageContainer}>
      <FastImage source={{ uri: profileImg,
      priority:'high'
      }} style={styles.teamImage} />
    </View>
    <Text style={styles.teamName}>{name}</Text>
    <Text style={styles.teamRole}>{role}</Text>
  </View>
);
 
const FlyKupAboutScreen= ({navigation}) => {
  const handleGoBack = useDebouncedGoBack(() => navigation.goBack(), 500);
  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <ArrowLeftCircle color={'#fff'} size={24}/>
        </TouchableOpacity>
         <LinearGradient
                 
               colors={['#B38728', '#FFD700']}
                       start={{ x: 0, y: 0 }}
                       end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
              >
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>About</Text>
                </View>
              </LinearGradient>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
        <Image 
          source={{uri:flykupLogo}}
          style={styles.logoContainer} 
        //   style={styles.logoContainer}
          />
        </View>

        {/* About FlyKup */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About <Text style={styles.sectionTitleBorder}>Flykup</Text></Text>
          <Text style={styles.sectionSubtitle}>India's First Glass Commerce–Powered Live Commerce Engine</Text>
          <Text style={styles.aboutText}>
            Where brands and sellers sell through entertainment and own their customers — instead of losing them to marketplaces.
          </Text>
        </View>

        {/* What We Are */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What We Are</Text>
          <Text style={styles.aboutText}>
            Flykup turns shopping into a live broadcast entertainment show — where products drop, bids rise, giveaways explode, and checkouts happen in just one tap.
          </Text>
          <Text style={styles.highlightText}>
            Sell-outs in minutes.{'\n'}Not in months.
          </Text>
        </View>

        {/* What Drives Us */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Drives Us — Velocity Commerce</Text>
          <Text style={styles.aboutText}>
            We don't chase vanity GMV.{'\n'}We chase velocity:
          </Text>
          <View style={styles.bulletContainer}>
            <Text style={styles.bulletPoint}>✓ Faster sell-outs</Text>
            <Text style={styles.bulletPoint}>✓ Faster payouts</Text>
            <Text style={styles.bulletPoint}>✓ Faster growth</Text>
          </View>
          <Text style={styles.taglineText}>
            Because commerce should be as fast as content.
          </Text>
        </View>

        {/* Glass Commerce Engine */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>The Glass Commerce Engine™</Text>
          <Text style={styles.aboutText}>
            Built to give sellers complete control:
          </Text>
          <View style={styles.featureContainer}>
            <Text style={styles.featurePoint}>✔ Zero commission</Text>
            <Text style={styles.featurePoint}>✔ Full CRM & customer data ownership</Text>
            <Text style={styles.featurePoint}>✔ Transparent analytics & payouts</Text>
            <Text style={styles.featurePoint}>✔ No algorithmic black boxes</Text>
          </View>
          <Text style={styles.taglineText}>
            You built the audience. You deserve the data.
          </Text>
        </View>

        {/* Entertainment + Commerce */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entertainment + Commerce Together</Text>
          <Text style={styles.aboutText}>Flykup combines:</Text>
          <View style={styles.serviceContainer}>
            <ServiceItem
              icon={<FontAwesome6 name="bolt" size={24} color="#F59E0B" />}
              title="Flash Drops"
              description="Lightning-fast product launches that sell out in minutes"
            />
            <ServiceItem
              icon={<FontAwesome6 name="gavel" size={24} color="#60A5FA" />}
              title="Live Auctions"
              description="Real-time competitive bidding for exclusive deals"
            />
            <ServiceItem
              icon={<FontAwesome6 name="gift" size={24} color="#EC4899" />}
              title="Giveaways"
              description="Engage your audience with exciting prize opportunities"
            />
            <ServiceItem
              icon={<FontAwesome6 name="clapperboard" size={24} color="#8B5CF6" />}
              title="Shoppable Videos"
              description="Turn content into instant purchases"
            />
            <ServiceItem
              icon={<FontAwesome6 name="share-nodes" size={24} color="#10B981" />}
              title="Simulcast to YouTube, Instagram, FB & More"
              description="Broadcast to multiple platforms simultaneously"
            />
          </View>
          <Text style={styles.taglineText}>
            All actions — watch → bid → share → buy — convert instantly.
          </Text>
        </View>

        {/* Vision */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vision</Text>
          <Text style={styles.aboutText}>
            To build the world's most transparent, seller-first live commerce ecosystem — starting in India and scaling globally.
          </Text>
        </View>

        {/* Mission */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mission</Text>
          <View style={styles.missionContainer}>
            <Text style={styles.missionPoint}>1) Empower sellers with instant, high-velocity live commerce tools</Text>
            <Text style={styles.missionPoint}>2) Enable brands to own their customers & community</Text>
            <Text style={styles.missionPoint}>3) Remove commissions and gatekeepers from online selling</Text>
            <Text style={styles.missionPoint}>4) Turn content into commerce through influencers & creators</Text>
            <Text style={styles.missionPoint}>5) Make commerce fun, fast, and profitable for everyone</Text>
          </View>
        </View>

        {/* Core Belief */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Core Belief</Text>
          <Text style={styles.beliefText}>
            Selling shouldn't feel like listing products…{'\n'}It should feel like going live and winning.
          </Text>
        </View>

        {/* Built for India */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Built for India. Built for Sellers.</Text>
          <Text style={styles.ctaDesc}>
            From textile cities in TN to creators across India —{'\n'}every seller deserves transparent growth.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:colors.primaryColor,
  },
  header: {
   flexDirection: 'row',
    // marginTop: Platform.select({ ios: 10, android: height * 0.01 }),
    alignItems: 'center',
    gap: width * 0.10,
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.02,
    marginBottom: 10
  },
  
  headerGradient: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    height: height * 0.045,
    width: '60%',
  },
  titleContainer: {
    backgroundColor: '#1A1A1A',
    height: '90%',
    borderRadius: 20,
    width: '98%',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: Math.min(18, width * 0.045),
    fontWeight: 'bold',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  logoContainer: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoText: {
    color: '#000',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  logoSubtext: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
    letterSpacing: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 22,
    
    fontWeight: 'bold',
    paddingBottom:10,
    marginBottom: 15,
  },
  sectionTitleBorder:{
    fontSize: 22,
    // width:200,
        color: '#fff',
    borderBottomWidth:1,
    borderBottomColor:'#F7CE45',
  },
  aboutText: {
    color: '#CCCCCC',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'justify',
  },
  sectionSubtitle: {
    color: '#FFD700',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    marginTop: -10,
  },
  highlightText: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 28,
  },
  bulletContainer: {
    marginTop: 15,
    marginBottom: 15,
  },
  bulletPoint: {
    color: '#4ADE80',
    fontSize: 16,
    lineHeight: 28,
    paddingLeft: 10,
  },
  taglineText: {
    color: '#FFD700',
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 15,
    lineHeight: 22,
  },
  featureContainer: {
    marginTop: 15,
    marginBottom: 15,
  },
  featurePoint: {
    color: '#10B981',
    fontSize: 16,
    lineHeight: 28,
    paddingLeft: 10,
  },
  missionContainer: {
    marginTop: 10,
  },
  missionPoint: {
    color: '#CCCCCC',
    fontSize: 15,
    lineHeight: 26,
    marginBottom: 12,
    paddingLeft: 5,
  },
  beliefText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
    fontStyle: 'italic',
  },
  serviceContainer:{
    backgroundColor:'#000000',
    elevation: 5,
    paddingHorizontal:10,
    borderRadius:10,
    padding: 15,
  },
  serviceItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  serviceIcon: {
    marginRight: 15,
    marginTop: 2,
  },
  serviceContent: {
    flex: 1,
  },
  serviceTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  serviceDescription: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
  },
  productShowcase: {
    alignItems: 'center',
    marginBottom: 40,
  },
  productCircle: {
    // width: 150,
    // height: 150,
    padding:20,
    backgroundColor:'#F7CE4578',
    borderRadius: 175,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  productImage: {
    width: 160,
    height: 210,
    bottom:0,
    resizeMode: 'cover',position:'absolute'
  },
  productTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  productDesc: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  leadershipDesc: {
    color: '#CCCCCC',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 25,
    textAlign: 'center',
  },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  teamMember: {
    width: '22%',
    alignItems: 'center',
    marginBottom: 20,
  },
  teamImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  teamImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  teamName: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  teamRole: {
    color: '#CCCCCC',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  ctaSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    marginBottom: 30,
  },
  ctaTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  ctaDesc: {
    color: '#CCCCCC',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  ctaButton: {
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor:'#F7CE45',
       paddingHorizontal: 20,
    paddingVertical: 10,
  },
  ctaButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
});

export default FlyKupAboutScreen;
