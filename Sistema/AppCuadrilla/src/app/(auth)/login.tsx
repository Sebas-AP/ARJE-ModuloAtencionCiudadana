import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { authService } from '../../services/authService';
import { APP_THEME } from '../../theme/appTheme';

export default function LoginScreen() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleLogin = async () => {
    if (!usuario.trim() || !password.trim()) { setError('Ingrese usuario y contraseña'); return; }
    setLoading(true); setError('');
    try { await authService.login(usuario, password); router.replace('/(tabs)'); }
    catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Credenciales inválidas'); }
    finally { setLoading(false); }
  };

  return <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoFrame}><Image accessibilityLabel="Logotipo ARJE" source={require('../../../assets/arje-cuadrilla-logo.png')} style={styles.logo} resizeMode="contain" /></View>
        <View style={styles.form}>
          <Text style={styles.usernameLabel}>Usuario de cuadrilla</Text>
          <View style={styles.usernameInputShell}><Ionicons name="person-outline" size={19} color="#015FEB" /><TextInput style={styles.input} value={usuario} onChangeText={setUsuario} placeholder="ej. cuadrilla_norte" placeholderTextColor="#8FAFD9" autoCapitalize="none" autoComplete="username" textContentType="username" accessibilityLabel="Usuario de cuadrilla" /></View>
          <Text style={styles.passwordLabel}>Contraseña</Text>
          <View style={styles.passwordInputShell}><Ionicons name="lock-closed-outline" size={19} color="#2200FF" /><TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Ingresa tu contraseña" placeholderTextColor="#8FAFD9" secureTextEntry autoComplete="current-password" textContentType="password" accessibilityLabel="Contraseña" /></View>
        </View>
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: loading }} disabled={loading} onPress={() => { void handleLogin(); }} style={[styles.button, loading && styles.buttonDisabled]}>
          {loading ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.buttonText}>Iniciar sesión</Text><Ionicons name="log-in-outline" size={22} color="#FFF" /></>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: APP_THEME.colors.canvas }, keyboard: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', alignItems: 'center', paddingHorizontal: 24, paddingTop: 140, paddingBottom: 36 },
  logoFrame: { width: 265, height: 115, padding: 10, borderRadius: APP_THEME.radius.input, backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 2, height: 4 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }, logo: { width: '100%', height: '100%' },
  form: { width: '100%', maxWidth: 280, alignSelf: 'center', marginTop: 128, gap: 10 },
  usernameLabel: { color: '#015FEB', fontSize: 16, lineHeight: 20, fontFamily: 'InriaSans_400Regular', marginTop: 6 }, passwordLabel: { color: '#2200FF', fontSize: 16, lineHeight: 20, fontFamily: 'InriaSans_400Regular', marginTop: 12 },
  usernameInputShell: { minHeight: 43, borderWidth: 1, borderColor: '#015FEB', borderRadius: APP_THEME.radius.input, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13 }, passwordInputShell: { minHeight: 43, borderWidth: 1, borderColor: '#2200FF', borderRadius: APP_THEME.radius.input, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13 },
  input: { flex: 1, minHeight: 41, padding: 0, color: APP_THEME.colors.ink, fontSize: 16, fontFamily: 'Inter_400Regular' }, error: { width: '100%', maxWidth: 332, textAlign: 'center', color: '#B91C1C', fontSize: 13, lineHeight: 18, fontFamily: 'InriaSans_400Regular', marginTop: 8 },
  button: { width: '100%', maxWidth: 332, minHeight: 48, marginTop: 20, borderRadius: APP_THEME.radius.button, backgroundColor: APP_THEME.colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, shadowColor: APP_THEME.colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 }, buttonDisabled: { opacity: 0.65 }, buttonText: { color: '#FFF', fontSize: 16, lineHeight: 20, fontFamily: 'InriaSans_700Bold' },
});
