import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'rm_session';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
}

export interface Session {
  token: string;
  user: AuthUser;
}

type Listener = (session: Session | null) => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(session: Session | null) {
  for (const listener of listeners) listener(session);
}

export async function getSession(): Promise<Session | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export async function setSession(token: string, user: AuthUser): Promise<void> {
  const session: Session = { token, user };
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  notify(session);
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
  notify(null);
}
