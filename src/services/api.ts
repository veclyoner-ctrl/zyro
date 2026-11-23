const USER_STORAGE_KEY = 'zyro_mall_user';

export function getStoredUserId(): string | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string };
    return parsed?.id ?? null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: unknown | null): void {
  try {
    if (!user) {
      localStorage.removeItem(USER_STORAGE_KEY);
    } else {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
  } catch {
    // ignore storage quota errors
  }
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const userId = getStoredUserId();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (userId) {
    headers.set('x-user-id', userId);
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }
    throw new Error(
      'Received non-JSON response from server. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured.'
    );
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      (data as { error?: string } | null)?.error || `Request failed (${res.status})`
    );
  }
  if (data === null) {
    throw new Error('Empty JSON response from server.');
  }
  return data as T;
}
