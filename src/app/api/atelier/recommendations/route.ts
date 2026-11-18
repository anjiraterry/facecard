import { getSessionUser } from '@/lib/auth/session';
import { generateSkinRecommendations } from '@/lib/atelier/recommendations';
import { jsonResponse } from '@/lib/atelier/serialize';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const result = await generateSkinRecommendations(user.id);
    return jsonResponse({ success: true, ...result });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to load recommendations', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
