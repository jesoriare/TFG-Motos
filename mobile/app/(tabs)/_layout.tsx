import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { supabase } from '@/lib/supabase';
import { colors, radius } from '@/constants/theme';

const TABS = [
  { name: 'index',      label: 'Inicio',   icon: 'home'     },
  { name: 'mapa',       label: 'Mapa',     icon: 'location' },
  { name: 'rutas',      label: 'Rutas',    icon: 'map'      },
  { name: 'moteros',    label: 'Moteros',  icon: 'people'   },
  { name: 'incidencias',label: 'Alertas',  icon: 'warning'  },
  { name: 'perfil',     label: 'Perfil',   icon: 'person'   },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase.from('profiles').select('avatar_url').eq('id', session.user.id).single();
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) { setAvatarUrl(null); return; }
      supabase.from('profiles').select('avatar_url').eq('id', session.user.id).single()
        .then(({ data }) => { if (data?.avatar_url) setAvatarUrl(data.avatar_url); });
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <View style={s.wrapper}>
      <View style={s.container}>
        {TABS.map((tab, index) => {
          const isFocused = state.index === index;
          const isPerfil = tab.name === 'perfil';

          return (
            <TouchableOpacity
              key={tab.name}
              style={[s.tab, isFocused && s.tabActive]}
              onPress={() => navigation.navigate(tab.name)}
              activeOpacity={0.7}
            >
              {isPerfil && avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={[s.avatar, isFocused && s.avatarActive]}
                />
              ) : (
                <Ionicons
                  name={(isFocused ? tab.icon : `${tab.icon}-outline`) as any}
                  size={22}
                  color={isFocused ? colors.primary : colors.muted}
                />
              )}
              <Text style={[s.label, isFocused && s.labelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(() => setChecked(true));
  }, []);

  if (!checked) return null;

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="mapa" />
      <Tabs.Screen name="rutas" />
      <Tabs.Screen name="moteros" />
      <Tabs.Screen name="incidencias" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}

const s = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface1,
    borderRadius: 40,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    gap: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 32,
    gap: 3,
  },
  tabActive: {
    backgroundColor: colors.primary + '18',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.muted,
  },
  avatarActive: {
    borderColor: colors.primary,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.muted,
    letterSpacing: 0.3,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
});
