import express from 'express';
import { authenticate_token } from '../services/auth';
import { stakingService } from '../services/stakingService';

const router = express.Router();

// POST /api/staking/stake
router.post('/stake', authenticate_token, async (req: any, res) => {
    try {
        const { character_id } = req.body;
        const user_id = req.user.id;

        await stakingService.stakeCharacter(user_id, character_id);
        res.json({ success: true, message: 'Character staked successfully' });
    } catch (error: any) {
        console.error('Staking error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/staking/unstake
router.post('/unstake', authenticate_token, async (req: any, res) => {
    try {
        const { character_id } = req.body;
        const user_id = req.user.id;

        await stakingService.unstakeCharacter(user_id, character_id);
        res.json({ success: true, message: 'Character unstaked successfully' });
    } catch (error: any) {
        console.error('Unstaking error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/staking/claim
router.post('/claim', authenticate_token, async (req: any, res) => {
    try {
        const user_id = req.user.id;
        const rewards = await stakingService.claimRewards(user_id);
        res.json({ success: true, rewards });
    } catch (error: any) {
        console.error('Claim rewards error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
