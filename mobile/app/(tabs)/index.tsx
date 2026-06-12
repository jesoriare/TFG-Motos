import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/constants/theme';
import ChatAccess from '@/components/ChatAccess';

export default function InicioScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [stats] = useState([
    { icon: 'people', value: '12.400+', label: 'Moteros activos' },
    { icon: 'map', value: '3.800+', label: 'Rutas publicadas' },
    { icon: 'warning', value: 'En directo', label: 'Incidencias' },
  ]);

  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoggedIn(false); return; }
    setLoggedIn(true);
    const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', session.user.id).single();
    if (data) { setUsername(data.username); setAvatarUrl(data.avatar_url); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const menu = [
    { icon: 'map-outline', label: 'Rutas', sub: 'Descubre rutas épicas', route: '/(tabs)/rutas', color: colors.primary },
    { icon: 'people-outline', label: 'Moteros', sub: 'Conecta con la comunidad', route: '/(tabs)/moteros', color: '#3B82F6' },
    { icon: 'warning-outline', label: 'Incidencias', sub: 'Alertas en tiempo real', route: '/(tabs)/incidencias', color: colors.amber },
    { icon: 'person-outline', label: 'Mi perfil', sub: 'Tu cuenta y configuración', route: '/(tabs)/perfil', color: colors.success },
  ];

  return (
    <ChatAccess>
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Hola{username ? `, @${username}` : ''} 👋</Text>
          <Text style={s.logo}>RODADA<Text style={s.logoOrange}>MOTO</Text></Text>
        </View>
        <TouchableOpacity style={s.avatar} onPress={() => router.push('/(tabs)/perfil')}>
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            : <Ionicons name="person" size={20} color={colors.primary} />
          }
        </TouchableOpacity>
      </View>

      {/* Hero */}
      <View style={s.hero}>
        <View style={s.badge}>
          <View style={s.dot} />
          <Text style={s.badgeText}>PLATAFORMA DE MOTEROS</Text>
        </View>
        <Text style={s.heroTitle}>LA RUTA{'\n'}<Text style={s.heroOrange}>EMPIEZA</Text>{'\n'}AQUÍ</Text>
        <Text style={s.heroSub}>Conecta con moteros de tu zona, descubre rutas épicas y comparte incidencias en tiempo real.</Text>

        {!loggedIn && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' }}
              onPress={() => router.push('/entrar')}
            >
              <Text style={{ color: colors.primaryFg, fontWeight: '800', fontSize: 13, letterSpacing: 1 }}>INICIAR SESIÓN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' }}
              onPress={() => router.push('/registro')}
            >
              <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>Únete gratis</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {stats.map((stat) => (
          <View key={stat.label} style={s.statCard}>
            <Ionicons name={stat.icon as any} size={18} color={colors.primary} />
            <Text style={s.statValue}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Menu */}
      <Text style={s.sectionTitle}>ACCESO RÁPIDO</Text>
      <View style={s.menuGrid}>
        {menu.map((item) => (
          <TouchableOpacity key={item.label} style={s.menuCard} onPress={() => router.push(item.route as any)}>
            <View style={[s.menuIcon, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <Text style={s.menuLabel}>{item.label}</Text>
            <Text style={s.menuSub}>{item.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
    </ChatAccess>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: 20, paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  greeting: { color: colors.muted, fontSize: 13 },
  logo: { fontSize: 24, fontWeight: '900', color: colors.foreground, letterSpacing: -0.5 },
  logoOrange: { color: colors.primary },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  hero: { marginBottom: 24 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary + '60', backgroundColor: colors.primary + '18', borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 14 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  badgeText: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  heroTitle: { fontSize: 52, fontWeight: '900', color: colors.foreground, lineHeight: 54, marginBottom: 12 },
  heroOrange: { color: colors.primary },
  heroSub: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statCard: { flex: 1, backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: 'center', gap: 4 },
  statValue: { color: colors.foreground, fontSize: 14, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 10, textAlign: 'center' },
  sectionTitle: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 12 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 100 },
  menuCard: { width: '47%', backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 },
  menuIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { color: colors.foreground, fontSize: 15, fontWeight: '700' },
  menuSub: { color: colors.muted, fontSize: 12 },
});
