import { apiClient } from './apiClient';

export interface CharacterEcho {
  character_id: string;
  count: number;
}

export interface EchoSpendResult {
  success: boolean;
  remaining_echoes: number;
  message?: string;
}

export class EchoService {
  private static instance: EchoService;

  static getInstance(): EchoService {
    if (!EchoService.instance) {
      EchoService.instance = new EchoService();
    }
    return EchoService.instance;
  }

  async getUserEchoes(): Promise<CharacterEcho[]> {
    try {
      const response = await apiClient.get('/echoes');
      return response.data.echoes || [];
    } catch (error) {
      console.error('Error fetching user echoes:', error);
      return [];
    }
  }

  async getEchoCount(character_id: string): Promise<number> {
    try {
      const response = await apiClient.get(`/echoes/${character_id}`);
      return response.data.count || 0;
    } catch (error) {
      console.error('Error fetching echo count:', error);
      return 0;
    }
  }

  async spendEchoes(
    character_id: string, 
    amount: number, 
    action: 'ascend' | 'rankUp'
  ): Promise<EchoSpendResult> {
    try {
      const response = await apiClient.post('/echoes/spend', {
        character_id,
        amount,
        action
      });
      return response.data;
    } catch (error: any) {
      console.error('Error spending echoes:', error);
      return {
        success: false,
        remaining_echoes: 0,
        message: error.response?.data?.error || 'Failed to spend echoes'
      };
    }
  }

  async ascendCharacter(userCharacterId: string, echoes_to_spend: number): Promise<EchoSpendResult> {
    try {
      const response = await apiClient.post('/echoes/ascend', {
        userCharacterId,
        echoes_to_spend
      });
      return response.data;
    } catch (error: any) {
      console.error('Error ascending character:', error);
      return {
        success: false,
        remaining_echoes: 0,
        message: error.response?.data?.error || 'Failed to ascend character'
      };
    }
  }

  async rankUpAbility(
    user_character_id: string, 
    ability_id: string, 
    echoes_to_spend: number
  ): Promise<EchoSpendResult> {
    try {
      const response = await apiClient.post('/echoes/rankup', {
        user_character_id: user_character_id,
        ability_id,
        echoes_to_spend
      });
      return response.data;
    } catch (error: any) {
      console.error('Error ranking up ability:', error);
      return {
        success: false,
        remaining_echoes: 0,
        message: error.response?.data?.error || 'Failed to rank up ability'
      };
    }
  }
}

export const echoService = EchoService.getInstance();