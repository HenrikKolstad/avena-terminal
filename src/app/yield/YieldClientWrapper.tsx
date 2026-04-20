'use client';

import { useState } from 'react';
import YieldTab from '@/components/YieldTab';
import { ProModal } from '@/components/v2/ProModal';
import { useAuth } from '@/context/AuthContext';
import type { Property } from '@/lib/types';

export function YieldClientWrapper({ properties }: { properties: Property[] }) {
  const { isPaid } = useAuth();
  const [proOpen, setProOpen] = useState(false);

  return (
    <>
      <YieldTab
        properties={properties}
        isPaid={isPaid}
        onUpgrade={() => setProOpen(true)}
      />
      <ProModal open={proOpen} onClose={() => setProOpen(false)} />
    </>
  );
}
