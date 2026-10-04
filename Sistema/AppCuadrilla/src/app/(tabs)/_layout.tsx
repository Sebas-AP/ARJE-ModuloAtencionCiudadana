import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { authService } from '../../services/authService';
import { useLocation } from '../../hooks/useLocation';

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const { location, iniciarSeguimiento } = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const user = await authService.getCurrentUser();
      if (!user) {
        // La navegación se maneja desde el _layout principal
      } else if (user.idCuadrilla && location) {
        // Iniciar seguimiento si hay reporte activo (se hace en cada pantalla)
      }
    };
    checkAuth();
  }, []);

  return (
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
  );
}