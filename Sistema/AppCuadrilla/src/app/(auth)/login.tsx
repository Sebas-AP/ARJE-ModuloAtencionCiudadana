import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
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
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
    <View style={styles.content}>
      <Image accessibilityLabel="ARJE" source={require('../../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.welcome}>Acceso a cuadrillas</Text><Text style={styles.subtitle}>Gestión de atención en campo</Text>
      <View style={styles.form}>
        <Text style={styles.label}>Usuario</Text><View style={styles.inputShell}><Ionicons name="person-outline" size={20} color={APP_THEME.colors.primary} /><TextInput style={styles.input} value={usuario} onChangeText={setUsuario} placeholder="ej. Juan López" placeholderTextColor="#B9D6FF" autoCapitalize="none" autoComplete="username" textContentType="username" /></View>
        <Text style={styles.label}>Contraseña</Text><View style={styles.inputShell}><Ionicons name="lock-closed-outline" size={20} color={APP_THEME.colors.primary} /><TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Ingresa tu contraseña" placeholderTextColor="#B9D6FF" secureTextEntry autoComplete="current-password" textContentType="password" /></View>
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      </View>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: loading }} disabled={loading} onPress={() => { void handleLogin(); }} style={styles.button}>{loading ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.buttonText}>Iniciar sesión</Text><Ionicons name="log-in-outline" size={24} color="#FFF" /></>}</TouchableOpacity>
    </View>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_THEME.colors.canvas }, content: { flex: 1, paddingHorizontal: 40, justifyContent: 'center' }, logo: { width: 265, height: 115, alignSelf: 'center', marginBottom: 58 }, welcome: { color: APP_THEME.colors.royal, fontSize: 25, fontWeight: '800', textAlign: 'center' }, subtitle: { color: APP_THEME.colors.muted, textAlign: 'center', marginTop: 6, marginBottom: 44 }, form: { gap: 8 }, label: { color: '#015FEB', fontSize: 16, marginTop: 14 }, inputShell: { height: 45, borderWidth: 1, borderColor: '#015FEB', borderRadius: APP_THEME.radius.input, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 }, input: { flex: 1, color: APP_THEME.colors.royal, fontSize: 16 }, error: { color: '#B91C1C', marginTop: 12, textAlign: 'center' }, button: { height: 48, borderRadius: APP_THEME.radius.button, backgroundColor: APP_THEME.colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginTop: 72, shadowColor: APP_THEME.colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: .2, shadowRadius: 12, elevation: 4 }, buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
