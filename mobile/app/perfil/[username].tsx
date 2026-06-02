import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/constants/theme';

export default function PerfilUsuarioScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [motos, setMotos] = useState<any[]>([]);
  const [rutas, setRutas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase.from('profiles').select('*').eq('username', username).single();
      if (!p) { setLoading(false); return; }
      setProfile(p);
      const [{ data: m }, { data: r }] = await Promise.all([
        supabase.from('motos').select('marca_modelo, cilindrada, tipo').eq('user_id', p.id),
        supabase.from('rutas').select('id, nombre, region, distancia_km, duracion_min, dificultad').eq('user_id', p.id).eq('publicada', true),
      ]);
      setMotos(m ?? []);
      setRutas(r ?? []);
      setLoading(false);
    }
    load();
  }, [username]);

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
  if (!profile) return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.muted }}>Usuario no encontrado</Text></View>;

  const initials = `${profile.nombre.charAt(0)}${profile.apellidos?.charAt(0) ?? ''}`.toUpperCase();

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
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
      </View>

      <View style={s.statsRow}>
        <View style={s.stat}><Text style={s.statVal}>{rutas.length}</Text><Text style={s.statLbl}>Rutas</Text></View>
        <View style={[s.stat, s.statBorder]}><Text style={s.statVal}>{motos.length}</Text><Text style={s.statLbl}>Motos</Text></View>
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
            <View key={r.id} style={s.rutaCard}>
              <Text style={s.rutaNombre}>{r.nombre}</Text>
              <Text style={s.rutaSub}>{r.region} · {r.distancia_km}km</Text>
            </View>
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
});
