import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii } from '../styles/theme';
import { getAccessToken } from '../store/authStore';
import { apiRequest } from '../services/api';
import type { ScheduleAgentBlock } from '../services/scheduleService';


interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  texto: string;
  accion?: 'memoria' | 'bloque' | 'ninguna';
  bloque?: ScheduleAgentBlock | null;
}

interface ChatResponse {
  respuesta: string;
  accion: 'memoria' | 'bloque' | 'ninguna';
  bloque: ScheduleAgentBlock | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  idUsuario: string;
  fecha: string;
  tareas?: any[];
  eventosCalendario?: any[];
  bloquesHorario?: any[];
  onBloqueAgregado?: (bloque: ScheduleAgentBlock) => void;
}


function MessageBubble({
  msg,
  onAgregarBloque,
}: {
  msg: ChatMessage;
  onAgregarBloque?: (bloque: ScheduleAgentBlock) => void;
}) {
  const { theme } = useTheme();
  const esUsuario = msg.role === 'user';

  return (
    <View style={[styles.bubbleRow, esUsuario && styles.bubbleRowUser]}>
      {!esUsuario && (
        <View style={[styles.agentAvatar, { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '40' }]}>
          <Ionicons name="sparkles" size={12} color={theme.primary} />
        </View>
      )}
      <View style={[
        styles.bubble,
        esUsuario
          ? { backgroundColor: theme.primary, borderBottomRightRadius: 4 }
          : { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1, borderBottomLeftRadius: 4 },
      ]}>
        <Text style={[
          styles.bubbleText,
          { color: esUsuario ? theme.textInverse : theme.textPrimary },
        ]}>
          {msg.texto}
        </Text>

        {/* Tag de acción */}
        {msg.accion === 'memoria' && (
          <View style={[styles.accionTag, { backgroundColor: theme.success + '20' }]}>
            <Ionicons name="bookmark" size={10} color={theme.success} />
            <Text style={[styles.accionTagText, { color: theme.success }]}>Preferencia guardada</Text>
          </View>
        )}

        {/* Bloque propuesto por el agente */}
        {msg.accion === 'bloque' && msg.bloque && onAgregarBloque && (
          <TouchableOpacity
            style={[styles.bloqueCard, { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '40' }]}
            onPress={() => onAgregarBloque(msg.bloque!)}
            activeOpacity={0.8}
          >
            <View style={styles.bloqueCardHeader}>
              <Ionicons name="calendar-outline" size={12} color={theme.primary} />
              <Text style={[styles.bloqueCardTitulo, { color: theme.primary }]} numberOfLines={1}>
                {msg.bloque.titulo}
              </Text>
            </View>
            <Text style={[styles.bloqueCardHora, { color: theme.textTertiary }]}>
              {new Date(msg.bloque.fecha_inicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              {' – '}
              {new Date(msg.bloque.fecha_fin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={[styles.bloqueCardAgregar, { color: theme.primary }]}>
              Toca para agregar al horario
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}


export default function AgentChatModal({
  visible,
  onClose,
  idUsuario,
  fecha,
  tareas,
  eventosCalendario,
  bloquesHorario,
  onBloqueAgregado,
}: Props) {
  const { theme } = useTheme();
  const [mensajes, setMensajes] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'agent',
      texto: '¡Hola! Puedo ayudarte a ajustar tu horario o recordar tus preferencias. ¿Qué necesitas?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const enviarMensaje = useCallback(async () => {
    console.log('Enviando:', input, 'loading:', loading);
    const texto = input.trim();
    if (!texto || loading) return;

    const msgUsuario: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      texto,
    };

    setMensajes(prev => [...prev, msgUsuario]);
    setInput('');
    setLoading(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const token = await getAccessToken();
      console.log('Token para chat:', token ? 'OK' : 'NULL');
      console.log('idUsuario:', idUsuario);
      if (!token) throw new Error('No hay sesión activa');

      console.log('Llamando a:', '/agent/chat');
      const res = await apiRequest<ChatResponse>('/agent/chat', {
  method: 'POST',
  token,
  body: {
    id_usuario: idUsuario,
    mensaje: texto,
    fecha,
    tareas: (tareas ?? []).map((t: any) => ({
      id: t.id_tarea ?? t.id,
      titulo: t.titulo,
      tipo: t.tipo ?? 'tarea',
      prioridad: typeof t.prioridad === 'number'
        ? ['alta', 'media', 'baja'][t.prioridad] ?? 'media'
        : t.prioridad ?? 'media',
      fecha_limite: t.due_at ?? null,
      duracion_estimada_min: t.duracion_estimada_min ?? 60,
    })),
    eventos_calendario: (eventosCalendario ?? []).map((e: any) => ({
      titulo: e.summary ?? e.titulo ?? 'Sin título',
      inicio: e.start?.dateTime ?? e.inicio ?? null,
      fin: e.end?.dateTime ?? e.fin ?? null,
    })).filter((e: any) => e.inicio && e.fin),
    bloques_horario: (bloquesHorario ?? []).map((b: any) => ({
      titulo: b.titulo,
      fecha_inicio: b.fecha_inicio,
      fecha_fin: b.fecha_fin,
    })),
  },
});

      const msgAgente: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'agent',
        texto: res.respuesta,
        accion: res.accion,
        bloque: res.bloque ?? null,
      };

      setMensajes(prev => [...prev, msgAgente]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    } catch (err: any) {
  console.log('Error completo:', JSON.stringify(err), err.message, err.status);
  const msgError: ChatMessage = {
    id: `e_${Date.now()}`,
    role: 'agent',
    texto: 'Hubo un error al procesar tu mensaje. Intenta de nuevo.',
  };
  setMensajes(prev => [...prev, msgError]);
} finally {
      setLoading(false);
    }
  }, [input, loading, idUsuario, fecha, tareas, eventosCalendario, bloquesHorario]);

  const handleAgregarBloque = useCallback((bloque: ScheduleAgentBlock) => {
    onBloqueAgregado?.(bloque);
    const confirmMsg: ChatMessage = {
      id: `c_${Date.now()}`,
      role: 'agent',
      texto: `"${bloque.titulo}" fue agregado a tu horario como propuesto. Puedes aceptarlo o rechazarlo desde el timeline.`,
    };
    setMensajes(prev => [...prev, confirmMsg]);
  }, [onBloqueAgregado]);
  console.log('Mensajes actuales:', mensajes.length, mensajes.map(m => m.role));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kavContainer}
      >
        <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>

          {/* Header */}
          <View style={[styles.panelHeader, { borderBottomColor: theme.border }]}>
            <View style={styles.panelHeaderLeft}>
              <View style={[styles.agentIconWrap, { backgroundColor: theme.primaryMuted }]}>
                <Ionicons name="sparkles" size={16} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.panelTitle, { color: theme.textPrimary }]}>Kairos</Text>
                <Text style={[styles.panelSubtitle, { color: theme.textTertiary }]}>Asistente de horario</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Mensajes */}
          <ScrollView
            ref={scrollRef}
            style={styles.messagesArea}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {mensajes.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onAgregarBloque={handleAgregarBloque}
              />
            ))}
            {loading && (
              <View style={[styles.bubbleRow]}>
                <View style={[styles.agentAvatar, { backgroundColor: theme.primaryMuted, borderColor: theme.primary + '40' }]}>
                  <Ionicons name="sparkles" size={12} color={theme.primary} />
                </View>
                <View style={[styles.bubble, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 }]}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View style={[styles.inputRow, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceElevated, color: theme.textPrimary, borderColor: theme.border }]}
              placeholder="Escribe algo..."
              placeholderTextColor={theme.textTertiary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={enviarMensaje}
              returnKeyType="send"
              multiline
              maxLength={500}
            />
            {/* Micrófono — placeholder para STT */}
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
              onPress={() => {/* STT pendiente */}}
              activeOpacity={0.8}
            >
              <Ionicons name="mic-outline" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: input.trim() ? theme.primary : theme.surfaceElevated, borderColor: theme.border }]}
              onPress={enviarMensaje}
              disabled={!input.trim() || loading}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up" size={18} color={input.trim() ? theme.textInverse : theme.textTertiary} />
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}


const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#00000044',
  },
  kavContainer: {
  flex: 1,
  justifyContent: 'flex-end',
},
  panel: {
  borderTopLeftRadius: radii.xl,
  borderTopRightRadius: radii.xl,
  borderWidth: 1,
  borderBottomWidth: 0,
  height: '70%',
  overflow: 'hidden',
},
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  panelHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  agentIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  panelTitle: { fontSize: typography.base, fontWeight: typography.bold },
  panelSubtitle: { fontSize: typography.xs },
  closeBtn: { padding: spacing.xs },

  messagesArea: { 
  flexGrow: 1,
  minHeight: 200,
  maxHeight: 400,
},

  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  bubbleRowUser: { flexDirection: 'row-reverse' },

  agentAvatar: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, flexShrink: 0,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    gap: spacing.xs,
  },
  bubbleText: { fontSize: typography.sm, lineHeight: 20 },

  accionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  accionTagText: { fontSize: typography.xs, fontWeight: typography.semibold },

  bloqueCard: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 2,
  },
  bloqueCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bloqueCardTitulo: { fontSize: typography.sm, fontWeight: typography.semibold, flex: 1 },
  bloqueCardHora: { fontSize: typography.xs },
  bloqueCardAgregar: { fontSize: typography.xs, fontWeight: typography.semibold, marginTop: 4 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sm,
    maxHeight: 100,
  },
  iconBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});