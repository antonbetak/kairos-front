import { apiRequest } from './api';

export interface FitMetricBucket {
  startTimeMillis: number;
  endTimeMillis: number;
  value?: number | null;
}

export interface FitMetric {
  name: string;
  dataTypeName: string;
  unit?: string | null;
  total?: number | null;
  buckets: FitMetricBucket[];
}

export interface FitMeResponse {
  user_id: string;
  scopes: string[];
  time_range: {
    start_time: string;
    end_time: string;
    startTimeMillis: number;
    endTimeMillis: number;
  };
  metrics: FitMetric[];
  sessions: any[];
  data_sources: any[];
}

export async function obtenerFitData(
  clerkToken: string,
  params?: {
    start?: string;
    end?: string;
    bucketDays?: number;
  }
): Promise<FitMeResponse> {
  const query = new URLSearchParams();
  if (params?.start) query.set('start', params.start);
  if (params?.end) query.set('end', params.end);
  if (params?.bucketDays) query.set('bucket_days', String(params.bucketDays));

  const endpoint = `/fit/me${query.toString() ? `?${query.toString()}` : ''}`;
  return apiRequest<FitMeResponse>(endpoint, { token: clerkToken });
}