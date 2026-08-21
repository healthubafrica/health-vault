import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  Calendar,
  Bike,
  Plus,
  FlaskConical,
  Video,
  ShieldCheck,
  Heart,
  Sparkles,
  CheckCircle2,
  PhoneCall,
  Clock,
  Home,
  User,
  Menu,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import EmergencyFAB from '@/components/EmergencyFAB';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 44) / 2;

interface ServiceGridItem {
  id: string;
  name: string;
  tagline: string;
  logo: any;
  categoryIcon: any;
  categoryIconColor: string;
  categoryIconBg: string;
  route?: string;
  actionText: string;
}

export default function ServicesHubScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  // Current formatted date
  const todayDateString = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const serviceGridList: ServiceGridItem[] = [
    {
      id: 'dispatch-care',
      name: 'DispatchCare',
      tagline: 'Rapid Response, Lifesaving Care!',
      logo: require('@/assets/images/dispatch care.png'),
      categoryIcon: Bike,
      categoryIconColor: '#C0392B',
      categoryIconBg: '#FDECEA',
      route: '/emergency',
      actionText: 'Dispatch Emergency',
    },
    {
      id: 'minute-care',
      name: 'MinuteCare',
      tagline: 'Quick Care, Anytime, Anywhere',
      logo: require('@/assets/images/Minute care.png'),
      categoryIcon: Plus,
      categoryIconColor: '#137333',
      categoryIconBg: '#EAF5E2',
      route: '/appointments',
      actionText: 'Book MinuteCare',
    },
    {
      id: 'care-test',
      name: 'CareTest',
      tagline: 'Fast, Accurate, and Comprehensive Testing',
      logo: require('@/assets/images/Caretest.png'),
      categoryIcon: FlaskConical,
      categoryIconColor: '#1565C0',
      categoryIconBg: '#E3F2FD',
      route: '/(tabs)/records',
      actionText: 'Order Lab Test',
    },
    {
      id: 'telecare',
      name: 'TeleCare',
      tagline: 'Telemedicine Services - Anywhere, Anytime',
      logo: require('@/assets/images/Telecare.png'),
      categoryIcon: Video,
      categoryIconColor: '#0E4A30',
      categoryIconBg: '#EBF5EC',
      route: '/(tabs)/telecare',
      actionText: 'Start TeleCare',
    },
    {
      id: 'health-consult',
      name: 'Health Consult',
      tagline: 'Personalized Medicine & Healthcare',
      logo: require('@/assets/images/Health Consult.png'),
      categoryIcon: ShieldCheck,
      categoryIconColor: '#E8930A',
      categoryIconBg: '#FFF4E0',
      route: '/book-appointment-step1',
      actionText: 'Book Consult',
    },
    {
      id: 'myhealth-vault',
      name: 'MyHealth Vault+',
      tagline: 'Smart Health & Safety Solutions',
      logo: require('@/assets/images/myhealth vault+.png'),
      categoryIcon: Heart,
      categoryIconColor: '#137333',
      categoryIconBg: '#EAF5E2',
      route: '/(tabs)/records',
      actionText: 'Open Health Vault',
    },
  ];

  const handleServicePress = (service: ServiceGridItem) => {
    if (service.route) {
      router.push(service.route as any);
    } else {
      Alert.alert(
        service.name,
        `${service.tagline}\n\nScheduling an on-demand encounter. DispatchCare and care specialists are notified in real-time.`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Top App Bar with Back Action & Title */}
      <View style={[styles.topNavBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={22} color={theme.primary} />
          <Text style={[styles.backText, { color: theme.primary }]}>Back</Text>
        </TouchableOpacity>

        <Text style={[styles.navTitle, { color: theme.text }]}>Services Hub</Text>

        <TouchableOpacity
          style={[styles.bellBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/notifications')}>
          <Bell size={18} color={theme.text} />
          <View style={[styles.bellBadge, { backgroundColor: theme.emergency }]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Template Header Section: Date & User Greeting */}
        <View style={styles.headerSection}>
          <View style={styles.dateRow}>
            <View style={[styles.dateBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Calendar size={14} color={theme.textMuted} />
              <Text style={[styles.dateText, { color: theme.textMuted }]}>{todayDateString}</Text>
            </View>
          </View>

          <View style={styles.userGreetingRow}>
            <Image
              source={require('@/assets/images/avatar.png')}
              style={styles.userAvatar}
              defaultSource={require('@/assets/images/logo-icon.png')}
            />
            <View style={styles.greetingTextCol}>
              <Text style={[styles.greetingTitle, { color: theme.text }]}>Hello, John Doe!</Text>
            </View>
          </View>

          <Text style={[styles.sectionPrompt, { color: theme.textMuted }]}>
            What are you looking for?
          </Text>
        </View>

        {/* 2-Column Grid of Services with Logos */}
        <View style={styles.servicesGrid}>
          {serviceGridList.map((service) => {
            const CategoryIcon = service.categoryIcon;
            return (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  {
                    width: CARD_WIDTH,
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => handleServicePress(service)}
                activeOpacity={0.85}>
                
                {/* Brand Logo Header */}
                <View style={styles.cardLogoContainer}>
                  <Image
                    source={service.logo}
                    style={styles.serviceLogoImage}
                    resizeMode="contain"
                  />
                </View>

                {/* Tagline / Description */}
                <Text
                  style={[styles.cardTagline, { color: theme.textMuted }]}
                  numberOfLines={2}
                  ellipsizeMode="tail">
                  {service.tagline}
                </Text>

                {/* Bottom Row: Category Icon Pill & Chevron */}
                <View style={styles.cardBottomRow}>
                  <View
                    style={[
                      styles.categoryIconPill,
                      { backgroundColor: service.categoryIconBg },
                    ]}>
                    <CategoryIcon size={18} color={service.categoryIconColor} />
                  </View>

                  <ChevronRight size={18} color={theme.textMuted} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Service Details Section */}
        <View style={styles.infoSection}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
            HOW OUR SERVICES WORK
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/emergency')}
            style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: theme.primaryLight }]}>
                <Bike size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailTitle, { color: theme.text }]}>DispatchCare — Rapid Medical Response</Text>
                <Text style={[styles.detailBody, { color: theme.textMuted }]}>
                  Emergency motorcycle responders and rapid ambulance dispatch for urgent home care and critical stabilization.
                </Text>
              </View>
              <ChevronRight size={18} color={theme.textMuted} style={{ alignSelf: 'center' }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/book-appointment-step1')}
            style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: '#EAF5E2' }]}>
                <Clock size={18} color="#137333" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailTitle, { color: theme.text }]}>MinuteCare — Quick Consultations</Text>
                <Text style={[styles.detailBody, { color: theme.textMuted }]}>
                  Immediate non-emergency primary care encounters with certified clinical officers and local pharmacies.
                </Text>
              </View>
              <ChevronRight size={18} color={theme.textMuted} style={{ alignSelf: 'center' }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/book-appointment-step1')}
            style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: '#E3F2FD' }]}>
                <FlaskConical size={18} color="#1565C0" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailTitle, { color: theme.text }]}>CareTest — At-Home Diagnostics</Text>
                <Text style={[styles.detailBody, { color: theme.textMuted }]}>
                  Certified phlebotomists collect lab samples at your doorstep with verified digital results uploaded directly to your Vault.
                </Text>
              </View>
              <ChevronRight size={18} color={theme.textMuted} style={{ alignSelf: 'center' }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Benefits Card */}
        <View style={[styles.benefitsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.benefitsRow}>
            <CheckCircle2 size={20} color={theme.status.success.border} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.benefitsTitle, { color: theme.text }]}>Why Choose Health Hub Africa?</Text>
              <View style={styles.bulletsList}>
                <Text style={[styles.bulletText, { color: theme.textMuted }]}>
                  • Single unified clinical record for all services
                </Text>
                <Text style={[styles.bulletText, { color: theme.textMuted }]}>
                  • Certified medical specialists and vetted dispatch teams
                </Text>
                <Text style={[styles.bulletText, { color: theme.textMuted }]}>
                  • Real-time digital results and prescription fulfillment
                </Text>
                <Text style={[styles.bulletText, { color: theme.textMuted }]}>
                  • Available 24/7 across South Africa and partner regions
                </Text>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Persistent Emergency Floating Action */}
      <EmergencyFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
  },
  headerSection: {
    marginBottom: 18,
  },
  dateRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAEAEA',
  },
  greetingTextCol: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionPrompt: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    marginBottom: 26,
  },
  serviceCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    minHeight: 165,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardLogoContainer: {
    height: 42,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceLogoImage: {
    width: '100%',
    height: 38,
    alignSelf: 'flex-start',
  },
  cardTagline: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    marginBottom: 12,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  categoryIconPill: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  detailCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  detailBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  benefitsCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  benefitsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  bulletsList: {
    gap: 6,
  },
  bulletText: {
    fontSize: 12,
    lineHeight: 18,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 12,
  },
  bottomNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 60,
    width: '90%',
    borderRadius: 30,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  navHomePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  navHomePillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  navItemBtn: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
