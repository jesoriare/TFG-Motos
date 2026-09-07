import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '@/lib/auth';
import { colors, radius } from '@/constants/theme';
import { getGrupo, expulsarMiembroGrupo, invitarAGrupo, salirDeGrupo, eliminarGrupo, editarGrupo, getRutas } from '@/lib/api';

interface Miembro {
  id: string;
  username: string;
  nombre: string;
  apellidos: string;
  avatar_url: string | null;
  verified: boolean;
}

interface GrupoDetalle {
  id: string;
  nombre: string;
  descripcion: string | null;
  privacidad: 'privado' | 'publico';
  lider_id: string;
  ruta_id: string | null;
  ruta: { id: string; nombre: string; region: string } | null;
  miembros: Miembro[];
}

interface RutaPropia {
  id: string;
  nombre: string;
  region: string;
}

export default function GrupoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [grupo, setGrupo] = useState<GrupoDetalle | null>(null);
  const [miUserId, setMiUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editPrivacidad, setEditPrivacidad] = useState<'privado' | 'publico'>('privado');
  const [editRutaId, setEditRutaId] = useState<string | null>(null);
  const [editRutas, setEditRutas] = useState<RutaPropia[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const session = await getSession();
    if (!session) { router.replace('/entrar'); return; }
    setMiUserId(session.user.id);

    const { status, data } = await getGrupo(id, session.token);
    if (status === 403) { setForbidden(true); setLoading(false); return; }
    if (status === 404) { setNotFound(true); setLoading(false); return; }
    setGrupo(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const esLider = !!(grupo && miUserId && grupo.lider_id === miUserId);

  async function handleExpulsar(userId: string) {
    const session = await getSession();
    if (!session) return;
    setProcessingIds(prev => new Set(prev).add(userId));
    if (await expulsarMiembroGrupo(id, userId, session.token)) {
      setGrupo(prev => prev ? { ...prev, miembros: prev.miembros.filter(m => m.id !== userId) } : prev);
    }
    setProcessingIds(prev => { const next = new Set(prev); next.delete(userId); return next; });
  }

  function confirmExpulsar(userId: string, username: string) {
    Alert.alert('¿Expulsar a este usuario?', `@${username} dejará de pertenecer al grupo. Podrás volver a invitarle más adelante.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Expulsar', style: 'destructive', onPress: () => handleExpulsar(userId) },
    ]);
  }

  async function handleInvitar() {
    if (!inviteUsername.trim()) return;
    const session = await getSession();
    if (!session) return;
    setInviteLoading(true);
    setInviteMsg(null);
    const { error } = await invitarAGrupo(id, inviteUsername.trim(), session.token);
    setInviteLoading(false);
    if (error) { setInviteMsg({ ok: false, text: error }); return; }
    setInviteMsg({ ok: true, text: `Invitación enviada a @${inviteUsername.trim()}` });
    setInviteUsername('');
  }

  function confirmSalir() {
    Alert.alert('¿Salir de este grupo?', 'Podrás volver a unirte si te invitan de nuevo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive', onPress: async () => {
          const session = await getSession();
          if (!session) return;
          if (await salirDeGrupo(id, session.token)) router.replace('/grupos' as any);
        },
      },
    ]);
  }

  async function openEdit() {
    if (!grupo) return;
    setEditNombre(grupo.nombre);
    setEditDescripcion(grupo.descripcion ?? '');
    setEditPrivacidad(grupo.privacidad);
    setEditRutaId(grupo.ruta_id ?? null);
    setEditError(null);
    setEditMode(true);
    const session = await getSession();
    if (session) {
      const propias = await getRutas({ username: session.user.username });
      setEditRutas(propias);
    }
  }

  async function handleGuardarEdicion() {
    if (!editNombre.trim()) return;
    const session = await getSession();
    if (!session) return;
    setEditLoading(true);
    setEditError(null);
    const { data, error } = await editarGrupo(
      id, { nombre: editNombre.trim(), descripcion: editDescripcion.trim() || null, privacidad: editPrivacidad, ruta_id: editRutaId },
      session.token
    );
    setEditLoading(false);
    if (error) { setEditError(error); return; }
    setGrupo(prev => prev ? { ...prev, ...data } : prev);
    setEditMode(false);
  }

  function confirmEliminar() {
    Alert.alert('¿Eliminar este grupo?', 'Se eliminará el grupo y todos sus miembros e invitaciones pendientes. Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          const session = await getSession();
          if (!session) return;
          if (await eliminarGrupo(id, session.token)) router.replace('/grupos' as any);
        },
      },
    ]);
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (forbidden || notFound || !grupo) {
    return (
      <View style={s.screen}>
        <View style={s.header}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
            <Text style={s.backText}>Volver</Text>
          </TouchableOpacity>
        </View>
        <View style={s.empty}>
          <Ionicons name={forbidden ? 'lock-closed-outline' : 'alert-circle-outline'} size={40} color={colors.muted} style={{ opacity: 0.4 }} />
          <Text style={s.emptyText}>{forbidden ? 'No perteneces a este grupo' : 'Grupo no encontrado'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.push('/grupos' as any)}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          <Text style={s.backText}>Mis grupos</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        {editMode ? (
          <View style={s.inviteCard}>
            <Text style={s.sectionTitle}>NOMBRE DEL GRUPO</Text>
            <TextInput style={s.inviteInput} value={editNombre} onChangeText={setEditNombre} placeholderTextColor={colors.muted} />

            <Text style={s.sectionTitle}>DESCRIPCIÓN</Text>
            <TextInput
              style={[s.inviteInput, s.textArea]}
              value={editDescripcion}
              onChangeText={setEditDescripcion}
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
            />

            <Text style={s.sectionTitle}>PRIVACIDAD</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[s.rutaChip, { flex: 1 }, editPrivacidad === 'privado' && s.rutaChipActive]}
                onPress={() => setEditPrivacidad('privado')}
              >
                <Ionicons name="lock-closed-outline" size={14} color={editPrivacidad === 'privado' ? colors.primary : colors.muted} />
                <Text style={[s.rutaChipText, editPrivacidad === 'privado' && s.rutaChipTextActive]}>Privado</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.rutaChip, { flex: 1 }, editPrivacidad === 'publico' && s.rutaChipActive]}
                onPress={() => setEditPrivacidad('publico')}
              >
                <Ionicons name="globe-outline" size={14} color={editPrivacidad === 'publico' ? colors.primary : colors.muted} />
                <Text style={[s.rutaChipText, editPrivacidad === 'publico' && s.rutaChipTextActive]}>Público</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.sectionTitle}>RUTA VINCULADA</Text>
            <View style={{ gap: 8 }}>
              <TouchableOpacity style={[s.rutaChip, editRutaId === null && s.rutaChipActive]} onPress={() => setEditRutaId(null)}>
                <Text style={[s.rutaChipText, editRutaId === null && s.rutaChipTextActive]}>Sin ruta</Text>
              </TouchableOpacity>
              {editRutas.map((r) => (
                <TouchableOpacity key={r.id} style={[s.rutaChip, editRutaId === r.id && s.rutaChipActive]} onPress={() => setEditRutaId(r.id)}>
                  <Text style={[s.rutaChipText, editRutaId === r.id && s.rutaChipTextActive]} numberOfLines={1}>{r.nombre} — {r.region}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {editError && <Text style={{ color: colors.danger, fontSize: 12 }}>{editError}</Text>}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <TouchableOpacity style={[s.inviteBtn, { flex: 1, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border }]} onPress={() => setEditMode(false)}>
                <Text style={[s.inviteBtnText, { color: colors.foreground }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.inviteBtn, { flex: 1 }]} onPress={handleGuardarEdicion} disabled={editLoading || !editNombre.trim()}>
                {editLoading ? <ActivityIndicator size="small" color={colors.primaryFg} /> : <Text style={s.inviteBtnText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={s.titleRow}>
              <View style={s.groupIcon}>
                <Ionicons name="people" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={s.nameRow}>
                  <Text style={s.title} numberOfLines={1}>{grupo.nombre}</Text>
                  {esLider && <Ionicons name="ribbon" size={18} color={colors.primary} />}
                  {esLider && (
                    <TouchableOpacity onPress={openEdit} hitSlop={8}>
                      <Ionicons name="pencil" size={16} color={colors.muted} />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {grupo.ruta ? (
                    <TouchableOpacity onPress={() => router.push(`/rutas/${grupo.ruta!.id}` as any)}>
                      <Text style={s.rutaLink}>{grupo.ruta.nombre} — {grupo.ruta.region}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={s.rutaNone}>Sin ruta vinculada</Text>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name={grupo.privacidad === 'publico' ? 'globe-outline' : 'lock-closed-outline'} size={11} color={colors.muted} />
                    <Text style={s.rutaNone}>{grupo.privacidad === 'publico' ? 'Público' : 'Privado'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {grupo.descripcion && <Text style={s.descripcion}>{grupo.descripcion}</Text>}

            <TouchableOpacity style={s.chatBtn} onPress={() => router.push(`/grupos/chat/${id}` as any)}>
              <Ionicons name="chatbubbles-outline" size={18} color={colors.primaryFg} />
              <Text style={s.chatBtnText}>Chat del grupo</Text>
            </TouchableOpacity>
          </>
        )}

        {!editMode && esLider && (
          <View style={s.inviteCard}>
            <Text style={s.sectionTitle}>INVITAR AMIGO</Text>
            <View style={s.inviteRow}>
              <TextInput
                style={s.inviteInput}
                value={inviteUsername}
                onChangeText={setInviteUsername}
                placeholder="username"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
              />
              <TouchableOpacity style={s.inviteBtn} onPress={handleInvitar} disabled={inviteLoading || !inviteUsername.trim()}>
                {inviteLoading ? <ActivityIndicator size="small" color={colors.primaryFg} /> : <Text style={s.inviteBtnText}>Invitar</Text>}
              </TouchableOpacity>
            </View>
            {inviteMsg && (
              <Text style={[s.inviteMsg, { color: inviteMsg.ok ? colors.success : colors.danger }]}>{inviteMsg.text}</Text>
            )}
          </View>
        )}

        <Text style={[s.sectionTitle, { marginTop: 20, marginBottom: 10 }]}>MIEMBROS ({grupo.miembros.length})</Text>
        <View style={{ gap: 10 }}>
          {grupo.miembros.map((m) => {
            const initials = `${m.nombre.charAt(0)}${m.apellidos?.charAt(0) ?? ''}`.toUpperCase();
            const esLiderMiembro = m.id === grupo.lider_id;
            const processing = processingIds.has(m.id);
            return (
              <View key={m.id} style={s.card}>
                <TouchableOpacity style={s.avatarWrap} onPress={() => router.push(`/perfil/${m.username}` as any)}>
                  {m.avatar_url
                    ? <Image source={{ uri: m.avatar_url }} style={s.avatarImg} />
                    : <Text style={s.avatarText}>{initials}</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity style={s.info} onPress={() => router.push(`/perfil/${m.username}` as any)}>
                  <View style={s.nameRow}>
                    <Text style={s.name} numberOfLines={1}>{m.nombre} {m.apellidos}</Text>
                    {m.verified && <Ionicons name="shield-checkmark" size={14} color={colors.primary} />}
                    {esLiderMiembro && <Ionicons name="ribbon" size={14} color={colors.primary} />}
                  </View>
                  <Text style={s.username} numberOfLines={1}>@{m.username}</Text>
                </TouchableOpacity>
                {esLider && !esLiderMiembro && (
                  <TouchableOpacity style={s.kickBtn} onPress={() => confirmExpulsar(m.id, m.username)} disabled={processing}>
                    {processing ? <ActivityIndicator size="small" color={colors.danger} /> : <Ionicons name="person-remove-outline" size={18} color={colors.muted} />}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={s.dangerBtn} onPress={esLider ? confirmEliminar : confirmSalir}>
          <Ionicons name={esLider ? 'trash-outline' : 'log-out-outline'} size={18} color={colors.danger} />
          <Text style={s.dangerBtnText}>{esLider ? 'Eliminar grupo' : 'Salir del grupo'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  backText: { color: colors.foreground, fontSize: 14, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  body: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  groupIcon: {
    width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,107,26,0.15)',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: colors.foreground, fontSize: 22, fontWeight: '900', flexShrink: 1 },
  rutaLink: { color: colors.muted, fontSize: 12, marginTop: 2 },
  rutaNone: { color: colors.muted, fontSize: 12, marginTop: 2, opacity: 0.6 },
  descripcion: { color: colors.muted, fontSize: 13, marginBottom: 16, lineHeight: 19 },
  sectionTitle: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  textArea: { textAlignVertical: 'top', minHeight: 70 },
  rutaChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10,
  },
  rutaChipActive: { borderColor: colors.primary, backgroundColor: 'rgba(255,107,26,0.12)' },
  rutaChipText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  rutaChipTextActive: { color: colors.primary },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 13, marginBottom: 16,
  },
  chatBtnText: { color: colors.primaryFg, fontWeight: '800', fontSize: 13 },
  inviteCard: {
    backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 8, gap: 10,
  },
  inviteRow: { flexDirection: 'row', gap: 8 },
  inviteInput: {
    flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.foreground, fontSize: 13,
  },
  inviteBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center',
  },
  inviteBtnText: { color: colors.primaryFg, fontWeight: '800', fontSize: 12 },
  inviteMsg: { fontSize: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12,
  },
  avatarWrap: {
    width: 48, height: 48, borderRadius: radius.md, overflow: 'hidden',
    backgroundColor: 'rgba(255,107,26,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
  info: { flex: 1, minWidth: 0 },
  name: { color: colors.foreground, fontWeight: '700', fontSize: 14, flexShrink: 1 },
  username: { color: colors.muted, fontSize: 12, marginTop: 2 },
  kickBtn: {
    width: 36, height: 36, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 24, borderWidth: 1, borderColor: colors.danger + '40', backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: radius.md, paddingVertical: 13,
  },
  dangerBtnText: { color: colors.danger, fontWeight: '800', fontSize: 13 },
});
