import type { HealthResponse } from '@aimargen/types';
import { apiRequest } from '../../../core/js/api-client';

/** Servicio del módulo system: consulta el estado de la API. */
export function fetchReadiness(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/health/ready');
}
