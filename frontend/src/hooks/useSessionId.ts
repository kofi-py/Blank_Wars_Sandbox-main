import { useEffect, useRef, useState } from 'react';

export function useSessionId(instanceId?: string, prefix: string = 'financial'): {
  session_id: string | '';
  greeted_ref: React.MutableRefObject<boolean>;
} {
  const [session_id, setSessionId] = useState('');
  const greetedRef = useRef(false);
  
  useEffect(() => {
    if (!instanceId) return;
    setSessionId(`${prefix}_${instanceId}_${Date.now()}`);
    greetedRef.current = false; // reset on new instance
  }, [instanceId, prefix]);
  
  return { session_id, greeted_ref: greetedRef };
}