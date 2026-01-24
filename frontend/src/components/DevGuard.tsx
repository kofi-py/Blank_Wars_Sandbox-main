'use client';

import { useEffect } from 'react';

export default function DevGuard() {
  useEffect(() => {
    // Import the guard only on client side
    import('../lib/aiRouteGuard');
  }, []);

  return null; // No visual component
}