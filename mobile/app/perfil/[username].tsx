import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '@/lib/auth';
import { colors, radius } from '@/constants/theme';
import {
  getEstadoAmistad, enviarSolicitudAmistad, aceptarSolicitudAmistad,
  rechazarSolicitudAmistad, eliminarRelacionAmistad, getAmigosCount, crearOAbrirChat,
  getPerfil, getRutas,
} from '@/lib/api';

type FriendStatus = 'ninguno' | 'pendiente_enviada' | 'pendiente_recibida' | 'amigos' | 'propio' | null;

export default function PerfilUsuarioScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [motos, setMotos] = useState<any[]>([]);
  const [rutas, setRutas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>(null);
  const [friendRequestId, setFriendRequestId] = useState<string | null>(null);
  const [friendLoading, setFriendLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const p = await getPerfil(username);
    if (!p) { setLoading(false); return; }
    setProfile(p);
    const rutas = await getRutas({ username: p.username });
    setMotos(p.motos ?? []);
    setRutas(rutas);
    setLoading(false);

    getAmigosCount(p.username).then(setFriendCount);

    const session = await getSession();
    if (session && session.user.id !== p.id) {
      const estado = await getEstadoAmistad(p.username, session.token);
      if (estado) {
        setFriendStatus(estado.estado);
        setFriendRequestId(estado.id ?? null);
      }
    }
  }, [username]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function getToken() {
    const session = await getSession();
    return session?.token ?? null;
  }

  async function handleEnviarSolicitud() {
    const token = await getToken();
    if (!token) return;
    setFriendLoading(true);
    const result = await enviarSolicitudAmistad(profile.username, token);
    if (result) {
      setFriendStatus(result.estado === 'aceptada' ? 'amigos' : 'pendiente_enviada');
      setFriendRequestId(result.id ?? null);
    }
    setFriendLoading(false);
  }

  async function handleAceptarSolicitud() {
    if (!friendRequestId) return;
    const token = await getToken();
    if (!token) return;
    setFriendLoading(true);
    if (await aceptarSolicitudAmistad(friendRequestId, token)) setFriendStatus('amigos');
    setFriendLoading(false);
  }

  async function handleRechazarSolicitud() {
    if (!friendRequestId) return;
    const token = await getToken();
    if (!token) return;
    setFriendLoading(true);
    if (await rechazarSolicitudAmistad(friendRequestId, token)) {
      setFriendStatus('ninguno');
      setFriendRequestId(null);
    }
    setFriendLoading(false);
  }

  async function handleEliminarRelacion() {
    if (!friendRequestId) return;
    const token = await getToken();
    if (!token) return;
    setFriendLoading(true);
    if (await eliminarRelacionAmistad(friendRequestId, token)) {
      setFriendStatus('ninguno');
      setFriendRequestId(null);
    }
    setFriendLoading(false);
  }

  async function handleAbrirChat() {
    const token = await getToken();
    if (!token) return;
    setChatLoading(true);
    const id = await crearOAbrirChat(profile.username, token);
    setChatLoading(false);
    if (id) router.push(`/chats/${id}` as any);
  }

  function confirmEliminarRelacion() {
    Alert.alert(
      'Eliminar amistad',
      `¿Estás seguro que quieres eliminar amistad con ${profile.nombre} ${profile.apellidos}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: handleEliminarRelacion },
      ],
    );
  }

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
  if (!profile) return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.muted }}>Usuario no encontrado</Text></View>;

  const initials = `${profile.nombre.charAt(0)}${profile.apellidos?.charAt(0) ?? ''}`.toUpperCase();

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <TouchableOpacity style={s.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        <Text style={s.backText}>Volver</Text>
      </TouchableOpacity>

      <View style={s.avatarSection}>
        <View style={s.avatarWrap}>
          {profile.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={s.avatarImg} /> : <Text style={s.avatarText}>{initials}</Text>}
          {profile.online && <View style={s.onlineDot} />}
        </View>
        <Text style={s.name}>{profile.nombre} {profile.apellidos}</Text>
        <Text style={s.username}>@{profile.username}</Text>
        {profile.zona && <Text style={s.zona}><Ionicons name="location-outline" size={13} /> {profile.zona}</Text>}

        {friendStatus === 'ninguno' && (
          <TouchableOpacity style={[s.friendBtn, s.friendBtnPrimary]} onPress={handleEnviarSolicitud} disabled={friendLoading}>
            {friendLoading ? <ActivityIndicator size="small" color={colors.primary} /> : (
              <>
                <Ionicons name="person-add-outline" size={16} color={colors.primary} />
                <Text style={[s.friendBtnText, { color: colors.primary }]}>Enviar solicitud</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {friendStatus === 'pendiente_enviada' && (
          <TouchableOpacity style={s.friendBtn} onPress={confirmEliminarRelacion} disabled={friendLoading}>
            {friendLoading ? <ActivityIndicator size="small" color={colors.muted} /> : (
              <>
                <Ionicons name="close-outline" size={16} color={colors.muted} />
                <Text style={s.friendBtnText}>Cancelar solicitud</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {friendStatus === 'pendiente_recibida' && (
          <View style={s.friendRow}>
            <TouchableOpacity style={[s.friendBtn, s.friendBtnSuccess, s.friendBtnHalf]} onPress={handleAceptarSolicitud} disabled={friendLoading}>
              {friendLoading ? <ActivityIndicator size="small" color={colors.success} /> : (
                <>
                  <Ionicons name="checkmark-outline" size={16} color={colors.success} />
                  <Text style={[s.friendBtnText, { color: colors.success }]}>Aceptar</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[s.friendBtn, s.friendBtnHalf]} onPress={handleRechazarSolicitud} disabled={friendLoading}>
              <Ionicons name="close-outline" size={16} color={colors.muted} />
              <Text style={s.friendBtnText}>Rechazar</Text>
            </TouchableOpacity>
          </View>
        )}
        {friendStatus === 'amigos' && (
          <View style={s.friendRow}>
            <TouchableOpacity style={[s.friendBtn, s.friendBtnPrimary, s.friendBtnHalf]} onPress={handleAbrirChat} disabled={chatLoading}>
              {chatLoading ? <ActivityIndicator size="small" color={colors.primary} /> : (
                <>
                  <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                  <Text style={[s.friendBtnText, { color: colors.primary }]}>Mensaje</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[s.friendBtn, s.friendBtnSuccess, s.friendBtnHalf]} onPress={confirmEliminarRelacion} disabled={friendLoading}>
              {friendLoading ? <ActivityIndicator size="small" color={colors.success} /> : (
                <>
                  <Ionicons name="checkmark-done-outline" size={16} color={colors.success} />
                  <Text style={[s.friendBtnText, { color: colors.success }]}>Amigos</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={s.statsRow}>
        <View style={s.stat}><Text style={s.statVal}>{rutas.length}</Text><Text style={s.statLbl}>Rutas</Text></View>
        <View style={[s.stat, s.statBorder]}><Text style={s.statVal}>{motos.length}</Text><Text style={s.statLbl}>Motos</Text></View>
        <TouchableOpacity style={[s.stat, s.statBorder]} onPress={() => router.push(`/amigos/${profile.username}` as any)}>
          <Text style={s.statVal}>{friendCount}</Text><Text style={s.statLbl}>Amigos</Text>
        </TouchableOpacity>
        <View style={s.stat}><Text style={[s.statVal, { color: profile.online ? colors.success : colors.muted, fontSize: 12 }]}>{profile.online ? 'En línea' : 'Offline'}</Text><Text style={s.statLbl}>Estado</Text></View>
      </View>

      {motos.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>🏍 MOTO</Text>
          {motos.map((m, i) => (
            <View key={i} style={s.motoCard}>
              <Text style={s.motoName}>{m.marca_modelo}</Text>
              <Text style={s.motoSub}>{m.cilindrada}cc · {m.tipo}</Text>
            </View>
          ))}
        </View>
      )}

      {rutas.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>🗺 RUTAS PUBLICADAS</Text>
          {rutas.map((r: any) => (
            <TouchableOpacity key={r.id} style={s.rutaCard} onPress={() => router.push(`/rutas/${r.id}` as any)}>
              <Text style={s.rutaNombre}>{r.nombre}</Text>
              <Text style={s.rutaSub}>{r.region} · {r.distancia_km}km</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, paddingTop: 56, alignItems: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 20 },
  backText: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarWrap: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: colors.primary, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarImg: { width: 90, height: 90, borderRadius: 45 },
  avatarText: { fontSize: 32, fontWeight: '800', color: colors.primary },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.success, borderWidth: 3, borderColor: colors.background },
  name: { fontSize: 22, fontWeight: '800', color: colors.foreground },
  username: { color: colors.primary, fontSize: 15, fontWeight: '600', marginTop: 2 },
  zona: { color: colors.muted, fontSize: 13, marginTop: 4 },
  statsRow: { flexDirection: 'row', width: '100%', backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  statVal: { fontSize: 20, fontWeight: '800', color: colors.primary },
  statLbl: { color: colors.muted, fontSize: 11, marginTop: 2 },
  section: { width: '100%', marginBottom: 20 },
  sectionTitle: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  motoCard: { backgroundColor: colors.surface1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: colors.primary, padding: 12, marginBottom: 8 },
  motoName: { color: colors.foreground, fontWeight: '700', fontSize: 14 },
  motoSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  rutaCard: { backgroundColor: colors.surface1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 8 },
  rutaNombre: { color: colors.foreground, fontWeight: '700', fontSize: 14 },
  rutaSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  friendRow: { flexDirection: 'row', gap: 10, marginTop: 14, width: '100%' },
  friendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 14, paddingVertical: 10, paddingHorizontal: 20, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface1,
  },
  friendBtnHalf: { flex: 1, marginTop: 0 },
  friendBtnPrimary: { borderColor: colors.primary, backgroundColor: 'rgba(255,107,26,0.1)' },
  friendBtnSuccess: { borderColor: colors.success, backgroundColor: 'rgba(34,197,94,0.1)' },
  friendBtnText: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
});
