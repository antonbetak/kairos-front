import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii } from '../styles/theme';


interface Seccion {
  id: string;
  icono: keyof typeof Ionicons.glyphMap;
  titulo: string;
  contenido: { subtitulo?: string; texto: string }[];
}


const SECCIONES: Seccion[] = [
  {
    id: 'inicio',
    icono: 'home-outline',
    titulo: 'Inicio',
    contenido: [
      {
        texto: 'La pantalla de inicio es tu centro de control diario. Aquí puedes ver el progreso del día, tus estadísticas rápidas y todas tus tareas.',
      },
      {
        subtitulo: 'Progreso del día',
        texto: 'La barra de progreso muestra el porcentaje de tareas completadas hoy. Se actualiza automáticamente cada vez que completas una tarea.',
      },
      {
        subtitulo: 'Filtros',
        texto: 'Usa los filtros "Todas", "Pendientes" y "Completadas" para ver solo las tareas que te interesan.',
      },
      {
        subtitulo: 'Completar una tarea',
        texto: 'Toca cualquier tarea para marcarla como completada o pendiente. Mantén presionada para eliminarla.',
      },
    ],
  },
  {
    id: 'tareas',
    icono: 'checkbox-outline',
    titulo: 'Tareas',
    contenido: [
      {
        texto: 'Kairos maneja cuatro tipos de actividades para organizar mejor tu tiempo.',
      },
      {
        subtitulo: 'Tarea',
        texto: 'Actividades con un objetivo claro y fecha límite. Ejemplo: "Entregar reporte del proyecto".',
      },
      {
        subtitulo: 'Hábito',
        texto: 'Actividades recurrentes que quieres mantener. Ejemplo: "Meditar 10 minutos cada mañana".',
      },
      {
        subtitulo: 'Evento',
        texto: 'Compromisos con fecha y hora específica. Ejemplo: "Reunión de equipo a las 10am".',
      },
      {
        subtitulo: 'Libre',
        texto: 'Tiempo sin estructura para descanso, creatividad o lo que necesites.',
      },
      {
        subtitulo: 'Nueva tarea',
        texto: 'Toca el botón + en la esquina inferior derecha. Escribe el título, una descripción opcional y una fecha límite si la necesita.',
      },
    ],
  },
  {
    id: 'horario',
    icono: 'calendar-outline',
    titulo: 'Horario',
    contenido: [
      {
        texto: 'La pantalla de horario muestra tus actividades organizadas por hora en una vista de línea de tiempo.',
      },
      {
        subtitulo: 'Navegar por días',
        texto: 'Usa los botones de días en la parte superior para ver el horario de cada día de la semana.',
      },
      {
        subtitulo: 'Generar horario',
        texto: 'El botón "✦ Generar" usa el agente de Kairos para crear un horario optimizado basado en tus tareas y preferencias de productividad.',
      },
      {
        subtitulo: 'Línea de tiempo',
        texto: 'La línea roja indica la hora actual. Los bloques de color muestran el estado de cada actividad.',
      },
    ],
  },
  {
    id: 'metricas',
    icono: 'bar-chart-outline',
    titulo: 'Métricas',
    contenido: [
      {
        texto: 'Visualiza tu productividad con gráficas detalladas. Cambia entre Hoy, Semana, Mes y Año para ver diferentes periodos.',
      },
      {
        subtitulo: 'Barras',
        texto: 'Muestra las tareas completadas vs el total en cada periodo de tiempo.',
      },
      {
        subtitulo: 'Tendencia',
        texto: 'La gráfica de línea muestra cómo ha evolucionado tu porcentaje de productividad.',
      },
      {
        subtitulo: 'Por tipo',
        texto: 'La dona muestra cómo distribuyes tu tiempo entre tareas, hábitos, eventos y tiempo libre.',
      },
      {
        subtitulo: 'Heatmap',
        texto: 'En la vista semanal, el mapa de calor muestra tu consistencia con los hábitos en las últimas 4 semanas.',
      },
    ],
  },
  {
    id: 'agente',
    icono: 'sparkles-outline',
    titulo: 'Agente Kairos',
    contenido: [
      {
        texto: 'El agente es tu asistente personal de productividad. Aprende de tus patrones y te ayuda a organizarte mejor.',
      },
      {
        subtitulo: 'Generar horario',
        texto: 'El agente puede crear un horario diario optimizado considerando tus horas más productivas, el tipo de tarea y tu energía.',
      },
      {
        subtitulo: 'Chat',
        texto: 'En la pestaña Agente puedes chatear directamente con Kairos para pedir consejos, reorganizar tu día o hacer preguntas sobre tu productividad.',
      },
    ],
  },
  {
    id: 'comunidad',
    icono: 'people-circle-outline',
    titulo: 'Comunidad',
    contenido: [
      {
        texto: 'La sección Comunidad te permite compartir avances con tus amigos y ver su actividad dentro de Kairos.',
      },
      {
        subtitulo: 'Feed',
        texto: 'En el feed aparecen eventos como tareas completadas, logros, rachas y horarios creados por tus amigos.',
      },
      {
        subtitulo: 'Reacciones',
        texto: 'Puedes reaccionar a las publicaciones de tus amigos con aplauso, fuego o corazón. Toca un botón de reacción para enviarla.',
      },
      {
        subtitulo: 'Amigos',
        texto: 'En la pestaña Amigos puedes ver tus contactos, solicitudes pendientes y solicitudes recibidas.',
      },
      {
        subtitulo: 'Invitaciones',
        texto: 'Genera un código de invitación para compartirlo, o pega el código de otra persona para agregarla a tu comunidad.',
      },
    ],
  },
  {
    id: 'perfil',
    icono: 'person-outline',
    titulo: 'Perfil y ajustes',
    contenido: [
      {
        texto: 'Accede a tu perfil tocando tu avatar en la esquina superior derecha de la pantalla de inicio.',
      },
      {
        subtitulo: 'Foto de perfil',
        texto: 'Toca tu avatar para cambiar la foto. Si iniciaste con Google, se usa tu foto de Google por defecto.',
      },
      {
        subtitulo: 'Tema visual',
        texto: 'Elige entre 6 temas: Morning Mint, Ocean Milk, Matcha Strawberry, Honey Butter, Cherry Cola y Sunset Field.',
      },
      {
        subtitulo: 'Preferencias de productividad',
        texto: 'Configura tu horario de trabajo, días laborales y estilo de trabajo para que el agente pueda hacer mejores recomendaciones.',
      },
    ],
  },
  {
    id: 'notificaciones',
    icono: 'notifications-outline',
    titulo: 'Notificaciones',
    contenido: [
      {
        texto: 'Toca el ícono de campana en el header para ver tus notificaciones. La bolita indica cuántas no has leído.',
      },
      {
        subtitulo: 'Tipos',
        texto: 'Recibirás recordatorios de tareas por vencer, logros al mantener rachas, y sugerencias del agente.',
      },
      {
        subtitulo: 'Marcar como leída',
        texto: 'Toca una notificación para marcarla como leída. Usa "Marcar todas" para limpiarlas de una vez.',
      },
    ],
  },
];


function SeccionItem({ seccion }: { seccion: Seccion }) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.seccionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <TouchableOpacity
        style={styles.seccionHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={[styles.seccionIconWrap, { backgroundColor: theme.primaryMuted }]}>
          <Ionicons name={seccion.icono} size={18} color={theme.primary} />
        </View>
        <Text style={[styles.seccionTitulo, { color: theme.textPrimary }]}>{seccion.titulo}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.textTertiary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.seccionBody, { borderTopColor: theme.border }]}>
          {seccion.contenido.map((item, i) => (
            <View key={i} style={[styles.contenidoItem, i < seccion.contenido.length - 1 && styles.contenidoItemBorder, { borderBottomColor: theme.borderSubtle }]}>
              {item.subtitulo && (
                <Text style={[styles.subtitulo, { color: theme.primary }]}>{item.subtitulo}</Text>
              )}
              <Text style={[styles.texto, { color: theme.textSecondary }]}>{item.texto}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}


interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function UserManualModal({ visible, onClose }: Props) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.sheet, { backgroundColor: theme.bg, borderColor: theme.border }]}>
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: theme.border }]} />

        {/* Header */}
        <View style={[styles.sheetHeader, { borderBottomColor: theme.border }]}>
          <View style={styles.sheetHeaderLeft}>
            <View style={[styles.headerIcon, { backgroundColor: theme.primaryMuted }]}>
              <Ionicons name="help-circle-outline" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>Manual de usuario</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Intro */}
        <View style={[styles.intro, { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '30' }]}>
          <Text style={[styles.introText, { color: theme.textSecondary }]}>
            Bienvenida a Kairos — tu asistente de productividad personal. Toca cada sección para expandirla.
          </Text>
        </View>

        {/* Secciones */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {SECCIONES.map(s => (
            <SeccionItem key={s.id} seccion={s} />
          ))}
          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000044',
  },

  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: spacing.md,
    maxHeight: '88%',
  },

  handle: {
    width: 36, height: 4,
    borderRadius: radii.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    width: 34, height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
  },
  closeBtn: { padding: spacing.xs },

  intro: {
    margin: spacing.base,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  introText: {
    fontSize: typography.sm,
    lineHeight: 20,
  },

  scrollContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },

  seccionCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  seccionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
  },
  seccionIconWrap: {
    width: 34, height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seccionTitulo: {
    flex: 1,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },

  seccionBody: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  contenidoItem: {
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  contenidoItemBorder: {
    borderBottomWidth: 1,
  },
  subtitulo: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    marginBottom: spacing.xs,
  },
  texto: {
    fontSize: typography.sm,
    lineHeight: 20,
  },
});
