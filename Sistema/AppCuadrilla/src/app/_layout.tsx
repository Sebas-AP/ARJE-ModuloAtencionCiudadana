import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { authService } from '../services/authService';
import { useFonts } from 'expo-font';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    InriaSans_300Light: require('@expo-google-fonts/inria-sans/300Light/InriaSans_300Light.ttf'),
    InriaSans_400Regular: require('@expo-google-fonts/inria-sans/400Regular/InriaSans_400Regular.ttf'),
    InriaSans_700Bold: require('@expo-google-fonts/inria-sans/700Bold/InriaSans_700Bold.ttf'),
    Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  });
  const [userLoaded, setUserLoaded] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await authService.getCurrentCuadrilla();
      setUser(currentUser);
      setUserLoaded(true);
      SplashScreen.hideAsync();
    };
    loadUser();
  }, []);

  if (!userLoaded || !fontsLoaded) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="reporte/[id]" />
        </>
      ) : (
        <Stack.Screen name="(auth)/login" />
      )}
    </Stack>
  );
}
