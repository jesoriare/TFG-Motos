import { ActivityIndicator } from 'react-native';
import { colors } from '@/constants/theme';

export function Spinner({ size = 'small', color }: { size?: 'small' | 'large'; color?: string }) {
  return <ActivityIndicator size={size} color={color ?? colors.primary} />;
}
