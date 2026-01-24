/**
 * Cardano API Routes
 * Exposes Cardano NFT integration endpoints
 */

import express, { Request, Response } from 'express';
import { cardanoProvider } from '../services/cardano/CardanoProviderService';
import { cardanoMintingService } from '../services/cardano/CardanoMintingService';
import { cardanoStakingService } from '../services/cardano/CardanoStakingService';
import { influencerMintService } from '../services/cardano/InfluencerMintService';

const router = express.Router();

// ==================== VERIFICATION ====================

/**
 * POST /api/cardano/verify
 * Verify NFT ownership
 */
router.post('/verify', async (req: Request, res: Response) => {
    try {
        const { walletAddress, assetFingerprint } = req.body;

        if (!walletAddress || !assetFingerprint) {
            return res.status(400).json({
                error: 'MISSING_PARAMETERS',
                message: 'walletAddress and assetFingerprint are required'
            });
        }

        const verified = await cardanoProvider.verifyNftOwnership(walletAddress, assetFingerprint);

        res.json({
            verified,
            walletAddress,
            assetFingerprint
        });
    } catch (error: any) {
        console.error('NFT verification error:', error);
        res.status(500).json({
            error: error.message,
            verified: false
        });
    }
});

// ==================== MINTING ====================

/**
 * POST /api/cardano/mint
 * Mint a character as an NFT
 */
router.post('/mint', async (req: Request, res: Response) => {
    try {
        const { userId, userCharacterId, cardSetId } = req.body;

        if (!userId || !userCharacterId || !cardSetId) {
            return res.status(400).json({
                error: 'MISSING_PARAMETERS',
                message: 'userId, userCharacterId, and cardSetId are required'
            });
        }

        const result = await cardanoMintingService.mintCharacterNFT({
            userId,
            userCharacterId,
            cardSetId
        });

        res.json({
            success: true,
            ...result
        });
    } catch (error: any) {
        console.error('Minting error:', error);

        // Handle different error types
        if (error.message.includes('NOT_FOUND')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('ALREADY_MINTED')) {
            return res.status(409).json({ error: error.message });
        }
        if (error.message.includes('WINDOW') || error.message.includes('MAX_SUPPLY')) {
            return res.status(403).json({ error: error.message });
        }
        if (error.message.includes('NOT_IMPLEMENTED')) {
            return res.status(501).json({ error: error.message });
        }

        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/cardano/update
 * Sync character metadata to chain
 */
router.post('/update', async (req: Request, res: Response) => {
    try {
        const { userCharacterId } = req.body;

        if (!userCharacterId) {
            return res.status(400).json({
                error: 'MISSING_PARAMETERS',
                message: 'userCharacterId is required'
            });
        }

        const result = await cardanoMintingService.syncMetadataToChain(userCharacterId);

        res.json({
            success: true,
            ...result
        });
    } catch (error: any) {
        console.error('Metadata sync error:', error);

        if (error.message.includes('NOT_FOUND')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('NOT_IMPLEMENTED')) {
            return res.status(501).json({ error: error.message });
        }

        res.status(500).json({ error: error.message });
    }
});

// ==================== STAKING ====================

/**
 * POST /api/cardano/stake
 * Stake an NFT character
 */
router.post('/stake', async (req: Request, res: Response) => {
    try {
        const { userId, userCharacterId, tier } = req.body;

        if (!userId || !userCharacterId || !tier) {
            return res.status(400).json({
                error: 'MISSING_PARAMETERS',
                message: 'userId, userCharacterId, and tier are required'
            });
        }

        if (!['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].includes(tier)) {
            return res.status(400).json({
                error: 'INVALID_TIER',
                message: 'tier must be one of: BRONZE, SILVER, GOLD, PLATINUM'
            });
        }

        const result = await cardanoStakingService.stakeCharacter({
            userId,
            userCharacterId,
            tier
        });

        res.json({
            success: true,
            ...result
        });
    } catch (error: any) {
        console.error('Staking error:', error);

        if (error.message.includes('NOT_FOUND') || error.message.includes('NOT_CONNECTED')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('ALREADY_STAKED') || error.message.includes('REQUIREMENTS_NOT_MET')) {
            return res.status(409).json({ error: error.message });
        }
        if (error.message.includes('VERIFICATION_FAILED')) {
            return res.status(403).json({ error: error.message });
        }

        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/cardano/unstake
 * Unstake a character and claim rewards
 */
router.post('/unstake', async (req: Request, res: Response) => {
    try {
        const { positionId, userId } = req.body;

        if (!positionId || !userId) {
            return res.status(400).json({
                error: 'MISSING_PARAMETERS',
                message: 'positionId and userId are required'
            });
        }

        const result = await cardanoStakingService.unstakeCharacter({
            positionId,
            userId
        });

        res.json({
            success: true,
            ...result
        });
    } catch (error: any) {
        console.error('Unstaking error:', error);

        if (error.message.includes('NOT_FOUND')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('UNAUTHORIZED')) {
            return res.status(403).json({ error: error.message });
        }

        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/cardano/staking/:positionId
 * Get staking position details
 */
router.get('/staking/:positionId', async (req: Request, res: Response) => {
    try {
        const { positionId } = req.params;

        const position = await cardanoStakingService.getStakingPosition(positionId);

        res.json(position);
    } catch (error: any) {
        console.error('Get staking position error:', error);

        if (error.message.includes('NOT_FOUND')) {
            return res.status(404).json({ error: error.message });
        }

        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/cardano/staking/user/:userId
 * Get all staking positions for a user
 */
router.get('/staking/user/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const positions = await cardanoStakingService.getUserStakingPositions(userId);

        res.json({ positions });
    } catch (error: any) {
        console.error('Get user staking positions error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== INFLUENCER MINTING ====================

/**
 * POST /api/cardano/influencer/claim
 * Claim an influencer NFT using a code
 */
router.post('/influencer/claim', async (req: Request, res: Response) => {
    try {
        const { userId, claimCode, characterId } = req.body;

        if (!userId || !claimCode) {
            return res.status(400).json({
                error: 'MISSING_PARAMETERS',
                message: 'userId and claimCode are required'
            });
        }

        const result = await influencerMintService.mintInfluencerNFT({
            userId,
            claimCode,
            characterId
        });

        res.json({
            success: true,
            ...result
        });
    } catch (error: any) {
        console.error('Influencer claim error:', error);

        if (error.message.includes('NOT_FOUND') || error.message.includes('NOT_CONNECTED')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('ALREADY_USED') || error.message.includes('EXPIRED') ||
            error.message.includes('REVOKED') || error.message.includes('MISMATCH')) {
            return res.status(403).json({ error: error.message });
        }
        if (error.message.includes('NOT_IMPLEMENTED')) {
            return res.status(501).json({ error: error.message });
        }

        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/cardano/influencer/allowlist/:walletAddress
 * Get allowlist entries for a wallet
 */
router.get('/influencer/allowlist/:walletAddress', async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.params;

        const entries = await influencerMintService.getAllowlistEntriesForWallet(walletAddress);

        res.json({ entries });
    } catch (error: any) {
        console.error('Get allowlist entries error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
