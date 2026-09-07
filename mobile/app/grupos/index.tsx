import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '@/lib/auth';
import { colors, radius } from '@/constants/theme';
import { getMisGrupos, getInvitacionesGrupo, aceptarInvitacionGrupo, rechazarInvitacionGrupo } from '@/lib/api';

interface Grupo {
  id: string;
  nombre: string;
  rol: 'lider' | 'miembro';
  ruta: { id: string; nombre: string; region: string } | null;
}

interface Invitacion {
  id: string;
  grupo: { id: string; nombre: string };
  emisor: { username: string; nombre: string; avatar_url: string | null };
}

export default function GruposScreen() {
  const router = useRouter();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  async function load() {
    const session = await getSession();
    if (!session) { router.replace('/entrar'); return; }
    const [g, i] = await Promise.all([getMisGrupos(session.token), getInvitacionesGrupo(session.token)]);
    setGrupos(g);
    setInvitaciones(i);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleAceptar(id: string) {
    const session = await getSession();
    if (!session) return;
    setProcessingIds(prev => new Set(prev).add(id));
    if (await aceptarInvitacionGrupo(id, session.token)) {
      setInvitaciones(prev => prev.filter(inv => inv.id !== id));
      load();
    }
    setProcessingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  }

  async function handleRechazar(id: string) {
    const session = await getSession();
    if (!session) return;
    setProcessingIds(prev => new Set(prev).add(id));
    if (await rechazarInvitacionGrupo(id, session.token)) {
      setInvitaciones(prev => prev.filter(inv => inv.id !== id));
    }
    setProcessingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  }

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          <Text style={s.backText}>Volver</Text>
        </TouchableOpacity>
        <View style={s.headerRow}>
          <View>
            <Text style={s.eyebrow}>COMUNIDAD</Text>
            <Text style={s.title}>MIS GRUPOS</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.publicBtn} onPress={() => router.push('/grupos/publicos' as any)}>
              <Ionicons name="globe-outline" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity style={s.createBtn} onPress={() => router.push('/grupos/crear' as any)}>
              <Ionicons name="add" size={18} color={colors.primaryFg} />
              <Text style={s.createBtnText}>Crear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={grupos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={grupos.length === 0 ? [s.list, { flexGrow: 1 }] : s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            invitaciones.length > 0 ? (
              <View style={{ marginBottom: 16, gap: 10 }}>
                <Text style={s.sectionTitle}>INVITACIONES RECIBIDAS</Text>
                {invitaciones.map((inv) => {
                  const processing = processingIds.has(inv.id);
                  return (
                    <View key={inv.id} style={s.card}>
                      <View style={s.info}>
                        <Text style={s.name} numberOfLines={1}>{inv.grupo.nombre}</Text>
                        <Text style={s.username} numberOfLines={1}>Invitado por @{inv.emisor.username}</Text>
                      </View>
                      <View style={s.actions}>
                        <TouchableOpacity style={[s.actionBtn, s.acceptBtn]} onPress={() => handleAceptar(inv.id)} disabled={processing}>
                          {processing ? <ActivityIndicator size="small" color={colors.success} /> : <Ionicons name="checkmark" size={18} color={colors.success} />}
                        </TouchableOpacity>
                        <TouchableOpacity style={s.actionBtn} onPress={() => handleRechazar(inv.id)} disabled={processing}>
                          <Ionicons name="close" size={18} color={colors.muted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={40} color={colors.muted} style={{ opacity: 0.4 }} />
              <Text style={s.emptyText}>Todavía no perteneces a ningún grupo</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => router.push(`/grupos/${item.id}` as any)}>
              <View style={s.groupIcon}>
                <Ionicons name="people" size={20} color={colors.primary} />
              </View>
              <View style={s.info}>
                <View style={s.nameRow}>
                  <Text style={s.name} numberOfLines={1}>{item.nombre}</Text>
                  {item.rol === 'lider' && <Ionicons name="ribbon" size={14} color={colors.primary} />}
                </View>
                {item.ruta ? (
                  <Text style={s.username} numberOfLines={1}>{item.ruta.nombre}</Text>
                ) : (
                  <Text style={[s.username, { opacity: 0.6 }]} numberOfLines={1}>Sin ruta vinculada</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
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
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 4 },
  title: { color: colors.foreground, fontSize: 26, fontWeight: '900', letterSpacing: 0.5 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 9,
  },
  createBtnText: { color: colors.primaryFg, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  publicBtn: {
    alignItems: 'center', justifyContent: 'center', width: 38, height: 38,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  sectionTitle: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12,
  },
  groupIcon: {
    width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,107,26,0.15)',
  },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.foreground, fontWeight: '700', fontSize: 14, flexShrink: 1 },
  username: { color: colors.muted, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36, height: 36, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  acceptBtn: { borderColor: colors.success + '40', backgroundColor: 'rgba(34,197,94,0.1)' },
});
