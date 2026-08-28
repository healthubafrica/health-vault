import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  CheckCheck,
  FlaskConical,
  Calendar,
  Pill,
  Video,
  AlertTriangle,
  ShieldCheck,
  Clock,
  ChevronRight,
  BellOff,
} from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import TopHeaderEmergency from '@/components/TopHeaderEmergency';
import { notifications as notifApi, Notification as ApiNotification } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmptyState, ListSkeleton } from '@/components/states';

interface NotificationItem {
  id: string;
  category: 'clinical' | 'appointment' | 'medication' | 'telecare' | 'security';
  title: string;
  body: string;
  time: string;
  dateGroup: 'Today' | 'Earlier';
  isRead: boolean;
  route?: string;
  iconBg: string;
  iconColor: string;
}

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'clinical', label: 'Clinical & Labs' },
  { id: 'appointment', label: 'Appointments' },
  { id: 'medication', label: 'Medications' },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const qc = useQueryClient();

  const [activeFilter, setActiveFilter] = useState('all');

  const { data: apiNotifsData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notifApi.list(),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notifApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notifApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const KNOWN_CATEGORIES = new Set(['clinical', 'appointment', 'medication', 'telecare', 'security']);
  function categoryOf(type: string): NotificationItem['category'] {
    return KNOWN_CATEGORIES.has(type) ? (type as NotificationItem['category']) : 'clinical';
  }

  const notifications: NotificationItem[] = (apiNotifsData?.data ?? []).map((n: ApiNotification) => ({
    id: n.id,
    category: categoryOf(n.type),
    title: n.title,
    body: n.body,
    time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    dateGroup: new Date(n.createdAt).toDateString() === new Date().toDateString() ? 'Today' : 'Earlier',
    isRead: n.isRead,
    iconBg: n.isRead ? '#F5F5F5' : '#EAF5E2',
    iconColor: theme.primary,
  }));

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllAsRead = () => {
    markAllReadMutation.mutate();
  };

  const handleNotificationPress = (item: NotificationItem) => {
    if (!item.isRead) {
      markReadMutation.mutate(item.id);
    }
    if (item.route) {
      router.push(item.route as any);
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return !item.isRead;
    if (activeFilter === 'clinical') return item.category === 'clinical';
    if (activeFilter === 'appointment') return item.category === 'appointment';
    if (activeFilter === 'medication') return item.category === 'medication';
    return true;
  });

  const todayList = filteredNotifications.filter((n) => n.dateGroup === 'Today');
  const earlierList = filteredNotifications.filter((n) => n.dateGroup === 'Earlier');

  const renderCategoryIcon = (category: string, color: string) => {
    switch (category) {
      case 'clinical':
        return <FlaskConical size={18} color={color} />;
      case 'appointment':
        return <Calendar size={18} color={color} />;
      case 'medication':
        return <Pill size={18} color={color} />;
      case 'telecare':
        return <Video size={18} color={color} />;
      case 'security':
        return <ShieldCheck size={18} color={color} />;
      default:
        return <AlertTriangle size={18} color={color} />;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={22} color={theme.primary} />
          <Text style={[styles.backText, { color: theme.primary }]}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[styles.badgePill, { backgroundColor: theme.primary }]}>
              <Text style={styles.badgePillText}>{unreadCount} new</Text>
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
          <TopHeaderEmergency />
          {unreadCount > 0 && (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleMarkAllAsRead}
              style={styles.markAllBtn}>
              <CheckCheck size={18} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTER_TABS.map((tab) => {
            const isSelected = activeFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveFilter(tab.id)}
                activeOpacity={0.8}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? '#FFFFFF' : theme.textMuted },
                  ]}>
                  {tab.label}
                  {tab.id === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : filteredNotifications.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title="No notifications"
            description={
              activeFilter === 'all'
                ? 'Important clinical results and reminders will appear here.'
                : 'No notifications in this category right now.'
            }
          />
        ) : (
          <>
            {/* Today Group */}
            {todayList.length > 0 && (
              <View style={styles.sectionGroup}>
                <Text style={[styles.groupHeading, { color: theme.textMuted }]}>TODAY</Text>
                {todayList.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    onPress={() => handleNotificationPress(item)}
                    style={[
                      styles.notificationCard,
                      {
                        backgroundColor: item.isRead ? theme.surface : theme.surface,
                        borderColor: !item.isRead ? theme.primary : theme.border,
                        borderLeftWidth: !item.isRead ? 4 : 1,
                        borderLeftColor: !item.isRead ? theme.primary : theme.border,
                      },
                    ]}>
                    <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
                      {renderCategoryIcon(item.category, item.iconColor)}
                    </View>

                    <View style={styles.contentCol}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.notifTitle, { color: theme.text }]}>
                          {item.title}
                        </Text>
                        {!item.isRead && (
                          <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
                        )}
                      </View>

                      <Text style={[styles.notifBody, { color: theme.textMuted }]} numberOfLines={2}>
                        {item.body}
                      </Text>

                      <View style={styles.metaRow}>
                        <Clock size={11} color={theme.textFaint} />
                        <Text style={[styles.timeText, { color: theme.textFaint }]}>{item.time}</Text>
                      </View>
                    </View>

                    <ChevronRight size={16} color={theme.textFaint} style={{ alignSelf: 'center' }} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Earlier Group */}
            {earlierList.length > 0 && (
              <View style={styles.sectionGroup}>
                <Text style={[styles.groupHeading, { color: theme.textMuted, marginTop: 12 }]}>
                  EARLIER THIS WEEK
                </Text>
                {earlierList.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    onPress={() => handleNotificationPress(item)}
                    style={[
                      styles.notificationCard,
                      {
                        backgroundColor: theme.surface,
                        borderColor: !item.isRead ? theme.primary : theme.border,
                        borderLeftWidth: !item.isRead ? 4 : 1,
                        borderLeftColor: !item.isRead ? theme.primary : theme.border,
                      },
                    ]}>
                    <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
                      {renderCategoryIcon(item.category, item.iconColor)}
                    </View>

                    <View style={styles.contentCol}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.notifTitle, { color: theme.text }]}>
                          {item.title}
                        </Text>
                        {!item.isRead && (
                          <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
                        )}
                      </View>

                      <Text style={[styles.notifBody, { color: theme.textMuted }]} numberOfLines={2}>
                        {item.body}
                      </Text>

                      <View style={styles.metaRow}>
                        <Clock size={11} color={theme.textFaint} />
                        <Text style={[styles.timeText, { color: theme.textFaint }]}>{item.time}</Text>
                      </View>
                    </View>

                    <ChevronRight size={16} color={theme.textFaint} style={{ alignSelf: 'center' }} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  markAllBtn: {
    padding: 6,
  },
  filterBar: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  sectionGroup: {
    marginBottom: 16,
  },
  groupHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  contentCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notifBody: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
  },
});
