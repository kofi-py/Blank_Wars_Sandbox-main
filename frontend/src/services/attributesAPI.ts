/**
 * Attributes System API Service
 * Handles all API calls related to core attribute allocation and adherence checks.
 */

import apiClient from './apiClient';

export interface AttributeStat {
  id: string;
  name: string;
  value: number;
  min?: number;
  max?: number;
  description?: string;
}

export interface AttributeAllocation {
  attribute_id: string;
  points: number;
}

export interface AttributeSurveyOption {
  id: string;
  label: string;
  allocations: AttributeAllocation[];
  rationale?: string;
}

export interface AttributeAdherenceResult {
  success: boolean;
  adhered: boolean;
  coach_choice: AttributeAllocation[];
  final_choice: AttributeAllocation[];
  message?: string;
  survey_required?: boolean;
  survey_options?: AttributeSurveyOption[];
  adherence_score?: number;
}

export interface CharacterAttributesResponse {
  character: {
    id: string;
    name: string;
    level: number;
    gameplan_adherence?: number;
    unspent_attribute_points: number;
  };
  attributes: AttributeStat[];
  pending_allocations?: AttributeAllocation[];
  last_updated?: string;
}

export async function getCharacterAttributes(character_id: string): Promise<CharacterAttributesResponse> {
  const response = await apiClient.get(`/attributes/character/${character_id}`);
  return response.data;
}

export async function allocateAttributes(params: {
  character_id: string;
  allocations: AttributeAllocation[];
  coach_notes?: string;
  source?: 'coach' | 'character';
}): Promise<AttributeAdherenceResult> {
  const response = await apiClient.post('/attributes/allocate', params);
  return response.data;
}

export async function submitAttributeSurveyChoice(params: {
  character_id: string;
  survey_option_id: string;
}): Promise<AttributeAdherenceResult> {
  const response = await apiClient.post('/attributes/survey', params);
  return response.data;
}

export async function requestAttributeAdvice(params: {
  character_id: string;
  character_name?: string;
  message: string;
  attributes?: AttributeStat[];
}): Promise<{ reply: string }> {
  const response = await apiClient.post('/attributes/advice', params);
  return response.data;
}
