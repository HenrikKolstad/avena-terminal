'use client';

import { useEffect } from 'react';
import { pushRecentlyViewed } from '@/lib/recently-viewed';

export function RecordPropertyView({ propertyRef }: { propertyRef: string }) {
  useEffect(() => {
    if (propertyRef) pushRecentlyViewed(propertyRef);
  }, [propertyRef]);
  return null;
}
