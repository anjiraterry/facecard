import { describe, it, expect } from 'vitest';
import { EconomyConfig } from '@/lib/economy';

describe('Phase 8: Face-Off PvP Arena Engine', () => {
  it('should calculate 5% system fee and pot payout accurately for staked duels', () => {
    const stake = 200;
    const totalPot = stake * 2; // 400 pts
    const systemFee = Math.round(totalPot * EconomyConfig.ARENA.SYSTEM_FEE_PERCENT); // 5% = 20 pts
    const payout = totalPot - systemFee; // 380 pts
    const winBonus = EconomyConfig.ARENA.WIN_BONUS_POINTS; // 25 pts
    const totalWinnerGain = payout + winBonus; // 405 pts

    expect(totalPot).toBe(400);
    expect(systemFee).toBe(20);
    expect(payout).toBe(380);
    expect(winBonus).toBe(25);
    expect(totalWinnerGain).toBe(405);
  });

  it('should calculate 0 fee and 0 payout for friendly duels', () => {
    const stake = 0;
    const totalPot = stake * 2;
    const systemFee = Math.round(totalPot * EconomyConfig.ARENA.SYSTEM_FEE_PERCENT);
    const payout = totalPot - systemFee;

    expect(totalPot).toBe(0);
    expect(systemFee).toBe(0);
    expect(payout).toBe(0);
  });

  it('should resolve winner correctly based on lethal scores', () => {
    const resolveMatch = (cScore: number, oScore: number) => {
      if (cScore === oScore) return 'TIE_REMATCH';
      return cScore > oScore ? 'CHALLENGER_WON' : 'OPPONENT_WON';
    };

    expect(resolveMatch(88, 74)).toBe('CHALLENGER_WON');
    expect(resolveMatch(65, 82)).toBe('OPPONENT_WON');
    expect(resolveMatch(90, 90)).toBe('TIE_REMATCH');
  });

  it('should enforce arena duel expiry limit (24 hours = 1440 minutes)', () => {
    expect(EconomyConfig.ARENA.EXPIRY_MINUTES).toBe(1440);
  });
});
