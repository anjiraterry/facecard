-- Phase 2: points integrity guards.

-- Balances can never go negative. NOT VALID enforces the rule for all new writes
-- without failing on any pre-existing drifted rows (run VALIDATE CONSTRAINT after cleanup).
ALTER TABLE "User" ADD CONSTRAINT "User_spendableBalance_nonneg" CHECK ("spendableBalance" >= 0) NOT VALID;
ALTER TABLE "User" ADD CONSTRAINT "User_lifetimePoints_nonneg" CHECK ("lifetimePoints" >= 0) NOT VALID;

-- The ledger is append-only: reject any UPDATE or DELETE of an existing row.
CREATE OR REPLACE FUNCTION forbid_points_ledger_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'PointsLedger is append-only (% blocked)', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PointsLedger_append_only"
BEFORE UPDATE OR DELETE ON "PointsLedger"
FOR EACH ROW EXECUTE FUNCTION forbid_points_ledger_mutation();
