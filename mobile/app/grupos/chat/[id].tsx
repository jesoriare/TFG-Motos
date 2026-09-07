import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '@/lib/auth';
import { colors, radius } from '@/constants/theme';
import { getGrupo, getMensajesGrupo, enviarMensajeGrupo } from '@/lib/api';

const POLL_INTERVAL_MS = 2000;

interface MensajeGrupo {
  id: string;
  grupo_id: string;
  emisor_id: string;
  contenido: string;
  created_at: string;
  emisor: { username: string; nombre: string; apellidos: string; avatar_url: string | null };
}

export default function GrupoChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [mensajes, setMensajes] = useState<MensajeGrupo[]>([]);
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    const session = await getSession();
    if (!session) { router.replace('/entrar'); return; }
    setCurrentUserId(session.user.id);

    const { status, data: grupo } = await getGrupo(id, session.token);
    if (status === 403 || status === 404) { setForbidden(true); setLoading(false); return; }
    if (grupo) setNombreGrupo(grupo.nombre);

    setMensajes(await getMensajesGrupo(id, session.token));
    setLoading(false);
  }, [id, router]);

  const pollMensajes = useCallback(async () => {
    const session = await getSession();
    if (!session) return;
    const msgs = await getMensajesGrupo(id, session.token);
    setMensajes(prev => (prev.length === msgs.length ? prev : msgs));
  }, [id]);

  useFocusEffect(useCallback(() => {
    load();
    const interval = setInterval(pollMensajes, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load, pollMensajes]));

  useEffect(() => {
    if (mensajes.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [mensajes]);

  async function handleEnviar() {
    const contenido = texto.trim();
    if (!contenido || sending) return;
    const session = await getSession();
    if (!session) return;

    setSending(true);
    setTexto('');
    const mensaje = await enviarMensajeGrupo(id, contenido, session.token);
    if (mensaje) {
      setMensajes(prev => prev.some(m => m.id === mensaje.id) ? prev : [...prev, mensaje]);
    }
    setSending(false);
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (forbidden) {
    return (
      <View style={s.screen}>
        <View style={s.empty}>
          <Ionicons name="lock-closed-outline" size={40} color={colors.muted} style={{ opacity: 0.4 }} />
          <Text style={s.emptyText}>No perteneces a este grupo</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.screen}>
        <View style={s.header}>
          <TouchableOpacity style={s.back} onPress={() => router.replace(`/grupos/${id}` as any)}>
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={s.headerInfo}>
            <View style={s.groupIcon}>
              <Ionicons name="people" size={18} color={colors.primary} />
            </View>
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text style={s.name} numberOfLines={1}>{nombreGrupo}</Text>
              <Text style={s.username}>Chat de grupo</Text>
            </View>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={mensajes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          ListEmptyComponent={<Text style={s.emptyMsg}>Empieza la conversación del grupo</Text>}
          renderItem={({ item }) => {
            const propio = item.emisor_id === currentUserId;
            return (
              <View style={[s.bubbleRow, propio && s.bubbleRowOwn]}>
                <View style={[s.bubble, propio ? s.bubbleOwn : s.bubbleOther]}>
                  {!propio && (
                    <Text style={s.bubbleAuthor}>{item.emisor.nombre} {item.emisor.apellidos}</Text>
                  )}
                  <Text style={[s.bubbleText, propio && s.bubbleTextOwn]}>{item.contenido}</Text>
                  <Text style={[s.bubbleTime, propio && s.bubbleTimeOwn]}>
                    {new Date(item.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={texto}
            onChangeText={setTexto}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.muted}
            multiline
          />
          <TouchableOpacity style={[s.sendBtn, !texto.trim() && s.sendBtnDisabled]} onPress={handleEnviar} disabled={!texto.trim() || sending}>
            <Ionicons name="send" size={18} color={colors.primaryFg} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { padding: 4 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  groupIcon: {
    width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,107,26,0.15)',
  },
  name: { color: colors.foreground, fontWeight: '700', fontSize: 14 },
  username: { color: colors.muted, fontSize: 12 },
  list: { padding: 16, gap: 8, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  emptyMsg: { color: colors.muted, textAlign: 'center', marginTop: 40, fontSize: 14 },
  bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubbleRowOwn: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleOther: { backgroundColor: colors.surface1, borderWidth: 1, borderColor: colors.border },
  bubbleOwn: { backgroundColor: colors.primary },
  bubbleAuthor: { color: colors.primary, fontWeight: '800', fontSize: 11, marginBottom: 2 },
  bubbleText: { color: colors.foreground, fontSize: 14 },
  bubbleTextOwn: { color: colors.primaryFg },
  bubbleTime: { color: colors.muted, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeOwn: { color: 'rgba(13,15,17,0.6)' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background,
  },
  input: {
    flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 10, color: colors.foreground, fontSize: 14, maxHeight: 100,
  },
  sendBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
});
