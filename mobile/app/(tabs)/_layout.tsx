import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import CurvedTabBar from '@/components/CurvedTabBar';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <CurvedTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
          }}
        />
        <Tabs.Screen
          name="vitals"
          options={{
            title: 'Vitals',
          }}
        />
        <Tabs.Screen
          name="services"
          options={{
            title: 'Services',
          }}
        />
        <Tabs.Screen
          name="records"
          options={{
            title: 'Records',
          }}
        />
        <Tabs.Screen
          name="telecare"
          options={{
            title: 'TeleCare',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
          }}
        />
      </Tabs>
    </View>
  );
}
