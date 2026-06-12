import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State, type PanGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';
import { getNoLeidosCount } from '@/lib/api';

const EDGE_WIDTH = 28;
const SWIPE_THRESHOLD = 60;

export default function ChatAccess({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [noLeidos, setNoLeidos] = useState(0);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setNoLeidos(0); return; }
    setNoLeidos(await getNoLeidosCount(session.access_token));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const goToChats = useCallback(() => router.push('/chats' as any), [router]);

  const onHandlerStateChange = useCallback((e: PanGestureHandlerStateChangeEvent) => {
    if (e.nativeEvent.state === State.END && e.nativeEvent.translationX < -SWIPE_THRESHOLD) {
      goToChats();
    }
  }, [goToChats]);

  return (
    <View style={s.flex}>
      {children}
      <PanGestureHandler
        activeOffsetX={[-15, 15]}
        failOffsetY={[-20, 20]}
        onHandlerStateChange={onHandlerStateChange}
      >
        <View style={s.edge} />
      </PanGestureHandler>
      <TouchableOpacity style={s.bubble} onPress={goToChats} activeOpacity={0.8}>
        <Ionicons name="chatbubble-ellipses" size={22} color={colors.primary} />
        {noLeidos > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{noLeidos > 9 ? '9+' : noLeidos}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  edge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: EDGE_WIDTH,
  },
  bubble: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 50,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface1,
  },
  badgeText: {
    color: colors.primaryFg,
    fontSize: 10,
    fontWeight: '800',
  },
});
