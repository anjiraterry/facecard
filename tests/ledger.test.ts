import { describe, it, expect } from 'vitest';
import {
  calculateScanPoints,
  getStreakMultiplier,
  getTierFromLifetimePoints,
  getLagosDayKey,
  getYesterdayLagosDayKey,
} from '@/lib/scoring';
import { EconomyConfig } from '@/lib/economy';

describe('Phase 5: Core Scan Flow, Points Ledger & Streaks', () => {
  it('should compute day keys correctly in Africa/Lagos (WAT, UTC+1)', () => {
    const today = getLagosDayKey();
    const yesterday = getYesterdayLagosDayKey();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(yesterday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(today).not.toBe(yesterday);
  });

  it('should enforce the daily scan point economy (Scan 1 = 100%, Scans 2 & 3 = 50%)', () => {
    const score = 80;
    // Scan 1: 80 * 1.0 = 80 base points
    const scan1Points = calculateScanPoints(score, 1, 1);
    expect(scan1Points).toBe(80);

    // Scan 2: 50% = 40 points
    const scan2Points = calculateScanPoints(score, 2, 1);
    expect(scan2Points).toBe(40);

    // Scan 3: 50% = 40 points
    const scan3Points = calculateScanPoints(score, 3, 1);
    expect(scan3Points).toBe(40);
  });

  it('should apply the exact streak multiplier ladder', () => {
    // Days 1-2: 1.0x
    expect(getStreakMultiplier(1)).toBe(1.0);
    expect(getStreakMultiplier(2)).toBe(1.0);

    // Days 3-6: 1.1x
    expect(getStreakMultiplier(3)).toBe(1.1);
    expect(getStreakMultiplier(6)).toBe(1.1);

    // Days 7-13: 1.25x
    expect(getStreakMultiplier(7)).toBe(1.25);
    expect(getStreakMultiplier(13)).toBe(1.25);

    // Days 14-29: 1.5x
    expect(getStreakMultiplier(14)).toBe(1.5);
    expect(getStreakMultiplier(29)).toBe(1.5);

    // Days 30+: 2.0x (max cap)
    expect(getStreakMultiplier(30)).toBe(2.0);
    expect(getStreakMultiplier(100)).toBe(2.0);
  });

  it('should promote user through tiers at exact threshold boundaries', () => {
    expect(getTierFromLifetimePoints(0)).toBe('CLASSIC');
    expect(getTierFromLifetimePoints(999)).toBe('CLASSIC');
    expect(getTierFromLifetimePoints(1000)).toBe('GOLD');
    expect(getTierFromLifetimePoints(4999)).toBe('GOLD');
    expect(getTierFromLifetimePoints(5000)).toBe('PLATINUM');
    expect(getTierFromLifetimePoints(19999)).toBe('PLATINUM');
    expect(getTierFromLifetimePoints(20000)).toBe('BLACK');
    expect(getTierFromLifetimePoints(100000)).toBe('BLACK');
  });

  it('should combine score, scan index, and streak multiplier in calculation', () => {
    const score = 90; // Base: 90 pts
    const streakDays = 7; // Multiplier: 1.25x
    const points = calculateScanPoints(score, 1, streakDays);
    expect(points).toBe(Math.round(90 * 1.25)); // 113 pts
  });
});
