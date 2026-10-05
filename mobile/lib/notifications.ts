import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { guardarPushToken } from './api';

// Expo Go en Android no soporta push remotas desde el SDK 53 y lanza un error con solo importar
// expo-notifications, así que ahí no se carga el módulo (en un build real sí)
const pushDisponible = !(
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient
);

const Notifications: typeof import('expo-notifications') | null = pushDisponible
  ? require('expo-notifications')
  : null;

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(token: string) {
  if (!Notifications || !Device.isDevice) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;

  try {
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    await guardarPushToken(pushToken, token);
  } catch {
    // entorno sin EAS configurado: no registramos push, el resto de RF-14 funciona igual
  }
}

// Avisa cuando el usuario toca una notificación de chat; devuelve la función para dejar de escuchar
export function onNotificacionChatPulsada(callback: (conversacionId: string) => void) {
  if (!Notifications) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const conversacionId = response.notification.request.content.data?.conversacionId;
    if (conversacionId) callback(String(conversacionId));
  });
  return () => sub.remove();
}
