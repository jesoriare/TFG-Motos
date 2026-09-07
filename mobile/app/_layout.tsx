import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getSession, subscribe } from '@/lib/auth';
import { colors } from '@/constants/theme';
import { registerForPushNotificationsAsync } from '@/lib/notifications';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getSession().then((session) => {
      setReady(true);
      if (session) registerForPushNotificationsAsync(session.token);
    });

    const unsubscribe = subscribe((session) => {
      if (session) registerForPushNotificationsAsync(session.token);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const conversacionId = response.notification.request.content.data?.conversacionId;
      if (conversacionId) router.push(`/chats/${conversacionId}` as any);
    });
    return () => sub.remove();
  }, [router]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="entrar" />
        <Stack.Screen name="registro" />
        <Stack.Screen name="perfil/[username]" />
        <Stack.Screen name="perfil/editar" />
        <Stack.Screen name="solicitudes" />
        <Stack.Screen name="amigos/[username]" />
        <Stack.Screen name="grupos/index" />
        <Stack.Screen name="grupos/crear" />
        <Stack.Screen name="grupos/[id]" />
        <Stack.Screen name="chats/index" />
        <Stack.Screen name="chats/[id]" />
      </Stack>
    </GestureHandlerRootView>
  );
}
