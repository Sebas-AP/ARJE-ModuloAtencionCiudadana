import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SyncStatus } from '../../components/SyncStatus';
import { useFieldSync } from '../../hooks/useFieldSync';

export default function TabsLayout() {
  const sync = useFieldSync();
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#EFF6FF' }}>
        <SyncStatus {...sync} onRetry={() => { void sync.syncNow(); }} />
      </SafeAreaView>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#253C96',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          height: 65,
          paddingBottom: 10,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Reportes',
          tabBarBadge: sync.pendingCount || undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'document-text-outline' : 'document-text'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map-outline' : 'map'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
    </View>
  );
}
