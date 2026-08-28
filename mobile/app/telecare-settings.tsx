import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Bell,
  Video,
  Headphones,
  Info,
  HelpCircle,
  ChevronRight,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import EmergencyFAB from '@/components/EmergencyFAB';

export default function TeleCareSettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [selectedCamera, setSelectedCamera] = useState('front');
  const [selectedMic, setSelectedMic] = useState('built-in');
  const [selectedSpeaker, setSelectedSpeaker] = useState('speaker');
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [enableRecording, setEnableRecording] = useState(false);

  const cameras = [
    { id: 'front', label: 'Front Camera', desc: 'Default camera' },
    { id: 'back', label: 'Back Camera', desc: 'Rear-facing camera' },
  ];

  const microphones = [
    { id: 'built-in', label: 'Built-in Microphone', desc: 'Device microphone' },
    { id: 'headset', label: 'Headset', desc: 'Wired / Bluetooth headset mic' },
  ];

  const speakers = [
    { id: 'speaker', label: 'Device Speaker', desc: 'Built-in speaker' },
    { id: 'earpiece', label: 'Earpiece', desc: 'Phone earpiece' },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={22} color={theme.primary} />
          <Text style={[styles.backText, { color: theme.primary }]}>Back</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>

        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Audio & Video Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>AUDIO & VIDEO</Text>

          {/* Camera Selection */}
          <View style={styles.subGroup}>
            <Text style={[styles.groupLabel, { color: theme.text }]}>Camera</Text>
            <View style={styles.radioGroup}>
              {cameras.map((cam) => {
                const isSelected = selectedCamera === cam.id;
                return (
                  <TouchableOpacity
                    key={cam.id}
                    onPress={() => setSelectedCamera(cam.id)}
                    activeOpacity={0.75}
                    style={[
                      styles.radioItem,
                      {
                        backgroundColor: theme.surface,
                        borderColor: isSelected ? '#277eff' : theme.border,
                      },
                    ]}>
                    <View
                      style={[
                        styles.radioOuter,
                        { borderColor: isSelected ? '#277eff' : theme.textMuted },
                      ]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.radioTextContainer}>
                      <Text style={[styles.radioLabel, { color: theme.text }]}>{cam.label}</Text>
                      <Text style={[styles.radioDesc, { color: theme.textMuted }]}>{cam.desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Microphone Selection */}
          <View style={styles.subGroup}>
            <Text style={[styles.groupLabel, { color: theme.text }]}>Microphone</Text>
            <View style={styles.radioGroup}>
              {microphones.map((mic) => {
                const isSelected = selectedMic === mic.id;
                return (
                  <TouchableOpacity
                    key={mic.id}
                    onPress={() => setSelectedMic(mic.id)}
                    activeOpacity={0.75}
                    style={[
                      styles.radioItem,
                      {
                        backgroundColor: theme.surface,
                        borderColor: isSelected ? '#277eff' : theme.border,
                      },
                    ]}>
                    <View
                      style={[
                        styles.radioOuter,
                        { borderColor: isSelected ? '#277eff' : theme.textMuted },
                      ]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.radioTextContainer}>
                      <Text style={[styles.radioLabel, { color: theme.text }]}>{mic.label}</Text>
                      <Text style={[styles.radioDesc, { color: theme.textMuted }]}>{mic.desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Speaker Selection */}
          <View style={styles.subGroup}>
            <Text style={[styles.groupLabel, { color: theme.text }]}>Speaker</Text>
            <View style={styles.radioGroup}>
              {speakers.map((spk) => {
                const isSelected = selectedSpeaker === spk.id;
                return (
                  <TouchableOpacity
                    key={spk.id}
                    onPress={() => setSelectedSpeaker(spk.id)}
                    activeOpacity={0.75}
                    style={[
                      styles.radioItem,
                      {
                        backgroundColor: theme.surface,
                        borderColor: isSelected ? '#277eff' : theme.border,
                      },
                    ]}>
                    <View
                      style={[
                        styles.radioOuter,
                        { borderColor: isSelected ? '#277eff' : theme.textMuted },
                      ]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.radioTextContainer}>
                      <Text style={[styles.radioLabel, { color: theme.text }]}>{spk.label}</Text>
                      <Text style={[styles.radioDesc, { color: theme.textMuted }]}>{spk.desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Session Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>SESSION SETTINGS</Text>

          {/* Notifications Toggle */}
          <View style={[styles.toggleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.toggleLeft}>
              <Bell size={20} color={theme.primary} />
              <View>
                <Text style={[styles.toggleTitle, { color: theme.text }]}>Notifications</Text>
                <Text style={[styles.toggleDesc, { color: theme.textMuted }]}>Call alerts and updates</Text>
              </View>
            </View>
            <Switch
              value={enableNotifications}
              onValueChange={setEnableNotifications}
              trackColor={{ false: theme.border, true: '#006022' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Recording Toggle */}
          <View style={[styles.toggleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.toggleLeft}>
              <Video size={20} color={theme.primary} />
              <View>
                <Text style={[styles.toggleTitle, { color: theme.text }]}>Recording</Text>
                <Text style={[styles.toggleDesc, { color: theme.textMuted }]}>Record this session (if allowed)</Text>
              </View>
            </View>
            <Switch
              value={enableRecording}
              onValueChange={setEnableRecording}
              trackColor={{ false: theme.border, true: '#006022' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* More Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>MORE OPTIONS</Text>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => Alert.alert('Test Audio', 'Playing audio diagnostic tone... Microphone and speaker calibrated.')}
            style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.menuLeft}>
              <Headphones size={20} color={theme.primary} />
              <View>
                <Text style={[styles.menuTitle, { color: theme.text }]}>Test Audio</Text>
                <Text style={[styles.menuDesc, { color: theme.textMuted }]}>Check mic & speaker</Text>
              </View>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => Alert.alert('Connection Info', 'Bandwidth: 14.8 Mbps\nLatency: 24 ms\nSFU Server: JNB-01 (Johannesburg)')}
            style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.menuLeft}>
              <Info size={20} color={theme.primary} />
              <View>
                <Text style={[styles.menuTitle, { color: theme.text }]}>Connection Info</Text>
                <Text style={[styles.menuDesc, { color: theme.textMuted }]}>Network details</Text>
              </View>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => Alert.alert('Help & Support', 'TeleCare video consultations require at least 1 Mbps stable connection. For support contact support@healthhub.africa')}
            style={[styles.menuItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.menuLeft}>
              <HelpCircle size={20} color={theme.primary} />
              <View>
                <Text style={[styles.menuTitle, { color: theme.text }]}>Help & Support</Text>
                <Text style={[styles.menuDesc, { color: theme.textMuted }]}>FAQs & troubleshooting</Text>
              </View>
            </View>
            <ChevronRight size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Emergency FAB */}
      <EmergencyFAB />
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
    paddingVertical: 12,
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  section: {
    marginBottom: 22,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  subGroup: {
    marginBottom: 16,
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  radioGroup: {
    gap: 8,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#277eff',
  },
  radioTextContainer: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  radioDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});
