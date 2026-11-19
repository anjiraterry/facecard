export type CapabilityId =
  | 'FACE_LANDMARKS'
  | 'IMAGE_QUALITY'
  | 'LIVE_FACE_ANALYSIS'
  | 'BASIC_FACE_INSIGHTS'
  | 'SKINCARE_KNOWLEDGE'
  | 'PRODUCT_BREAKDOWN'
  | 'ADVANCED_REPORT'
  | 'ROUTINE_EXPLANATION'
  | 'CONVERSATIONAL_ASSISTANCE'
  | 'TRUSTED_SCAN_VERIFICATION';

export type ExecutionMode =
  | 'LOCAL_DETERMINISTIC'
  | 'LOCAL_ML'
  | 'KNOWLEDGE_BASE'
  | 'EXTERNAL_ASSISTANT'
  | 'CLOUD_LLM'
  | 'DISABLED';

export interface IntelligenceResult<T = unknown> {
  capability: CapabilityId;
  provider: string;
  modelVersion: string;
  executionMode: ExecutionMode;
  requestId: string;
  durationMs: number;
  estimatedCostUsd: number;
  data: T;
  error?: string;
}

export interface IntelligenceProvider {
  providerId: string;
  executionMode: ExecutionMode;
  modelVersion: string;
  getCapabilities(): CapabilityId[];
  isAvailable(): boolean;
  estimateCost(capability: CapabilityId): number;
  getHealth(): { healthy: boolean; reason?: string };
  execute<T = unknown>(capability: CapabilityId, payload: unknown): Promise<T>;
}

/**
 * Provider-independent Intelligence Gateway.
 * Enforces zero-cost defaults: Cloud LLM providers remain disabled unless
 * ENABLE_CLOUD_AI === 'true', user consent is granted, and budget is available.
 * Never automatically falls back from local inference to paid cloud inference.
 */
export class IntelligenceGateway {
  private providers = new Map<string, IntelligenceProvider>();
  private circuitFailures = new Map<string, number>();

  register(provider: IntelligenceProvider) {
    this.providers.set(provider.providerId, provider);
  }

  listProviders() {
    return Array.from(this.providers.values()).map((p) => ({
      providerId: p.providerId,
      executionMode: p.executionMode,
      modelVersion: p.modelVersion,
      capabilities: p.getCapabilities(),
      available: p.isAvailable(),
      health: p.getHealth(),
    }));
  }

  async execute<T = unknown>(options: {
    capability: CapabilityId;
    payload: unknown;
    requestId: string;
    userConsent?: boolean;
    allowCloud?: boolean;
    maxCostUsd?: number;
  }): Promise<IntelligenceResult<T>> {
    const start = Date.now();
    const cloudFlag = process.env.ENABLE_CLOUD_AI === 'true';

    // Prefer zero-cost local / knowledge / external providers first
    const candidates = Array.from(this.providers.values()).filter((p) => {
      if (!p.getCapabilities().includes(options.capability)) return false;
      if (!p.isAvailable() || !p.getHealth().healthy) return false;
      if ((this.circuitFailures.get(p.providerId) ?? 0) >= 3) return false;

      if (p.executionMode === 'CLOUD_LLM') {
        if (!cloudFlag || !options.allowCloud || !options.userConsent) return false;
        const cost = p.estimateCost(options.capability);
        if (typeof options.maxCostUsd === 'number' && cost > options.maxCostUsd) return false;
      }
      return true;
    });

    // Sort so zero-cost modes always precede CLOUD_LLM
    candidates.sort((a, b) => a.estimateCost(options.capability) - b.estimateCost(options.capability));

    const chosen = candidates[0];
    if (!chosen) {
      throw new Error(`No enabled provider available for capability ${options.capability}`);
    }

    try {
      const data = await chosen.execute<T>(options.capability, options.payload);
      this.circuitFailures.set(chosen.providerId, 0);
      return {
        capability: options.capability,
        provider: chosen.providerId,
        modelVersion: chosen.modelVersion,
        executionMode: chosen.executionMode,
        requestId: options.requestId,
        durationMs: Date.now() - start,
        estimatedCostUsd: chosen.estimateCost(options.capability),
        data,
      };
    } catch (err) {
      this.circuitFailures.set(chosen.providerId, (this.circuitFailures.get(chosen.providerId) ?? 0) + 1);
      throw err;
    }
  }
}

export const defaultIntelligenceGateway = new IntelligenceGateway();

defaultIntelligenceGateway.register({
  providerId: 'local-deterministic-engine',
  executionMode: 'LOCAL_DETERMINISTIC',
  modelVersion: 'v1.2-local',
  getCapabilities: () => ['IMAGE_QUALITY', 'BASIC_FACE_INSIGHTS'],
  isAvailable: () => true,
  estimateCost: () => 0,
  getHealth: () => ({ healthy: true }),
  async execute<T>(_cap: CapabilityId, payload: unknown): Promise<T> {
    return payload as T;
  },
});

defaultIntelligenceGateway.register({
  providerId: 'local-knowledge-base',
  executionMode: 'KNOWLEDGE_BASE',
  modelVersion: 'kb-v1.0',
  getCapabilities: () => ['SKINCARE_KNOWLEDGE', 'ROUTINE_EXPLANATION'],
  isAvailable: () => true,
  estimateCost: () => 0,
  getHealth: () => ({ healthy: true }),
  async execute<T>(_cap: CapabilityId, payload: unknown): Promise<T> {
    return payload as T;
  },
});
