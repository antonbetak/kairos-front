import { apiRequest } from './api';

export interface EventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface EventItem {
  id: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  start: EventDateTime;
  end: EventDateTime;
  status?: string;
  htmlLink?: string;
}

export interface EventsListResponse {
  items: EventItem[];
  nextPageToken?: string | null;
  summary?: string;
}

export async function listarEventos(
  clerkToken: string,
  params?: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    calendarId?: string;
  }
): Promise<EventsListResponse> {
  const query = new URLSearchParams();
  if (params?.timeMin) query.set('time_min', params.timeMin);
  if (params?.timeMax) query.set('time_max', params.timeMax);
  if (params?.maxResults) query.set('max_results', String(params.maxResults));
  if (params?.calendarId) query.set('calendar_id', params.calendarId);

  const endpoint = `/google/events${query.toString() ? `?${query.toString()}` : ''}`;

  return apiRequest<EventsListResponse>(endpoint, { token: clerkToken });
}

export async function listarCalendarios(clerkToken: string) {
  return apiRequest<{ items: any[] }>('/google/calendars', { token: clerkToken });
}