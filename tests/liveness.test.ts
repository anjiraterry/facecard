import { describe, it, expect } from 'vitest';
import { 
  generateRandomLivenessSequence, 
  LIVENESS_ACTIONS, 
  evaluateLivenessFrame 
} from '../src/lib/vision/liveness';

describe('Active Liveness Detection Engine', () => {
  it('generates a randomized sequence of 2 distinct challenges by default', () => {
    const sequence = generateRandomLivenessSequence(2);
    expect(sequence).toHaveLength(2);
    expect(sequence[0].type).not.toBe(sequence[1].type);
    expect(['TURN_LEFT', 'TURN_RIGHT', 'BLINK', 'NOD_UP', 'SMILE']).toContain(sequence[0].type);
    expect(['TURN_LEFT', 'TURN_RIGHT', 'BLINK', 'NOD_UP', 'SMILE']).toContain(sequence[1].type);
  });

  it('provides complete UX cues and guidance for all vendor standard actions', () => {
    const actions = Object.values(LIVENESS_ACTIONS);
    expect(actions.length).toBeGreaterThanOrEqual(5);

    for (const action of actions) {
      expect(action.prompt).toBeTruthy();
      expect(action.subPrompt).toBeTruthy();
      expect(action.cueIcon).toBeTruthy();
    }
  });

  it('correctly evaluates blendshape-based eye blinks', () => {
    // Mock MediaPipe result with blendshapes
    const mockLandmarker = {
      detectForVideo: () => ({
        faceLandmarks: [
          [{ x: 0.5, y: 0.5, z: 0 }],
        ],
        faceBlendshapes: [
          {
            categories: [
              { categoryName: 'eyeBlinkLeft', score: 0.65 },
              { categoryName: 'eyeBlinkRight', score: 0.70 },
            ],
          },
        ],
      }),
    };

    const mockVideo = { readyState: 4 } as unknown as HTMLVideoElement;
    const result = evaluateLivenessFrame('BLINK', mockVideo, mockLandmarker);

    expect(result.detected).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('correctly detects left head rotation via yaw displacement', () => {
    const mockLandmarker = {
      detectForVideo: () => ({
        faceLandmarks: [
          // 468 landmark array where nose tip (index 1) is displaced to the left (< 0.40)
          Array.from({ length: 470 }, (_, i) => ({
            x: i === 1 ? 0.32 : 0.5,
            y: 0.5,
            z: 0,
          })),
        ],
        faceBlendshapes: [],
      }),
    };

    const mockVideo = { readyState: 4 } as unknown as HTMLVideoElement;
    const result = evaluateLivenessFrame('TURN_LEFT', mockVideo, mockLandmarker);

    expect(result.detected).toBe(true);
  });

  it('correctly detects right head rotation via yaw displacement', () => {
    const mockLandmarker = {
      detectForVideo: () => ({
        faceLandmarks: [
          Array.from({ length: 470 }, (_, i) => ({
            x: i === 1 ? 0.68 : 0.5,
            y: 0.5,
            z: 0,
          })),
        ],
        faceBlendshapes: [],
      }),
    };

    const mockVideo = { readyState: 4 } as unknown as HTMLVideoElement;
    const result = evaluateLivenessFrame('TURN_RIGHT', mockVideo, mockLandmarker);

    expect(result.detected).toBe(true);
  });
});
