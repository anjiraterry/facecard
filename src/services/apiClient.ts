/**
 * Base API Client with error handling, session propagation, and Idempotency-Key support.
 * Complies with BACKEND.md § 3 & FRONTEND.md § 5.
 */

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Propagate user ID from local storage if available
  if (typeof window !== 'undefined') {
    const storedUserId = localStorage.getItem('fc_user_id');
    if (storedUserId && !headers['x-user-id']) {
      headers['x-user-id'] = storedUserId;
    }
  }

  // Mutating routes attach an Idempotency-Key if not provided
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || '')) {
    if (!headers['Idempotency-Key']) {
      headers['Idempotency-Key'] = `fc-req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
  }

  const response = await fetch(endpoint, {
    ...options,
    credentials: 'include',
    headers,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = json.error || json.message || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return json as T;
}
