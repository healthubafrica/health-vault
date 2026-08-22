import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  User,
  UserCheck,
  Users,
  Share2,
  CreditCard,
  Receipt,
  Crown,
  Bell,
  BellRing,
  Lock,
  ShieldCheck,
  Plane,
  Globe,
  HelpCircle,
  FileText,
  Shield,
  Info,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '@/lib/stores/authStore';
import TopHeaderEmergency from '@/components/TopHeaderEmergency';
import { patients } from '@/lib/api';

export default function MoreMenuScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { data: careTeamData } = useQuery({
    queryKey: ['care-team'],
    queryFn: () => patients.getMyCareTeam(),
  });
  const careTeamCount = careTeamData?.data.length ?? 0;

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'My Account';
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';
  const email = user?.email ?? '';

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of MyHealth Vault+?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
        <TopHeaderEmergency />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>MY PROFILE</Text>

          {/* User Card */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/my-profile')}
            style={[styles.userCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.avatarBox, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: theme.text }]}>{displayName}</Text>
              <Text style={[styles.userEmail, { color: theme.textMuted }]}>{email}</Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          {/* Edit Profile */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/my-profile')}
            style={[styles.menuRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <User size={20} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Edit Profile</Text>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          {/* Medical History */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/medical-history')}
            style={[styles.menuRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <UserCheck size={20} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Medical History</Text>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Providers & Care Team */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>PROVIDERS & CARE TEAM</Text>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/my-care-team')}
            style={[styles.menuRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Users size={20} color={theme.primary} />
            <View style={styles.rowMiddle}>
              <Text style={[styles.menuText, { color: theme.text }]}>My Care Team</Text>
              <Text style={[styles.menuSub, { color: theme.textMuted }]}>
                {careTeamCount} provider{careTeamCount === 1 ? '' : 's'} added
              </Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/share-records')}
            style={[styles.menuRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Share2 size={20} color={theme.primary} />
            <View style={styles.rowMiddle}>
              <Text style={[styles.menuText, { color: theme.text }]}>Share My Records</Text>
              <Text style={[styles.menuSub, { color: theme.textMuted }]}>Grant temporary access to clinicians</Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/travelsafe')}
            style={[styles.menuRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Plane size={20} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>TravelSafe Trips</Text>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Payments & Billing */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>PAYMENTS & BILLING</Text>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/payment-methods')}
            style={[styles.menuRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <CreditCard size={20} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Payment Methods</Text>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/invoices')}
            style={[styles.menuRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Receipt size={20} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Invoices & Receipts</Text>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/subscription')}
            style={[styles.menuRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Crown size={20} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Subscription Plan</Text>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

        </View>

        {/* Settings & Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>SETTINGS & PREFERENCES</Text>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/notifications')}
            style={[styles.menuRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Bell size={20} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Notifications</Text>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/notification-preferences')}
            style={[styles.menuRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <BellRing size={20} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Notification Preferences</Text>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/privacy-security')}
            style={[styles.menuRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Lock size={20} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Privacy & Security</Text>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/consents')}
            style={[styles.menuRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ShieldCheck size={20} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Consents & Permissions</Text>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/language-region')}
            style={[styles.menuRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Globe size={20} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Language & Region</Text>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Support & Legal */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>SUPPORT & LEGAL</Text>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/help-support')}
            style={[styles.menuRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <HelpCircle size={20} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Help & Support</Text>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/terms-conditions')}
            style={[styles.menuRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <FileText size={20} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Terms & Conditions</Text>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/privacy-policy')}
            style={[styles.menuRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Shield size={20} color={theme.primary} />
            <Text style={[styles.menuText, { color: theme.text }]}>Privacy Policy</Text>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/about-app')}
            style={[styles.menuRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Info size={20} color={theme.primary} />
            <View style={styles.rowMiddle}>
              <Text style={[styles.menuText, { color: theme.text }]}>About MyHealth Vault+</Text>
              <Text style={[styles.menuSub, { color: theme.textMuted }]}>Version 2.1.0</Text>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleLogout}
            style={[styles.logoutBtn, { backgroundColor: theme.surface, borderColor: theme.emergency }]}>
            <LogOut size={20} color={theme.emergency} />
            <Text style={[styles.logoutBtnText, { color: theme.emergency }]}>Logout</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  section: {
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  rowMiddle: {
    flex: 1,
  },
  menuText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  menuSub: {
    fontSize: 11,
    marginTop: 1,
  },
  logoutSection: {
    marginBottom: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
