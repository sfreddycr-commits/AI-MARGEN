import { useQuery } from '@tanstack/react-query';
import { fetchReadiness } from './system.service';

export function useReadiness() {
  return useQuery({
    queryKey: ['system', 'readiness'],
    queryFn: fetchReadiness,
    retry: false,
    refetchInterval: 30_000,
  });
}
