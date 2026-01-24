import { apiClient } from './apiClient';

export interface PackClaimResult {
  granted_characters: string[];
  echoes_gained: { character_id: string; count: number }[];
}

export interface PackGenerationResult {
  claim_token: string;
}

export class PackService {
  private static instance: PackService;

  static getInstance(): PackService {
    if (!PackService.instance) {
      PackService.instance = new PackService();
    }
    return PackService.instance;
  }

  async purchasePack(packType: string): Promise<PackClaimResult> {
    const response = await apiClient.post('/packs/purchase', { packType });
    // Backend returns { success: true, granted_characters: [...], echoes_gained: [...] }
    // Extract the pack result data
    const { success, ...packResult } = response.data;
    return packResult;
  }

  async generatePack(packType: string): Promise<PackGenerationResult> {
    const response = await apiClient.post('/packs/generate', { packType });
    return response.data;
  }

  async claimPack(claimToken: string): Promise<PackClaimResult> {
    const response = await apiClient.post('/packs/claim', { claimToken });
    return response.data;
  }

  async createGiftPack(character_ids: string[]): Promise<PackGenerationResult> {
    const response = await apiClient.post('/packs/gift', { character_ids });
    return response.data;
  }

  // Map pack IDs from the frontend to backend pack types
  mapPackIdToType(packId: string): string {
    switch (packId) {
      case 'demo':
        return 'demo';
      case 'starter':
        return 'standard_starter';
      case 'warrior':
        return 'premium_starter';
      case 'legendary':
        return 'premium_starter';
      case 'mythic':
        return 'premium_starter';
      default:
        return 'demo';
    }
  }
}

export const packService = PackService.getInstance();