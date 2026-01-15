import { useState } from 'react';
import { joinQueue, leaveQueue, requestNextMatch, getMatchmakingStatus } from './api';

export function useMatchmaking() {
  const [inQueue, setInQueue] = useState(false);
  const [loading, setLoading] = useState(false);

  const join = async (eventId: string) => {
    setLoading(true);
    try {
      await joinQueue(eventId);
      setInQueue(true);
    } finally {
      setLoading(false);
    }
  };

  const leave = async (eventId: string) => {
    setLoading(true);
    try {
      await leaveQueue(eventId);
      setInQueue(false);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = async (eventId: string) => {
    setLoading(true);
    try {
      return await getMatchmakingStatus(eventId);
    } finally {
      setLoading(false);
    }
  };

  const nextMatch = async (eventId: string) => {
    setLoading(true);
    try {
      return await requestNextMatch(eventId);
    } finally {
      setLoading(false);
    }
  };

  return {
    inQueue,
    loading,
    joinQueue: join,
    leaveQueue: leave,
    getMatchmakingStatus: getStatus,
    requestNextMatch: nextMatch
  };
}