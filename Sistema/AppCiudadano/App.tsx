import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootStackParamList } from './src/navigation/types';
import { HomeScreen } from './src/screens/HomeScreen';
import { CrearReporteScreen } from './src/screens/CrearReporteScreen';
import { ConsultaReportesScreen } from './src/screens/ConsultaReportesScreen';
import { ReporteDetalleScreen } from './src/screens/ReporteDetalleScreen';
import { COLORS, FONT_WEIGHTS } from './src/constants';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="Inicio"
          screenOptions={{
            headerStyle: { backgroundColor: COLORS.cardBg },
            headerTintColor: COLORS.primary,
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: FONT_WEIGHTS.bold },
            contentStyle: { backgroundColor: COLORS.electricBlue },
          }}
        >
          {/* Pantalla Inicio según Figma (Fondo azul eléctrico, Logo ARJE, botones) */}
          <Stack.Screen
            name="Inicio"
            component={HomeScreen}
            options={{ headerShown: false }}
          />

          {/* Pantalla Nuevo Reporte (Pasos 1 y 2 con modales según Figma) */}
          <Stack.Screen
            name="CrearReporte"
            component={CrearReporteScreen}
            options={{ headerShown: false }}
          />

          {/* Pantalla Consultar reportes según Figma (Buscador por contrato e Historial) */}
          <Stack.Screen
            name="ConsultaReportes"
            component={ConsultaReportesScreen}
            options={{ headerShown: false }}
          />

          {/* Detalle del reporte */}
          <Stack.Screen
            name="ReporteDetalle"
            component={ReporteDetalleScreen}
            options={{
              title: 'Detalle del reporte',
              headerShown: true,
              headerStyle: { backgroundColor: COLORS.cardBg },
              headerTintColor: COLORS.primary,
            }}
          />

          {/* Rutas de compatibilidad */}
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="MisReportes"
            component={ConsultaReportesScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}