import { getSessionUser } from '@/lib/auth/session';
import { generateSkinRecommendations } from '@/lib/atelier/recommendations';
import { jsonResponse } from '@/lib/atelier/serialize';

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const result = await generateSkinRecommendations(user.id);
    if (!result.hasProfile) {
      return jsonResponse({ error: 'Complete your skin profile before generating recommendations.' }, 400);
    }
    return jsonResponse({ success: true, ...result });
  } catch (error) {
    return jsonResponse(
      { error: 'Failed to generate recommendations', message: error instanceof Error ? error.message : 'Error' },
      500
    );
  }
}
