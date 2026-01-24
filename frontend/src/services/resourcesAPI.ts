import apiClient from './apiClient';

export interface ResourceStat {
  id: string;
  name: string;
  value: number;
}

export interface ResourceAllocation {
  resource_id: string;
  points: number;
}

export interface ResourceSurveyOption {
  id: string;
  label: string;
  allocations: ResourceAllocation[];
  rationale?: string;
}

export interface ResourceAdherenceResult {
  success: boolean;
  adhered: boolean;
  coach_choice: ResourceAllocation[];
  final_choice: ResourceAllocation[];
  message?: string;
  survey_required?: boolean;
  survey_options?: ResourceSurveyOption[];
  adherence_score?: number;
  roll?: number;
}

export interface CharacterResourcesResponse {
  character: {
    id: string;
    name: string;
    level: number;
    gameplan_adherence?: number;
    unspent_resource_points: number;
  };
  resources: ResourceStat[];
  pending_allocations?: ResourceAllocation[];
  pending_survey?: ResourceSurveyOption[];
}

export async function getCharacterResources(character_id: string): Promise<CharacterResourcesResponse> {
  const response = await apiClient.get(`/resources/character/${character_id}`);
  return response.data;
}

export async function allocateResources(params: {
  character_id: string;
  allocations: ResourceAllocation[];
}): Promise<ResourceAdherenceResult> {
  const response = await apiClient.post('/resources/allocate', params);
  return response.data;
}

export async function submitResourceSurveyChoice(params: {
  character_id: string;
  survey_option_id: string;
}): Promise<ResourceAdherenceResult> {
  const response = await apiClient.post('/resources/survey', params);
  return response.data;
}
