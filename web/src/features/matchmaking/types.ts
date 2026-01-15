export interface QueueEntry {
  id: string;
  event_id: string;
  user_id: string;
  status: 'waiting' | 'matched' | 'left';
  matched_with?: string;
  joined_at: string;
}

export type MatchmakingStatus = 'waiting' | 'matched' | 'not_in_queue';
