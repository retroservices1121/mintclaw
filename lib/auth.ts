const MOLTBOOK_API = process.env.MOLTBOOK_API_URL || 'https://www.moltbook.com/api/v1';

// Simple in-memory cache for validation results
const validationCache = new Map<string, { data: MoltbookAgent; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface MoltbookAgent {
  id: string;
  name: string;
  [key: string]: unknown;
}

export async function validateMoltbookKey(apiKey: string): Promise<MoltbookAgent | null> {
  // Check cache first
  const cached = validationCache.get(apiKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const res = await fetch(`${MOLTBOOK_API}/agents/me`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      validationCache.delete(apiKey);
      return null;
    }

    const response = await res.json() as { success: boolean; agent: MoltbookAgent };
    if (!response.success || !response.agent) {
      return null;
    }
    const data = response.agent;

    // Cache the successful validation
    validationCache.set(apiKey, {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return data;
  } catch (error) {
    console.error('Moltbook validation error:', error);
    return null;
  }
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

export async function authenticateRequest(
  request: Request
): Promise<{ success: true; agent: MoltbookAgent } | { success: false; error: string }> {
  const authHeader = request.headers.get('Authorization');
  const token = extractBearerToken(authHeader);

  if (!token) {
    return { success: false, error: 'Missing or invalid Authorization header' };
  }

  const agent = await validateMoltbookKey(token);

  if (!agent) {
    return { success: false, error: 'Invalid Moltbook API key' };
  }

  return { success: true, agent };
}
