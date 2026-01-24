// backend/src/routes/financials.ts
import { Router } from 'express';
// Import the pool for transactions
import { db as pool } from '../database/postgres';
import dbAdapter from '../services/databaseAdapter';
import type { UserCharacter } from '../types';
import { normalizeFinancials } from '../lib/financials';

// Helper: Calculate monthly payment in dollars
function pmtDollars(amount: number, apr_bps: number, term_months: number): number {
  const r = (apr_bps / 10000) / 12; // APR bps -> monthly rate
  if (r === 0) return Math.ceil(amount / term_months);
  const denom = 1 - Math.pow(1 + r, -term_months);
  return Math.ceil((amount * r) / denom);
}

const r = Router();

/** One-time, idempotent schema ensure — creates migration_meta table only.
 *  NOTE: financial_decisions table is now created by migration 293.
 */
const schema_ready = (async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Extensions (safe to NOOP if lacking perms or already installed)
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    // Meta table (used for tracking wallet unit, etc.)
    await client.query(`
      CREATE TABLE IF NOT EXISTS migration_meta (
        key TEXT PRIMARY KEY,
        value TEXT,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Record unit once (idempotent)
    await client.query(`
      INSERT INTO migration_meta(key, value)
      VALUES ('wallet_unit','dollars')
      ON CONFLICT (key) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('[financials] Schema ensure completed successfully');
  } catch (e) {
    await client.query('ROLLBACK');
    console.warn('[financials] schema ensure failed (continuing):', e);
  } finally {
    client.release();
  }
})();

// Middleware to wait for schema ensure before handling requests
r.use(async (_req, _res, next) => {
  await schema_ready.catch(() => { }); // continue even if ensure failed; handlers still have guards
  next();
});

// GET current financials (dollars)
r.get('/characters/:id/financials', async (req, res) => {
  const { id } = req.params;

  try {
    // TODO: authz — ensure this user owns `id` (e.g., WHERE id=$1 AND user_id=$2)
    const character = await dbAdapter.user_characters.find_by_id(id);
    if (!character) return res.status(404).json({ error: 'not_found' });

    // Normalize financial fields with type-safe fallbacks
    const { wallet, debt, monthly_earnings } =
      normalizeFinancials(character as Partial<UserCharacter>);

    res.json({
      ok: true,
      financials: {
        wallet,
        debt,
        monthly_earnings,
      }
    });
  } catch (error) {
    console.error('Error fetching financials:', error);
    res.status(500).json({ error: 'server_error' });
  }
});

// POST commit a purchase (cash or debt)
r.post('/characters/:id/decisions/commit', async (req, res) => {
  const { id } = req.params;
  const {
    amount,
    payment_method,
    apr_bps = null,
    term_months = null,
    description = null,
    client_decision_id = null
  } = req.body || {};

  if (!Number.isFinite(amount) || amount <= 0)
    return res.status(400).json({ error: 'invalid amount' });
  if (!['cash', 'debt'].includes(payment_method))
    return res.status(400).json({ error: 'invalid_payment_method' });

  // TODO: authz — verify the caller owns this character

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT wallet, debt, monthly_earnings
         FROM user_characters
        WHERE id = $1
        FOR UPDATE`,
      [id]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'not_found' });
    }

    const cur = rows[0];

    // Cash payment validation
    if (payment_method === 'cash') {
      if (cur.wallet < amount) {
        await client.query('ROLLBACK');
        console.log('❌ [DECISION] Cash payment denied - insufficient funds');
        return res.status(400).json({
          error: 'insufficient_funds',
          message: 'Insufficient funds for cash payment',
          required: amount,
          available: cur.wallet
        });
      }
    }

    // Affordability guard for debt: comprehensive loan qualification
    if (payment_method === 'debt') {
      const apr = Number.isFinite(apr_bps) ? Number(apr_bps) : 1299;      // 12.99% APR default
      const term = Number.isFinite(term_months) ? Number(term_months) : 24; // 24 months default
      const monthly_payment = pmtDollars(amount, apr, term);
      const income = cur.monthly_earnings ?? 0;

      console.log('💰 [DECISION] Loan qualification:', {
        amount,
        monthly_payment,
        income,
        apr,
        term
      });

      // Detect payday loans: $1000 or less, 2 months or less
      const is_payday_loan = amount <= 1000 && term <= 2;

      if (is_payday_loan) {
        // Payday loans: More lenient - just need reasonable amount
        console.log('💰 [DECISION] Payday loan detected - using lenient qualification');
        if (amount > 2000) {
          await client.query('ROLLBACK');
          console.log('❌ [DECISION] Payday loan denied - amount too high');
          return res.status(400).json({
            error: 'unaffordable',
            message: 'Payday loan amount exceeds maximum allowed ($2,000)',
            requested_amount: amount,
            maximum_payday_amount: 2000
          });
        }
        // Allow payday loans for characters expecting income (battle payouts)
        console.log('✅ [DECISION] Payday loan approved - emergency financing');
      } else {
        // Traditional loans: Strict 3x income requirement
        if (income < monthly_payment * 3) {
          await client.query('ROLLBACK');
          console.log('❌ [DECISION] Traditional loan denied - insufficient income');
          return res.status(400).json({
            error: 'unaffordable',
            message: 'Insufficient income for loan qualification',
            monthly_payment_required: monthly_payment,
            monthly_income_required: monthly_payment * 3,
            current_monthly_income: income
          });
        }
      }

      // Debt-to-income ratio check (max 40%) - skip for payday loans with no current income
      if (!is_payday_loan && income > 0) {
        const debt_to_income_ratio = monthly_payment / income;

        if (debt_to_income_ratio > 0.4) {
          await client.query('ROLLBACK');
          console.log('❌ [DECISION] Loan denied - debt-to-income ratio too high');
          return res.status(400).json({
            error: 'unaffordable',
            message: 'Debt-to-income ratio exceeds maximum allowed (40%)',
            debt_to_income_ratio: (debt_to_income_ratio * 100).toFixed(1) + '%',
            monthly_payment,
            monthly_income: income
          });
        }
      }
    }

    // Compute deltas
    let wallet_delta = 0;
    let debt_delta = 0;

    if (payment_method === 'cash') {
      wallet_delta = -amount;
      if (cur.wallet + wallet_delta < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'insufficient_funds' });
      }
    } else {
      debt_delta = amount;
    }

    const new_wallet = cur.wallet + wallet_delta;
    const new_debt = cur.debt + debt_delta;

    await client.query(
      `UPDATE user_characters
          SET wallet = $2,
              debt = $3
        WHERE id = $1`,
      [id, new_wallet, new_debt]
    );

    // Insert ledger row (JSON stringified for safety across drivers)
    await client.query(
      `INSERT INTO financial_decisions
         (user_character_id, decision_type, amount, payment_method,
          wallet_change, debt_change, description, metadata)
       VALUES ($1, 'purchase', $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        id, amount, payment_method, wallet_delta, debt_delta,
        description,
        JSON.stringify({ apr_bps, term_months, client_decision_id })
      ]
    );

    await client.query('COMMIT');

    // NEW: Track bond based on financial decision outcome
    try {
      const { recordBondActivity } = await import('../services/bondTrackingService');

      // Determine outcome quality
      const outcome = payment_method === 'cash' ?
        (cur.wallet >= amount * 2 ? 'success' : 'tight') :  // Had plenty of cash or cutting it close
        'debt_taken';  // Had to take debt

      // Smart spending (cash with buffer) or resolving crisis = positive bond
      const activity_type = (payment_method === 'cash' && cur.wallet >= amount * 2) ?
        'financial_win_followed_advice' :  // Good financial decision
        null;  // Neutral - don't track routine purchases or debt

      if (activity_type) {
        await recordBondActivity({
          user_character_id: id,
          activity_type: activity_type as any,
          context: {
            payment_method: payment_method,
            amount: amount,
            outcome: outcome,
            had_buffer: cur.wallet >= amount * 2
          },
          source: 'financial'
        });
        console.log(`🔗 [FINANCIAL-BOND] Smart purchase - bond increased`);
      }
    } catch (bond_error) {
      // Don't fail transaction if bond tracking fails
      console.error('⚠️ Bond tracking failed (non-fatal):', bond_error);
    }

    console.log(
      `[FINANCIAL_UPDATE] Character ${id}: wallet ${cur.wallet} -> ${new_wallet}, debt ${cur.debt} -> ${new_debt}`
    );

    res.json({
      ok: true,
      financials: {
        wallet: new_wallet,
        debt: new_debt
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error committing financial decision:', error);
    res.status(500).json({ error: 'server_error' });
  } finally {
    client.release();
  }
});

// POST respond to a financial decision event (Endorse / Advise Against)
r.post('/decisions/:decision_id/respond', async (req, res) => {
  const { decision_id } = req.params;
  const { response } = req.body || {};

  // Validate response
  if (!response || !['endorse', 'advise_against'].includes(response)) {
    return res.status(400).json({
      error: 'invalid_response',
      message: 'Response must be "endorse" or "advise_against"'
    });
  }

  try {
    const { resolveDecision, getPendingDecision } = await import('../services/financialDecisionService');

    // Resolve the decision
    const result = await resolveDecision(decision_id, response);

    // Get the updated decision with item/equipment names
    const updated = await getPendingDecision(result.user_character_id);

    console.log(`💰 [FINANCIAL-RESPOND] Decision ${decision_id}: Coach ${response}, Character ${result.character_response}, Outcome: ${result.outcome}`);

    res.json({
      ok: true,
      decision: updated || result,
      summary: {
        coach_response: result.coach_response,
        character_response: result.character_response,
        adherence_roll: result.adherence_roll,
        outcome: result.outcome,
        judge_grade: result.judge_grade,
        judge_ruling: result.judge_ruling,
        wallet_change: result.wallet_change,
        debt_change: result.debt_change,
        trust_change: result.trust_change,
        stress_change: result.stress_change,
        xp_change: result.xp_change
      }
    });
  } catch (error: any) {
    console.error('Error resolving financial decision:', error);
    res.status(500).json({
      error: 'resolve_failed',
      message: error.message
    });
  }
});

// GET pending decision for a character (also triggers roll if none exists)
r.get('/characters/:character_id/pending-decision', async (req, res) => {
  const { character_id } = req.params;

  try {
    const { getPendingDecision, shouldTriggerEvent, generateDecisionEvent } = await import('../services/financialDecisionService');

    // Check for existing pending decision
    let pending = await getPendingDecision(character_id);

    // If no pending decision, roll for decision event
    if (!pending) {
      const should_trigger = await shouldTriggerEvent(character_id);

      if (should_trigger) {
        console.log(`💰 [FINANCIAL-DECISION] Decision event triggered for character ${character_id}`);
        await generateDecisionEvent(character_id);
        // Fetch the newly created decision
        pending = await getPendingDecision(character_id);
      }
    }

    if (!pending) {
      return res.json({ ok: true, pending: null });
    }

    res.json({
      ok: true,
      pending: {
        id: pending.id,
        category: pending.category,
        amount: pending.amount,
        character_reasoning: pending.character_reasoning,
        is_risky: pending.is_risky,
        item_name: pending.item_name,
        equipment_name: pending.equipment_name,
        created_at: pending.created_at
      }
    });
  } catch (error: any) {
    console.error('Error fetching pending decision:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: error.message
    });
  }
});

export default r;