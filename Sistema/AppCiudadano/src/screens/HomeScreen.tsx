import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { queue } = useOfflineQueue();

  const handleCreateReport = () => {
    navigation.navigate('CrearReporte');
  };

  const handleViewReports = () => {
    navigation.navigate('ConsultaReportes');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.electricBlue} />
      <View style={styles.container}>
        {/* Offline indicator si hay reportes pendientes de sincronizar */}
        {queue.length > 0 && (
          <View style={styles.offlineBanner}>
            <MaterialCommunityIcons name="cloud-off-outline" size={16} color={COLORS.white} />
            <Text style={styles.offlineBannerText}>
              {queue.length} reporte(s) guardado(s) offline
            </Text>
          </View>
        )}

        {/* Tarjeta Central con Logo ARJE */}
        <View style={styles.cardContainer}>
          <View style={styles.logoCard}>
            <Image
              source={require('../../assets/arje-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Acciones Inferiores según Figma */}
        <View style={styles.actionsContainer}>
          {/* Botón Principal: + Crear reporte */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateReport}
            activeOpacity={0.88}
          >
            <MaterialCommunityIcons name="plus" size={24} color={COLORS.white} style={styles.buttonIcon} />
            <Text style={styles.createButtonText}>Crear reporte</Text>
          </TouchableOpacity>

          {/* Botón Secundario: Ver reportes */}
          <TouchableOpacity
            style={styles.viewReportsButton}
            onPress={handleViewReports}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons
              name="file-document-outline"
              size={20}
              color={COLORS.white}
              style={styles.buttonIcon}
            />
            <Text style={styles.viewReportsButtonText}>Ver reportes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.electricBlue,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.electricBlue,
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'center',
    gap: SPACING.xs,
  },
  offlineBannerText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  logoCard: {
    width: '90%',
    aspectRatio: 1,
    maxWidth: 320,
    backgroundColor: COLORS.white,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  logoImage: {
    width: '85%',
    height: '60%',
  },
  actionsContainer: {
    width: '100%',
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
    alignItems: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: COLORS.primary, // #015BE0
    paddingVertical: 16,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  buttonIcon: {
    marginRight: SPACING.xs,
  },
  viewReportsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  viewReportsButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
  },
});