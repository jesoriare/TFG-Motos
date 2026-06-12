import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/constants/theme';
import { getConversaciones, getMensajes, enviarMensaje, setChatAbierto } from '@/lib/api';

interface Mensaje {
  id: string;
  conversacion_id: string;
  emisor_id: string;
  contenido: string;
  created_at: string;
  leido: boolean;
}

interface Interlocutor {
  id: string;
  username: string;
  nombre: string;
  apellidos: string;
  avatar_url: string | null;
  online: boolean;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [interlocutor, setInterlocutor] = useState<Interlocutor | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace('/entrar'); return; }
    setCurrentUserId(session.user.id);
    const token = session.access_token;

    const [list, msgs] = await Promise.all([
      getConversaciones(token),
      getMensajes(id, token),
    ]);

    const conv = list.find((c: { id: string; usuario: Interlocutor }) => c.id === id);
    if (conv) setInterlocutor(conv.usuario);

    setMensajes(msgs);
    setLoading(false);
  }, [id, router]);

  useFocusEffect(useCallback(() => {
    load();

    const channel = supabase
      .channel(`mensajes-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `conversacion_id=eq.${id}` },
        (payload) => {
          const nuevo = payload.new as Mensaje;
          setMensajes(prev => prev.some(m => m.id === nuevo.id) ? prev : [...prev, nuevo]);
        }
      )
      .subscribe();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setChatAbierto(id, session.access_token);
    });

    return () => {
      supabase.removeChannel(channel);
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setChatAbierto(null, session.access_token);
      });
    };
  }, [id, load]));

  useEffect(() => {
    if (mensajes.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [mensajes]);

  async function handleEnviar() {
    const contenido = texto.trim();
    if (!contenido || sending) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setSending(true);
    setTexto('');
    const mensaje = await enviarMensaje(id, contenido, session.access_token);
    if (mensaje) {
      setMensajes(prev => prev.some(m => m.id === mensaje.id) ? prev : [...prev, mensaje]);
    }
    setSending(false);
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const initials = interlocutor
    ? `${interlocutor.nombre.charAt(0)}${interlocutor.apellidos?.charAt(0) ?? ''}`.toUpperCase()
    : '?';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.screen}>
        <View style={s.header}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </TouchableOpacity>
          {interlocutor && (
            <TouchableOpacity style={s.headerInfo} onPress={() => router.push(`/perfil/${interlocutor.username}` as any)}>
              <View style={s.avatarWrap}>
                {interlocutor.avatar_url
                  ? <Image source={{ uri: interlocutor.avatar_url }} style={s.avatarImg} />
                  : <Text style={s.avatarText}>{initials}</Text>
                }
                {interlocutor.online && <View style={s.onlineDot} />}
              </View>
              <View style={{ minWidth: 0, flex: 1 }}>
                <Text style={s.name} numberOfLines={1}>{interlocutor.nombre} {interlocutor.apellidos}</Text>
                <Text style={s.username} numberOfLines={1}>@{interlocutor.username}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          ref={listRef}
          data={mensajes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          ListEmptyComponent={<Text style={s.empty}>Empieza la conversación</Text>}
          renderItem={({ item }) => {
            const propio = item.emisor_id === currentUserId;
            return (
              <View style={[s.bubbleRow, propio && s.bubbleRowOwn]}>
                <View style={[s.bubble, propio ? s.bubbleOwn : s.bubbleOther]}>
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
  avatarWrap: {
    width: 40, height: 40, borderRadius: radius.md, overflow: 'hidden',
    backgroundColor: 'rgba(255,107,26,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  onlineDot: { position: 'absolute', bottom: -2, right: -2, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.background },
  name: { color: colors.foreground, fontWeight: '700', fontSize: 14 },
  username: { color: colors.muted, fontSize: 12 },
  list: { padding: 16, gap: 8, flexGrow: 1 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40, fontSize: 14 },
  bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubbleRowOwn: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleOther: { backgroundColor: colors.surface1, borderWidth: 1, borderColor: colors.border },
  bubbleOwn: { backgroundColor: colors.primary },
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
