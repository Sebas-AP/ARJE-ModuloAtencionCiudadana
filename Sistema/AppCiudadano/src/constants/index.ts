import { TipoProblema, EstatusReporte, TipoEvidencia, NotificationData } from '../types';

export const API_BASE_URL = 'http://localhost:5170/api';

export const STORAGE_KEYS = {
  USER_PROFILE: '@user_profile',
  OFFLINE_QUEUE: '@offline_queue',
  PUSH_TOKEN: '@push_token',
  NOTIFICATION_PERMISSIONS: '@notification_permissions',
} as const;

export const TIPO_PROBLEMA_LABELS: Record<TipoProblema, string> = {
  [TipoProblema.Fuga]: 'Fuga de agua',
  [TipoProblema.FaltaAbastecimiento]: 'Falta de abastecimiento',
  [TipoProblema.InstalacionRota]: 'Instalación rota',
  [TipoProblema.UsoIndebido]: 'Uso indebido',
  [TipoProblema.Otro]: 'Otro',
};

export const TIPO_PROBLEMA_ICONS: Record<TipoProblema, string> = {
  [TipoProblema.Fuga]: 'water',
  [TipoProblema.FaltaAbastecimiento]: 'water-off',
  [TipoProblema.InstalacionRota]: 'alert-circle',
  [TipoProblema.UsoIndebido]: 'shield-alert',
  [TipoProblema.Otro]: 'help-circle',
};

export const TIPO_PROBLEMA_COLORS: Record<TipoProblema, string> = {
  [TipoProblema.Fuga]: '#3B82F6',
  [TipoProblema.FaltaAbastecimiento]: '#F59E0B',
  [TipoProblema.InstalacionRota]: '#EF4444',
  [TipoProblema.UsoIndebido]: '#8B5CF6',
  [TipoProblema.Otro]: '#6B7280',
};

export const ESTATUS_REPORTE_LABELS: Record<EstatusReporte, string> = {
  [EstatusReporte.Nuevo]: 'Nuevo',
  [EstatusReporte.Asignado]: 'Asignado',
  [EstatusReporte.LevantandoInformacion]: 'Levantando información',
  [EstatusReporte.EnProceso]: 'En proceso',
  [EstatusReporte.Completado]: 'Completado',
  [EstatusReporte.EnSupervision]: 'En supervisión',
  [EstatusReporte.Cerrado]: 'Cerrado',
};

export const ESTATUS_REPORTE_COLORS: Record<EstatusReporte, string> = {
  [EstatusReporte.Nuevo]: '#3B82F6',
  [EstatusReporte.Asignado]: '#8B5CF6',
  [EstatusReporte.LevantandoInformacion]: '#F59E0B',
  [EstatusReporte.EnProceso]: '#F97316',
  [EstatusReporte.Completado]: '#22C55E',
  [EstatusReporte.EnSupervision]: '#06B6D4',
  [EstatusReporte.Cerrado]: '#6B7280',
};

export const ESTATUS_REPORTE_ICONS: Record<EstatusReporte, string> = {
  [EstatusReporte.Nuevo]: 'file-plus',
  [EstatusReporte.Asignado]: 'user-check',
  [EstatusReporte.LevantandoInformacion]: 'clipboard-list',
  [EstatusReporte.EnProceso]: 'cog',
  [EstatusReporte.Completado]: 'check-circle',
  [EstatusReporte.EnSupervision]: 'eye',
  [EstatusReporte.Cerrado]: 'archive',
};

export const TIPO_EVIDENCIA_LABELS: Record<TipoEvidencia, string> = {
  [TipoEvidencia.Inicial]: 'Evidencia inicial',
  [TipoEvidencia.Resolucion]: 'Evidencia de resolución',
};

export const MAX_EVIDENCIAS = 5;
export const MAX_DESCRIPCION_LENGTH = 2000;
export const GPS_ACCURACY_THRESHOLD = 50; // meters
export const OFFLINE_MAX_RETRIES = 3;
export const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const CLASSIFICATION_KEYWORDS: Record<TipoProblema, string[]> = {
  [TipoProblema.Fuga]: [
    'fuga', 'goteo', 'chorro', 'agua sale', 'brote', 'escape', 'perdida', 'pierde agua',
    'moja', 'charco', 'inundacion', 'chorrea', 'mancha humeda', 'tuberia rota', 'caño roto'
  ],
  [TipoProblema.FaltaAbastecimiento]: [
    'no hay agua', 'falta agua', 'sin agua', 'corte', 'suspension', 'no llega', 'se fue',
    'baja presion', 'poca presion', 'gotea apenas', 'chorrito', 'intermitente', 'racionamiento'
  ],
  [TipoProblema.InstalacionRota]: [
    'roto', 'quebrado', 'dañado', 'partido', 'fisurado', 'grieta', 'despostillado',
    'valvula rota', 'llave rota', 'medidor roto', 'caja rota', 'tapa rota', 'registro roto'
  ],
  [TipoProblema.UsoIndebido]: [
    'robo', 'hurto', 'conexion ilegal', 'bypass', 'manguera', 'riego', 'lavado', 'piscina',
    'llenar', 'tanque', 'cisterna', 'comercial', 'negocio', 'carro', 'coche', 'jardin'
  ],
  [TipoProblema.Otro]: [
    'otro', 'varios', 'multiple', 'diferente', 'extraño', 'raro', 'desconocido'
  ],
};

export { NotificationData };
export { TipoProblema, EstatusReporte, TipoEvidencia };

export const COLORS = {
  // Paleta oficial de Figma
  electricBlue: '#2000F3',
  electricBlueDark: '#1700BF',
  primary: '#015BE0',
  primaryLight: '#017EF3',
  primaryDark: '#0047B3',
  secondary: '#00CAE0',
  secondaryLight: '#E6FAF8',
  actionBlue: '#017EF3',
  cyan: '#00CAE0',
  cyanLight: '#E6FAF8',
  cyanDark: '#0097A7',
  accent: '#00CAE0',

  // Estados y semántica
  error: '#EF4444',
  errorLight: '#FEE2E2',
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  info: '#0284C7',
  infoLight: '#E0F2FE',

  // Badges Figma
  badgeEnProcesoBg: '#E0F2FE',
  badgeEnProcesoText: '#0284C7',
  badgeResueltoBg: '#DCFCE7',
  badgeResueltoText: '#16A34A',
  badgePendienteBg: '#FEF3C7',
  badgePendienteText: '#D97706',

  // Superficies y texto
  background: '#2000F3',
  screenBg: '#2000F3',
  cardBg: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceVariant: '#F1F5F9',
  text: '#0F172A',
  textDark: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textWhite: '#FFFFFF',
  textWhiteMuted: 'rgba(255, 255, 255, 0.85)',
  border: '#E2E8F0',
  borderCyan: '#00CAE0',
  borderFocus: '#00CAE0',
  white: '#FFFFFF',
  black: '#0F172A',
  overlay: 'rgba(15, 23, 42, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FONT_WEIGHTS = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;