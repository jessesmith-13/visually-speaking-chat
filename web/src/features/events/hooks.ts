import { useApp } from '@/app/hooks';

export function useEvents() {
  const { events, refreshEvents } = useApp();
  return { events, refreshEvents, loading: false };
}

export function useEvent(eventId: string) {
  const { events } = useApp();
  const event = events.find(e => e.id === eventId) || null;
  return { event, loading: false };
}

export function useCreateEvent() {
  const { addEvent } = useApp();
  return { 
    createEvent: addEvent,
    loading: false 
  };
}

export function useDeleteEvent() {
  const { removeEvent } = useApp();
  return { 
    deleteEvent: removeEvent,
    loading: false 
  };
}

export function useCurrentEvent() {
  const { currentEvent, setCurrentEvent } = useApp();
  return { currentEvent, setCurrentEvent };
}