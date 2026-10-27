import { useEffect, useState } from 'react';
export function LiveAnnouncer({
  message,
  eventId
}) {
  const [last, setLast] = useState({
    message: '',
    id: ''
  });
  useEffect(() => {
    if (message) setLast({
      message,
      id: eventId
    });
  }, [message, eventId]);
  return <div className="sr-only" role="status" aria-live="polite" aria-atomic="true"><span key={last.id}>{last.message}</span></div>;
}
