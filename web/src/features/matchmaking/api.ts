import { callEdgeFunction } from '@/lib/edge/client';

/**
 * Join matchmaking queue for an event
 */
export async function joinQueue(eventId: string) {
  return await callEdgeFunction<{
    status: string;
    matched: boolean;
    roomId?: string;
  }>('matchmaking', '/join', {
    method: 'POST',
    body: { eventId },
  });
}

/**
 * Leave matchmaking queue
 */
export async function leaveQueue(eventId: string) {
  await callEdgeFunction('matchmaking', '/leave', {
    method: 'POST',
    body: { eventId },
  });
}

/**
 * Get current matchmaking status
 */
export async function getMatchmakingStatus(eventId: string) {
  return await callEdgeFunction<{
    status: 'waiting' | 'matched' | 'not_in_queue';
    roomId?: string;
  }>('matchmaking', `/status?eventId=${eventId}`);
}

/**
 * Request next match (after current session ends)
 */
export async function requestNextMatch(eventId: string) {
  return await callEdgeFunction<{
    matched: boolean;
    roomId?: string;
  }>('matchmaking', '/next-match', {
    method: 'POST',
    body: { eventId },
  });
}
