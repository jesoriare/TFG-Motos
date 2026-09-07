import { useCallback, useState } from 'react';
import { View, Text, TextInput, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '@/lib/auth';
import { colors, radius } from '@/constants/theme';
import { getConversaciones, ocultarConversacion, getAmigos, crearOAbrirChat } from '@/lib/api';

interface Conversacion {
  id: string;
  usuario: {
    id: string; username: string; nombre: string; apellidos: string;
    avatar_url: string | null; online: boolean;
  };
  ultimo_mensaje: { contenido: string; created_at: string; emisor_id: string } | null;
  no_leidos: number;
  ultimo_mensaje_at: string;
}

interface Amigo {
  id: string;
  username: string;
  nombre: string;
  apellidos: string;
  avatar_url: string | null;
  online: boolean;
}

function formatFecha(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

export default function ChatsScreen() {
  const router = useRouter();
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Buscador de amigos
  const [query, setQuery] = useState('');
  const [amigos, setAmigos] = useState<Amigo[]>([]);
  const [iniciando, setIniciando] = useState<string | null>(null);

  const load = useCallback(async () => {
    const session = await getSession();
    if (!session) { router.replace('/entrar'); return; }
    setConversaciones(await getConversaciones(session.token));
    setLoading(false);
  }, [router]);

  const loadAmigos = useCallback(async () => {
    const session = await getSession();
    if (!session) return;
    const { data } = await getAmigos(session.user.username, session.token);
    if (data) setAmigos(data);
  }, []);

  useFocusEffect(useCallback(() => { load(); loadAmigos(); }, [load, loadAmigos]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleOcultar(id: string) {
    const session = await getSession();
    if (!session) return;
    if (await ocultarConversacion(id, session.token)) {
      setConversaciones(prev => prev.filter(c => c.id !== id));
    }
  }

  async function handleIniciarChat(username: string) {
    const session = await getSession();
    if (!session) return;
    setIniciando(username);
    const id = await crearOAbrirChat(username, session.token);
    setIniciando(null);
    if (id) { setQuery(''); router.push(`/chats/${id}` as any); }
  }

  const q = query.trim().toLowerCase();
  const resultados = q
    ? amigos.filter(a =>
        a.username.toLowerCase().includes(q) ||
        a.nombre.toLowerCase().includes(q) ||
        a.apellidos.toLowerCase().includes(q)
      )
    : [];

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          <Text style={s.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={s.eyebrow}>COMUNIDAD</Text>
        <Text style={s.title}>MENSAJES</Text>

        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar amigo para chatear..."
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close" size={16} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
      ) : q ? (
        <FlatList
          data={resultados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={resultados.length === 0 ? [s.list, { flexGrow: 1 }] : s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="person-outline" size={40} color={colors.muted} style={{ opacity: 0.4 }} />
              <Text style={s.emptyText}>No se encontró ningún amigo</Text>
            </View>
          }
          renderItem={({ item: a }) => {
            const initials = `${a.nombre.charAt(0)}${a.apellidos?.charAt(0) ?? ''}`.toUpperCase();
            const isIniciando = iniciando === a.username;
            return (
              <TouchableOpacity style={s.card} onPress={() => handleIniciarChat(a.username)} disabled={isIniciando}>
                <View style={s.cardMain}>
                  <View style={s.avatarWrap}>
                    {a.avatar_url
                      ? <Image source={{ uri: a.avatar_url }} style={s.avatarImg} />
                      : <Text style={s.avatarText}>{initials}</Text>
                    }
                    {a.online && <View style={s.onlineDot} />}
                  </View>
                  <View style={s.info}>
                    <Text style={s.name} numberOfLines={1}>{a.nombre} {a.apellidos}</Text>
                    <Text style={s.lastMsg} numberOfLines={1}>@{a.username}</Text>
                  </View>
                  {isIniciando
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                  }
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <FlatList
          data={conversaciones}
          keyExtractor={(item) => item.id}
          contentContainerStyle={conversaciones.length === 0 ? [s.list, { flexGrow: 1 }] : s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.muted} style={{ opacity: 0.4 }} />
              <Text style={s.emptyText}>No tienes conversaciones todavía</Text>
              <Text style={[s.emptyText, { fontSize: 12, opacity: 0.7 }]}>Busca un amigo arriba para empezar</Text>
            </View>
          }
          renderItem={({ item }) => {
            const u = item.usuario;
            const initials = `${u.nombre.charAt(0)}${u.apellidos?.charAt(0) ?? ''}`.toUpperCase();
            return (
              <View style={s.card}>
                <TouchableOpacity style={s.cardMain} onPress={() => router.push(`/chats/${item.id}` as any)}>
                  <View style={s.avatarWrap}>
                    {u.avatar_url
                      ? <Image source={{ uri: u.avatar_url }} style={s.avatarImg} />
                      : <Text style={s.avatarText}>{initials}</Text>
                    }
                    {u.online && <View style={s.onlineDot} />}
                  </View>

                  <View style={s.info}>
                    <View style={s.nameRow}>
                      <Text style={s.name} numberOfLines={1}>{u.nombre} {u.apellidos}</Text>
                      {item.ultimo_mensaje && <Text style={s.time}>{formatFecha(item.ultimo_mensaje.created_at)}</Text>}
                    </View>
                    <Text style={s.lastMsg} numberOfLines={1}>
                      {item.ultimo_mensaje ? item.ultimo_mensaje.contenido : 'Empieza la conversación'}
                    </Text>
                  </View>

                  {item.no_leidos > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{item.no_leidos > 9 ? '9+' : item.no_leidos}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={s.deleteBtn} onPress={() => handleOcultar(item.id)}>
                  <Ionicons name="trash-outline" size={16} color={colors.muted} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 20 },
  backText: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  title: { color: colors.foreground, fontSize: 26, fontWeight: '900', letterSpacing: 0.5, marginBottom: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: colors.foreground, fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12,
  },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  avatarWrap: {
    width: 48, height: 48, borderRadius: radius.md, overflow: 'hidden',
    backgroundColor: 'rgba(255,107,26,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
  onlineDot: { position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.surface1 },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  name: { color: colors.foreground, fontWeight: '700', fontSize: 14, flexShrink: 1 },
  time: { color: colors.muted, fontSize: 11 },
  lastMsg: { color: colors.muted, fontSize: 12, marginTop: 2 },
  badge: { backgroundColor: colors.primary, borderRadius: radius.full, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: colors.primaryFg, fontSize: 11, fontWeight: '800' },
  deleteBtn: { padding: 8 },
});
