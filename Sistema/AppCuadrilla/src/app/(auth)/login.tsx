import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { authService } from '../../services/authService';
import { fitArtboard } from '../../theme/figmaArtboard';

export default function LoginScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const scale = fitArtboard(width, height);
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

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.stage}>
    <View style={[styles.artboard, { transform: [{ scale }] }]}>
      <View style={styles.logoFrame}>
        <Image accessibilityLabel="Logotipo ARJE" source={require('../../../assets/arje-logo.png')} style={styles.logoSource} resizeMode="stretch" />
      </View>

      <View style={[styles.fieldGroup, styles.usernameGroup]}>
        <Text style={styles.usernameLabel}>Usuario</Text>
        <View style={styles.usernameInputShell}>
          <View style={styles.iconFrame}><Ionicons name="person-outline" size={18} color="#015FEB" /></View>
          <TextInput style={styles.input} value={usuario} onChangeText={setUsuario} placeholder="ej. Juan Lopez" placeholderTextColor="#CEDAFA" autoCapitalize="none" autoComplete="username" textContentType="username" accessibilityLabel="Usuario" />
        </View>
      </View>

      <View style={[styles.fieldGroup, styles.passwordGroup]}>
        <Text style={styles.passwordLabel}>Contraseña</Text>
        <View style={styles.passwordInputShell}>
          <View style={styles.iconFrame}><Ionicons name="lock-closed-outline" size={20} color="#015FEB" /></View>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Ingresa tu contraseña" placeholderTextColor="#D5CEFF" secureTextEntry autoComplete="current-password" textContentType="password" accessibilityLabel="Contraseña" />
        </View>
      </View>

      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: loading }} disabled={loading} onPress={() => { void handleLogin(); }} style={styles.button}>
        {loading ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.buttonText}>Iniciar sesion</Text><Ionicons name="log-in-outline" size={24} color="#FFF" /></>}
      </TouchableOpacity>
    </View>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: '#F7F9FC', alignItems: 'center', justifyContent: 'center' },
  artboard: { width: 412, height: 917, backgroundColor: '#F7F9FC' },
  logoFrame: { position: 'absolute', left: 74, top: 164, width: 265, height: 115, overflow: 'hidden', borderRadius: 7, backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 2, height: 4 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  logoSource: { position: 'absolute', width: 986.14, height: 1394.9, left: -357.78, top: -36.04 },
  fieldGroup: { position: 'absolute', width: 280, height: 67, left: 66 },
  usernameGroup: { top: 413 },
  passwordGroup: { top: 513 },
  usernameLabel: { height: 19, color: '#015FEB', fontSize: 16, lineHeight: 19, fontFamily: 'InriaSans_400Regular' },
  passwordLabel: { height: 19, color: '#2200FF', fontSize: 16, lineHeight: 19, fontFamily: 'InriaSans_400Regular' },
  usernameInputShell: { position: 'absolute', top: 24, width: 280, height: 43, borderWidth: 1, borderColor: '#015FEB', borderRadius: 7, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center' },
  passwordInputShell: { position: 'absolute', top: 24, width: 280, height: 43, borderWidth: 1, borderColor: '#2200FF', borderRadius: 7, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center' },
  iconFrame: { width: 32, height: 32, marginLeft: 3, backgroundColor: '#FFF', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, height: 42, paddingHorizontal: 9, color: '#1D2F40', fontSize: 16, fontFamily: 'Inter_400Regular' },
  error: { position: 'absolute', left: 66, top: 594, width: 280, textAlign: 'center', color: '#B91C1C', fontSize: 13, fontFamily: 'InriaSans_400Regular' },
  button: { position: 'absolute', left: 40, top: 735, width: 332, height: 48, borderRadius: 14, backgroundColor: '#0184FF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, shadowColor: '#0184FF', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
  buttonText: { color: '#FFF', fontSize: 16, lineHeight: 19, fontFamily: 'InriaSans_700Bold' },
});
