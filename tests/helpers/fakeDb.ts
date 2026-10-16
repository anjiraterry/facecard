/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'node:crypto';

type Row = Record<string, any>;

function matches(row: Row, where: Row = {}): boolean {
  if (where.OR && Array.isArray(where.OR)) {
    const orMatches = where.OR.some((subWhere: Row) => matches(row, subWhere));
    if (!orMatches) return false;
  }

  return Object.entries(where).every(([key, cond]) => {
    if (key === 'OR') return true;
    const value = row[key];
    if (cond === null) return value == null;
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('in' in cond && Array.isArray(cond.in)) {
        return cond.in.includes(value);
      }
      if ('equals' in cond) {
        if (cond.mode === 'insensitive' && typeof value === 'string' && typeof cond.equals === 'string') {
          return value.toLowerCase() === cond.equals.toLowerCase();
        }
        return value === cond.equals;
      }
      if ('gt' in cond && !(value > cond.gt)) return false;
      if ('gte' in cond && !(value >= cond.gte)) return false;
      if ('lt' in cond && !(value < cond.lt)) return false;
      if ('lte' in cond && !(value <= cond.lte)) return false;
      return true;
    }
    return value === cond;
  });
}

function applyData(row: Row, data: Row) {
  for (const [key, val] of Object.entries(data)) {
    if (val && typeof val === 'object' && !(val instanceof Date) && 'increment' in val) {
      row[key] = (row[key] ?? 0) + val.increment;
    } else if (val && typeof val === 'object' && !(val instanceof Date) && 'decrement' in val) {
      row[key] = (row[key] ?? 0) - val.decrement;
    } else {
      row[key] = val;
    }
  }
}

function createTable(defaults: () => Row = () => ({})) {
  const rows: Row[] = [];
  return {
    rows,
    async create({ data }: { data: Row }) {
      const row = { id: randomUUID(), createdAt: new Date(), ...defaults(), ...data };
      rows.push(row);
      return { ...row };
    },
    async findFirst({ where, orderBy }: { where?: Row; orderBy?: Row } = {}) {
      let found = rows.filter((r) => matches(r, where));
      if (orderBy?.createdAt === 'desc') found = [...found].sort((a, b) => +b.createdAt - +a.createdAt);
      return found[0] ? { ...found[0] } : null;
    },
    async findUnique({ where, select }: { where: Row; select?: Row }) {
      const row = rows.find((r) => matches(r, where));
      if (!row) return null;
      if (select) {
        const picked: Row = {};
        for (const k of Object.keys(select)) picked[k] = row[k];
        return picked;
      }
      return { ...row };
    },
    async findMany({ where, select }: { where?: Row; select?: Row } = {}) {
      const found = where ? rows.filter((r) => matches(r, where)) : [...rows];
      return found.map((r) => {
        if (select) {
          const picked: Row = {};
          for (const k of Object.keys(select)) picked[k] = r[k];
          return picked;
        }
        return { ...r };
      });
    },
    async count({ where }: { where?: Row } = {}) {
      return rows.filter((r) => matches(r, where)).length;
    },
    async updateMany({ where, data }: { where?: Row; data: Row }) {
      const found = rows.filter((r) => matches(r, where));
      found.forEach((r) => applyData(r, data));
      return { count: found.length };
    },
    async update({ where, data, select }: { where: Row; data: Row; select?: Row }) {
      const row = rows.find((r) => matches(r, where));
      if (!row) throw new Error('Record not found');
      applyData(row, data);
      if (select) {
        const picked: Row = {};
        for (const k of Object.keys(select)) picked[k] = row[k];
        return picked;
      }
      return { ...row };
    },
    async delete({ where }: { where: Row }) {
      const idx = rows.findIndex((r) => matches(r, where));
      if (idx === -1) throw new Error('Record not found');
      return rows.splice(idx, 1)[0];
    },
  };
}

/** In-memory stand-in for Prisma client in unit tests */
export function createFakeDb() {
  const user = createTable(() => ({
    status: 'ACTIVE',
    lifetimePoints: 0,
    spendableBalance: 0,
    tier: 'CLASSIC',
  }));
  const otpChallenge = createTable(() => ({ attempts: 0, consumedAt: null }));
  const authAttempt = createTable();
  const authSessionTable = createTable(() => ({
    lastUsedAt: new Date(),
    revokedAt: null,
  }));

  const pointsLedgerTable = createTable();
  const pointsLedger = {
    ...pointsLedgerTable,
    async create({ data }: { data: Row }) {
      // Unique constraint on (idempotencyKey, balanceKind)
      const existing = pointsLedgerTable.rows.find(
        (r) => r.idempotencyKey === data.idempotencyKey && r.balanceKind === data.balanceKind
      );
      if (existing) {
        const err = new Error('Unique constraint failed on the fields: (`idempotencyKey`,`balanceKind`)');
        (err as any).code = 'P2002';
        throw err;
      }
      return pointsLedgerTable.create({ data });
    },
    async aggregate({ where, _sum }: { where?: Row; _sum?: { amount?: boolean } }) {
      const found = where ? pointsLedgerTable.rows.filter((r) => matches(r, where)) : pointsLedgerTable.rows;
      const sum = _sum?.amount ? found.reduce((acc, r) => acc + (r.amount || 0), 0) : 0;
      return { _sum: { amount: sum } };
    },
    async groupBy({ by }: { by: string[]; _sum?: { amount?: boolean } }) {
      const groups = new Map<string, number>();
      for (const row of pointsLedgerTable.rows) {
        const groupKey = by.map((k) => row[k]).join(':');
        const current = groups.get(groupKey) || 0;
        groups.set(groupKey, current + (row.amount || 0));
      }
      const result: Row[] = [];
      for (const [key, amount] of groups.entries()) {
        const parts = key.split(':');
        const entry: Row = { _sum: { amount } };
        by.forEach((k, idx) => {
          entry[k] = parts[idx];
        });
        result.push(entry);
      }
      return result;
    },
  };

  const authSession = {
    ...authSessionTable,
    async findUnique({ where, include }: { where: Row; include?: Row }) {
      const row = await authSessionTable.findUnique({ where });
      if (!row) return null;
      return include?.user ? { ...row, user: await user.findUnique({ where: { id: row.userId } }) } : row;
    },
  };

  const faceOffTable = createTable(() => ({
    mode: 'STAKED',
    status: 'WAITING',
    rematchCount: 0,
    feeAmount: 0,
    stake: 0,
  }));
  const faceOff = {
    ...faceOffTable,
    async findUnique({ where, include }: { where: Row; include?: Row }) {
      const row = await faceOffTable.findUnique({ where });
      if (!row) return null;
      const res = { ...row };
      if (include?.challenger) {
        res.challenger = await user.findUnique({ where: { id: row.challengerId } });
      }
      if (include?.opponent && row.opponentId) {
        res.opponent = await user.findUnique({ where: { id: row.opponentId } });
      }
      if (include?.challengerBestScan && row.challengerBestScanId) {
        res.challengerBestScan = await scan.findUnique({ where: { id: row.challengerBestScanId } });
      }
      if (include?.opponentBestScan && row.opponentBestScanId) {
        res.opponentBestScan = await scan.findUnique({ where: { id: row.opponentBestScanId } });
      }
      return res;
    },
    async findMany({ where, include, select }: { where?: Row; include?: Row; select?: Row } = {}) {
      const rows = await faceOffTable.findMany({ where, select });
      if (!include) return rows;
      const results = [];
      for (const row of rows) {
        const res = { ...row };
        if (include?.challenger) {
          res.challenger = await user.findUnique({ where: { id: row.challengerId } });
        }
        if (include?.opponent && row.opponentId) {
          res.opponent = await user.findUnique({ where: { id: row.opponentId } });
        }
        if (include?.challengerBestScan && row.challengerBestScanId) {
          res.challengerBestScan = await scan.findUnique({ where: { id: row.challengerBestScanId } });
        }
        if (include?.opponentBestScan && row.opponentBestScanId) {
          res.opponentBestScan = await scan.findUnique({ where: { id: row.opponentBestScanId } });
        }
        results.push(res);
      }
      return results;
    },
  };

  const faceOffAttempt = createTable();
  const scan = createTable();
  const scanSlot = createTable();
  const shopItem = createTable(() => ({ active: true, maxOwned: 1 }));
  const userItem = createTable(() => ({ quantity: 1 }));
  const purchase = createTable();

  const fakeClient: any = {
    user,
    otpChallenge,
    authAttempt,
    authSession,
    pointsLedger,
    faceOff,
    faceOffAttempt,
    scan,
    scanSlot,
    shopItem,
    userItem,
    purchase,
    async $transaction(input: any) {
      if (typeof input === 'function') {
        return input(fakeClient);
      }
      if (Array.isArray(input)) {
        return Promise.all(input);
      }
      return input;
    },
  };

  return fakeClient;
}
