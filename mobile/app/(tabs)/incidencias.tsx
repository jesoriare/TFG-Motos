import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getIncidencias, confirmarIncidencia, eliminarIncidencia } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/constants/theme';
import ChatAccess from '@/components/ChatAccess';

const TIPO_ICON: Record<string, string> = {
  control_gc: 'shield', radar: 'speedometer', firme_mal_estado: 'warning',
  accidente: 'alert-circle', obras: 'construct', otro: 'alert-circle',
};
const TIPO_LABEL: Record<string, string> = {
  control_gc: 'Control GC', radar: 'Radar móvil', firme_mal_estado: 'Firme en mal estado',
  accidente: 'Accidente', obras: 'Obras', otro: 'Otro',
};
const SEV_COLOR: Record<string, string> = {
  high: colors.danger, medium: colors.amber, low: '#3B82F6', resolved: colors.success,
};
const SEV_LABEL: Record<string, string> = {
  high: 'URGENTE', medium: 'PRECAUCIÓN', low: 'INFORMATIVA', resolved: 'RESUELTA',
};

const TIPOS_OPCIONES = [
  { key: 'control_gc', label: 'Control GC', icon: 'shield' },
  { key: 'radar', label: 'Radar móvil', icon: 'speedometer' },
  { key: 'firme_mal_estado', label: 'Firme en mal estado', icon: 'warning' },
  { key: 'accidente', label: 'Accidente', icon: 'alert-circle' },
  { key: 'obras', label: 'Obras', icon: 'construct' },
  { key: 'otro', label: 'Otro', icon: 'ellipsis-horizontal' },
];

const SEV_OPCIONES = [
  { key: 'high', label: 'Urgente', color: colors.danger },
  { key: 'medium', label: 'Precaución', color: colors.amber },
  { key: 'low', label: 'Informativa', color: '#3B82F6' },
];

interface Incidencia {
  id: string; user_id: string; tipo: string; descripcion: string; via: string;
  severidad: string; confirmaciones: number; created_at: string;
  profiles: { username: string };
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)}min`;
  return `Hace ${Math.floor(diff / 3600)}h`;
}

export default function IncidenciasScreen() {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState({ tipo: 'control_gc', descripcion: '', via: '', severidad: 'medium', expiry_hours: 2 });

  async function fetchIncidencias() {
    const data = await getIncidencias();
    setIncidencias(data ?? []);
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchIncidencias();
    setRefreshing(false);
  }

  useEffect(() => {
    fetchIncidencias();
    supabase.auth.getSession().then(({ data }) => setCurrentUserId(data.session?.user.id ?? null));
  }, []);

  async function handleConfirmar(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { Alert.alert('Inicia sesión', 'Debes iniciar sesión para confirmar'); return; }
    const result = await confirmarIncidencia(id, session.access_token);
    if (result) {
      setConfirmedIds(prev => {
        const next = new Set(prev);
        result.confirmado ? next.add(id) : next.delete(id);
        return next;
      });
      fetchIncidencias();
    }
  }

  async function handleEliminar(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    Alert.alert('Eliminar incidencia', '¿Seguro que quieres eliminarla?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          const ok = await eliminarIncidencia(id, session.access_token);
          if (ok) setIncidencias(prev => prev.filter(i => i.id !== id));
        },
      },
    ]);
  }

  async function handleReportar() {
    if (!form.descripcion || !form.via) {
      Alert.alert('Error', 'Rellena la descripción y la vía');
      return;
    }
    setEnviando(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para reportar una incidencia');
      setEnviando(false);
      return;
    }

    const expires_at = new Date(Date.now() + form.expiry_hours * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from('incidencias').insert({
      user_id: session.user.id,
      tipo: form.tipo,
      descripcion: form.descripcion,
      via: form.via,
      severidad: form.severidad,
      expires_at,
      lat: 0, lng: 0,
    });

    setEnviando(false);
    if (error) { Alert.alert('Error', error.message); return; }

    setModalVisible(false);
    setForm({ tipo: 'control_gc', descripcion: '', via: '', severidad: 'medium', expiry_hours: 2 });
    Alert.alert('¡Gracias!', 'Incidencia reportada correctamente');
    fetchIncidencias();
  }

  return (
    <ChatAccess>
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>INCIDENCIAS</Text>
          <Text style={s.sub}>En tiempo real</Text>
        </View>
        <TouchableOpacity style={s.reportBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={18} color={colors.primaryFg} />
          <Text style={s.reportBtnText}>Reportar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={incidencias}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 100, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={s.empty}>No hay incidencias activas</Text>}
          renderItem={({ item: inc }) => {
            const sevColor = SEV_COLOR[inc.severidad] ?? colors.muted;
            const isOwn = inc.user_id === currentUserId;
            return (
              <View style={[s.card, { borderLeftColor: sevColor, borderLeftWidth: 3 }]}>
                <View style={s.cardTop}>
                  <View style={[s.iconBox, { backgroundColor: sevColor + '20' }]}>
                    <Ionicons name={(TIPO_ICON[inc.tipo] ?? 'alert-circle') as any} size={18} color={sevColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.tipo}>{TIPO_LABEL[inc.tipo] ?? inc.tipo}</Text>
                    <Text style={s.via}>{inc.via}</Text>
                  </View>
                  <View style={[s.sevBadge, { backgroundColor: sevColor + '20', borderColor: sevColor + '40' }]}>
                    <Text style={[s.sevText, { color: sevColor }]}>{SEV_LABEL[inc.severidad] ?? inc.severidad.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={s.desc}>{inc.descripcion}</Text>
                <View style={s.footer}>
                  <Text style={s.meta}>{timeAgo(inc.created_at)} · @{inc.profiles?.username}</Text>
                  <View style={s.actions}>
                    {!isOwn && currentUserId && (() => {
                      const confirmed = confirmedIds.has(inc.id);
                      return (
                        <TouchableOpacity
                          style={[s.confirmBtn, confirmed && s.confirmBtnActive]}
                          onPress={() => handleConfirmar(inc.id)}
                        >
                          <Ionicons
                            name={confirmed ? 'checkmark-circle' : 'checkmark-circle-outline'}
                            size={14}
                            color={confirmed ? colors.success : colors.muted}
                          />
                          {confirmed && <Text style={[s.confirmText, { color: colors.success }]}>Confirmada</Text>}
                          <Text style={[s.confirmText, confirmed && { color: colors.success }]}>{inc.confirmaciones}</Text>
                        </TouchableOpacity>
                      );
                    })()}
                    {isOwn && (
                      <TouchableOpacity onPress={() => handleEliminar(inc.id)} style={s.deleteBtn}>
                        <Ionicons name="trash-outline" size={14} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                    {!currentUserId && (
                      <View style={s.confirmBtn}>
                        <Ionicons name="checkmark-circle-outline" size={14} color={colors.muted} />
                        <Text style={s.confirmText}>{inc.confirmaciones}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Reportar incidencia</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={22} color={colors.muted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.label}>TIPO DE INCIDENCIA</Text>
                <View style={s.tiposGrid}>
                  {TIPOS_OPCIONES.map(t => (
                    <TouchableOpacity
                      key={t.key}
                      style={[s.tipoBtn, form.tipo === t.key && s.tipoBtnActive]}
                      onPress={() => setForm(p => ({ ...p, tipo: t.key }))}
                    >
                      <Ionicons name={t.icon as any} size={18} color={form.tipo === t.key ? colors.primary : colors.muted} />
                      <Text style={[s.tipoBtnText, form.tipo === t.key && { color: colors.primary }]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.label}>SEVERIDAD</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  {SEV_OPCIONES.map(sv => (
                    <TouchableOpacity
                      key={sv.key}
                      style={[s.sevBtn, form.severidad === sv.key && { borderColor: sv.color, backgroundColor: sv.color + '20' }]}
                      onPress={() => setForm(p => ({ ...p, severidad: sv.key }))}
                    >
                      <Text style={[s.sevBtnText, form.severidad === sv.key && { color: sv.color }]}>{sv.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.label}>VÍA / CARRETERA *</Text>
                <TextInput
                  style={s.input}
                  value={form.via}
                  onChangeText={v => setForm(p => ({ ...p, via: v }))}
                  placeholder="Ej: A-4, km 47 dirección Córdoba"
                  placeholderTextColor={colors.muted + '60'}
                />

                <Text style={s.label}>TIEMPO DE EXPIRACIÓN</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  {[1, 2, 4, 8, 24].map(h => (
                    <TouchableOpacity
                      key={h}
                      style={[s.sevBtn, form.expiry_hours === h && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }]}
                      onPress={() => setForm(p => ({ ...p, expiry_hours: h }))}
                    >
                      <Text style={[s.sevBtnText, form.expiry_hours === h && { color: colors.primary }]}>{h}h</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.label}>DESCRIPCIÓN *</Text>
                <TextInput
                  style={[s.input, { height: 90, textAlignVertical: 'top' }]}
                  value={form.descripcion}
                  onChangeText={v => setForm(p => ({ ...p, descripcion: v }))}
                  placeholder="Describe la incidencia..."
                  placeholderTextColor={colors.muted + '60'}
                  multiline
                />

                <TouchableOpacity style={[s.submitBtn, enviando && { opacity: 0.5 }]} onPress={handleReportar} disabled={enviando}>
                  {enviando
                    ? <ActivityIndicator color={colors.primaryFg} />
                    : <Text style={s.submitBtnText}>ENVIAR REPORTE</Text>
                  }
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
    </ChatAccess>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  title: { fontSize: 36, fontWeight: '900', color: colors.foreground },
  sub: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  reportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8 },
  reportBtnText: { color: colors.primaryFg, fontWeight: '800', fontSize: 13 },
  card: { backgroundColor: colors.surface1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tipo: { color: colors.foreground, fontWeight: '700', fontSize: 14 },
  via: { color: colors.muted, fontSize: 12 },
  sevBadge: { borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  sevText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  desc: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { color: colors.muted, fontSize: 11, flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.full },
  confirmBtnActive: { backgroundColor: colors.success + '20' },
  confirmText: { color: colors.muted, fontSize: 11 },
  deleteBtn: { padding: 2 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000AA' },
  modalCard: { backgroundColor: colors.surface1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: colors.foreground, fontWeight: '800', fontSize: 18 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  tiposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tipoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.surface2 },
  tipoBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  tipoBtnText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  sevBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 8, alignItems: 'center', backgroundColor: colors.surface2 },
  sevBtnText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  input: { backgroundColor: colors.surface3, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.foreground, fontSize: 14, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 14 },
  submitBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 20 },
  submitBtnText: { color: colors.primaryFg, fontWeight: '800', fontSize: 14, letterSpacing: 1.5 },
});
