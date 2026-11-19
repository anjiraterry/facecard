export type FaceOffSessionState =
  | 'CREATED'
  | 'MATCHMAKING'
  | 'WAITING_FOR_PARTICIPANTS'
  | 'CONNECTING'
  | 'CALIBRATING'
  | 'READY'
  | 'COUNTDOWN'
  | 'ACTIVE'
  | 'PAUSED'
  | 'RECONNECTING'
  | 'RESOLVING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'INVALIDATED';

export type FaceOffIntegrityClass = 'UNVERIFIED' | 'CONSISTENT' | 'SUSPICIOUS' | 'INVALIDATED';

export interface WebRtcMediaProfile {
  dataSavingMode: boolean;
  width: number;
  height: number;
  frameRate: number;
  maxBitrateKbps: number;
  inferenceFps: number;
}

export function getWebRtcMediaProfile(dataSavingMode: boolean, constrainedDevice = false): WebRtcMediaProfile {
  if (dataSavingMode || constrainedDevice) {
    return {
      dataSavingMode: true,
      width: 480,
      height: 640,
      frameRate: 15,
      maxBitrateKbps: 280,
      inferenceFps: 2,
    };
  }
  return {
    dataSavingMode: false,
    width: 720,
    height: 960,
    frameRate: 24,
    maxBitrateKbps: 650,
    inferenceFps: 4,
  };
}

export function buildIceServers(options?: {
  turnUrl?: string;
  turnUsername?: string;
  turnCredential?: string;
  turnQuotaExhausted?: boolean;
}): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // Never silently incur uncapped relay charges when TURN quota is exhausted
  if (
    !options?.turnQuotaExhausted &&
    options?.turnUrl &&
    options?.turnUsername &&
    options?.turnCredential
  ) {
    servers.push({
      urls: options.turnUrl,
      username: options.turnUsername,
      credential: options.turnCredential,
    });
  }

  return servers;
}

/**
 * Evaluates live Face-Off score telemetry for impossible jumps or replay anomalies.
 * Browser-submitted data is never treated as cryptographic proof of authenticity.
 */
export function evaluateFaceOffIntegrity(samples: Array<{ timestampMs: number; score: number }>): {
  classification: FaceOffIntegrityClass;
  reasons: string[];
} {
  if (samples.length < 2) {
    return { classification: 'UNVERIFIED', reasons: ['Insufficient telemetry samples'] };
  }

  const reasons: string[] = [];
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const curr = samples[i];
    if (curr.timestampMs <= prev.timestampMs) {
      reasons.push('Non-monotonic timestamp detected');
      return { classification: 'INVALIDATED', reasons };
    }
    if (Math.abs(curr.score - prev.score) > 35 && curr.timestampMs - prev.timestampMs < 2000) {
      reasons.push('Sudden score spike >35 points within 2 seconds');
    }
  }

  if (reasons.length > 0) {
    return { classification: 'SUSPICIOUS', reasons };
  }
  return { classification: 'CONSISTENT', reasons: [] };
}
