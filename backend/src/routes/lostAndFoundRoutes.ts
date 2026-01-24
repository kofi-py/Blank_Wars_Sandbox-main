/**
 * Lost & Found Wars API Routes
 */

import express from 'express';
import { query } from '../database/index';
import { locker_generation_service } from '../services/lockerGenerationService';
import { locker_bidding_service } from '../services/lockerBiddingService';

const router = express.Router();

// ============================================
// LOCATION & SCHEDULE
// ============================================

/**
 * GET /api/lost-and-found/today
 * Get today's location and schedule
 */
router.get('/today', async (req, res) => {
  try {
    const result = await query(
      `SELECT date, location, special_modifier
       FROM locker_daily_locations
       WHERE date = CURRENT_DATE
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No location scheduled for today' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching today\'s location:', error);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

/**
 * GET /api/lost-and-found/schedule
 * Get next 7 days of location schedule
 */
router.get('/schedule', async (req, res) => {
  try {
    const result = await query(
      `SELECT date, location, special_modifier
       FROM locker_daily_locations
       WHERE date >= CURRENT_DATE
       ORDER BY date ASC
       LIMIT 7`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// ============================================
// AUCTION CREATION & MANAGEMENT
// ============================================

/**
 * POST /api/lost-and-found/generate-auction
 * Generate a new locker auction
 */
router.post('/generate-auction', async (req, res) => {
  try {
    const { user_id, character_id, location } = req.body;

    if (!user_id || !character_id) {
      return res.status(400).json({ error: 'user_id and character_id required' });
    }

    // Use today's location if not specified
    let target_location = location;
    if (!target_location) {
      const today_result = await query(
        'SELECT location FROM locker_daily_locations WHERE date = CURRENT_DATE LIMIT 1'
      );
      if (today_result.rows.length === 0) {
        return res.status(404).json({ error: 'No location available today' });
      }
      target_location = today_result.rows[0].location;
    }

    // Generate locker
    const locker = await locker_generation_service.generateLocker(target_location, user_id);

    // Get character's current adherence
    const character_result = await query(
      'SELECT gameplan_adherence FROM user_characters WHERE id = $1',
      [character_id]
    );

    if (character_result.rows.length === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const adherence_before = character_result.rows[0].gameplan_adherence;

    // Create auction session
    const auction_result = await query(
      `INSERT INTO locker_auction_sessions (
        user_id, character_id, location, locker_number, locker_size,
        items, visible_items, hints, status, adherence_before
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, locker_number, location, visible_items, hints, status`,
      [
        user_id,
        character_id,
        locker.location,
        locker.locker_number,
        'medium', // TODO: Determine size based on price
        JSON.stringify(locker.items),
        JSON.stringify(locker.visible_items),
        locker.hints,
        'created',
        adherence_before
      ]
    );

    res.json({
      auction_id: auction_result.rows[0].id,
      locker: {
        number: auction_result.rows[0].locker_number,
        location: auction_result.rows[0].location,
        price: locker.price,
        visible_items: locker.visible_items,
        hints: locker.hints,
        fullness: locker.fullness,
        clutter: locker.clutter
      },
      adherence: adherence_before
    });
  } catch (error) {
    console.error('Error generating auction:', error);
    res.status(500).json({ error: 'Failed to generate auction' });
  }
});

/**
 * POST /api/lost-and-found/set-strategy
 * Set coach's bidding strategy for an auction
 */
router.post('/set-strategy', async (req, res) => {
  try {
    const { auction_id, target_min, target_max, absolute_cap } = req.body;

    if (!auction_id || target_min == null || target_max == null || absolute_cap == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await query(
      `UPDATE locker_auction_sessions
       SET coach_target_min = $1, coach_target_max = $2, coach_absolute_cap = $3,
           status = 'peeking', peek_started_at = NOW()
       WHERE id = $4`,
      [target_min, target_max, absolute_cap, auction_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error setting strategy:', error);
    res.status(500).json({ error: 'Failed to set strategy' });
  }
});

// ============================================
// BIDDING
// ============================================

/**
 * POST /api/lost-and-found/process-bid
 * Process a bidding moment (adherence check + execution)
 */
router.post('/process-bid', async (req, res) => {
  try {
    const { auction_id, current_bid } = req.body;

    // Get auction details
    const auction_result = await query(
      `SELECT
        las.id, las.character_id, las.coach_target_min, las.coach_target_max,
        las.coach_absolute_cap, uc.gameplan_adherence, uc.bond_level
       FROM locker_auction_sessions las
       JOIN user_characters uc ON las.character_id = uc.id
       WHERE las.id = $1`,
      [auction_id]
    );

    if (auction_result.rows.length === 0) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const auction = auction_result.rows[0];

    // Process bid with adherence check
    const bid_action = await locker_bidding_service.processBid({
      auction_id,
      character_id: auction.character_id,
      current_bid,
      coach_strategy: {
        target_min: auction.coach_target_min,
        target_max: auction.coach_target_max,
        absolute_cap: auction.coach_absolute_cap
      },
      adherence_level: auction.gameplan_adherence,
      bond_level: auction.bond_level || 75
    });

    // Update auction status if bidding started
    if (auction.status !== 'bidding') {
      await query(
        `UPDATE locker_auction_sessions
         SET status = 'bidding', bidding_started_at = NOW()
         WHERE id = $1`,
        [auction_id]
      );
    }

    // Track if went rogue
    if (bid_action.was_rogue) {
      await query(
        `UPDATE locker_auction_sessions
         SET went_rogue_at_bid = (
           SELECT COALESCE(MAX(bid_number), 0) FROM locker_bid_history WHERE auction_id = $1
         ),
         followed_strategy = false
         WHERE id = $1`,
        [auction_id]
      );
    }

    res.json(bid_action);
  } catch (error) {
    console.error('Error processing bid:', error);
    res.status(500).json({ error: 'Failed to process bid' });
  }
});

/**
 * POST /api/lost-and-found/finalize-auction
 * Finalize auction (won/lost) and calculate results
 */
router.post('/finalize-auction', async (req, res) => {
  try {
    const { auction_id, won_auction, final_bid, winner_name } = req.body;

    // Get auction details
    const auction_result = await query(
      `SELECT
        las.*, uc.gameplan_adherence, uc.bond_level
       FROM locker_auction_sessions las
       JOIN user_characters uc ON las.character_id = uc.id
       WHERE las.id = $1`,
      [auction_id]
    );

    if (auction_result.rows.length === 0) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const auction = auction_result.rows[0];

    // Update auction record
    await query(
      `UPDATE locker_auction_sessions
       SET won_auction = $1, final_bid = $2, winning_bidder = $3,
           status = $4, auction_ended_at = NOW()
       WHERE id = $5`,
      [won_auction, final_bid, winner_name || 'AI', won_auction ? 'won' : 'lost', auction_id]
    );

    if (won_auction) {
      // Calculate total value
      const items = JSON.parse(auction.items);
      const total_value = items.reduce((sum: number, item: any) => sum + item.base_value, 0);
      const net_profit = total_value - final_bid;

      // Update financial results
      await query(
        `UPDATE locker_auction_sessions
         SET investment = $1, total_value = $2, net_profit = $3
         WHERE id = $4`,
        [final_bid, total_value, net_profit, auction_id]
      );

      // Update adherence
      const adherence_change = await locker_bidding_service.updateAdherence({
        character_id: auction.character_id,
        went_rogue: !auction.followed_strategy,
        won_auction: true,
        profit: net_profit
      });

      // Update auction with adherence change
      const new_adherence = Math.max(0, Math.min(100, auction.gameplan_adherence + adherence_change));
      await query(
        `UPDATE locker_auction_sessions
         SET adherence_after = $1, adherence_change = $2
         WHERE id = $3`,
        [new_adherence, adherence_change, auction_id]
      );

      res.json({
        won: true,
        investment: final_bid,
        total_value: total_value,
        net_profit: net_profit,
        items,
        adherence_change: adherence_change,
        new_adherence: new_adherence
      });
    } else {
      // Lost auction
      const adherence_change = await locker_bidding_service.updateAdherence({
        character_id: auction.character_id,
        went_rogue: !auction.followed_strategy,
        won_auction: false,
        profit: 0
      });

      const new_adherence = Math.max(0, Math.min(100, auction.gameplan_adherence + adherence_change));
      await query(
        `UPDATE locker_auction_sessions
         SET adherence_after = $1, adherence_change = $2
         WHERE id = $3`,
        [new_adherence, adherence_change, auction_id]
      );

      res.json({
        won: false,
        adherence_change: adherence_change,
        new_adherence: new_adherence
      });
    }
  } catch (error) {
    console.error('Error finalizing auction:', error);
    res.status(500).json({ error: 'Failed to finalize auction' });
  }
});

/**
 * POST /api/lost-and-found/complete-reveal
 * Mark auction as completed after reveal phase
 */
router.post('/complete-reveal', async (req, res) => {
  try {
    const { auction_id } = req.body;

    await query(
      `UPDATE locker_auction_sessions
       SET status = 'completed', reveal_completed_at = NOW(), completed_at = NOW()
       WHERE id = $1`,
      [auction_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error completing reveal:', error);
    res.status(500).json({ error: 'Failed to complete reveal' });
  }
});

// ============================================
// LEADERBOARDS
// ============================================

/**
 * GET /api/lost-and-found/leaderboard/:period
 * Get leaderboard for specified period (daily/weekly/season)
 */
router.get('/leaderboard/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    if (!['daily', 'weekly', 'season'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }

    const result = await query(
      `SELECT
        ll.rank, ll.total_profit, ll.total_invested, ll.lockers_won,
        ll.best_profit, ll.best_find_value,
        c.name as character_name, c.avatar_emoji,
        u.username
       FROM locker_leaderboards ll
       JOIN user_characters uc ON ll.character_id = uc.id
       JOIN characters c ON uc.character_id = c.id
       JOIN users u ON ll.user_id = u.id
       WHERE ll.period = $1
       AND ll.period_start = (
         SELECT MAX(period_start) FROM locker_leaderboards WHERE period = $1
       )
       ORDER BY ll.total_profit DESC
       LIMIT $2`,
      [period, limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/lost-and-found/stats/:user_id
 * Get user's Lost & Found Wars stats
 */
router.get('/stats/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const result = await query(
      `SELECT
        COUNT(*) as total_auctions,
        COUNT(*) FILTER (WHERE won_auction = true) as auctions_won,
        COUNT(*) FILTER (WHERE won_auction = false) as auctions_lost,
        COALESCE(SUM(net_profit), 0) as total_profit,
        COALESCE(SUM(investment), 0) as total_invested,
        COALESCE(MAX(net_profit), 0) as best_profit,
        COALESCE(MIN(net_profit), 0) as worst_loss,
        COALESCE(MAX(total_value), 0) as best_find
       FROM locker_auction_sessions
       WHERE user_id = $1 AND status = 'completed'`,
      [user_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ============================================
// HISTORY
// ============================================

/**
 * GET /api/lost-and-found/history/:user_id
 * Get user's auction history
 */
router.get('/history/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await query(
      `SELECT
        las.id, las.location, las.locker_number, las.won_auction,
        las.final_bid, las.investment, las.total_value, las.net_profit,
        las.followed_strategy, las.adherence_change, las.created_at,
        c.name as character_name, c.avatar_emoji
       FROM locker_auction_sessions las
       JOIN user_characters uc ON las.character_id = uc.id
       JOIN characters c ON uc.character_id = c.id
       WHERE las.user_id = $1 AND las.status = 'completed'
       ORDER BY las.created_at DESC
       LIMIT $2`,
      [user_id, limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router;
