import { useEffect, useState } from 'react';
import { useDesk } from '../context/DeskContext';
/** Persist in-progress forms without adding an audit event on each keystroke. */
export function useDeskDraft(
  key: string,
  data: Record<string, string>,
  enabled = true,
) {
  const { saveDraft } = useDesk();
  const serialized = JSON.stringify(data);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const timer = setTimeout(() => {
      saveDraft(key, JSON.parse(serialized))
        .then(() => setError(''))
        .catch(() =>
          setError('Draft could not be saved. Retry the Save draft action.'),
        );
    }, 350);
    return () => clearTimeout(timer);
  }, [key, serialized, enabled, saveDraft]);
  return error;
}
