export type CommerceCategory =
  | 'ALL'
  | 'CLEANSERS'
  | 'SERUMS'
  | 'MOISTURIZERS'
  | 'SUN_CARE'
  | 'RITUAL_SETS';

export interface SkincareProductSpec {
  id: string;
  name: string;
  category: Exclude<CommerceCategory, 'ALL'>;
  subtitle: string;
  volumeLabel: string;
  priceFormatted: string;
  keyNotes: string[];
  suitability: string;
  ritualStep: 'Cleanse' | 'Treat' | 'Hydrate' | 'Protect';
}

export interface BagLineItem {
  product: SkincareProductSpec;
  quantity: number;
}

export interface OrderRecordPlaceholder {
  orderNumber: string;
  placedAt: string;
  status: 'Fulfilled' | 'In Transit' | 'Processing';
  totalFormatted: string;
  itemCount: number;
}

export interface RoutineStepSlot {
  timeOfDay: 'AM' | 'PM';
  stepNumber: number;
  stepTitle: string;
  guidance: string;
  linkedProduct?: SkincareProductSpec | null;
}
