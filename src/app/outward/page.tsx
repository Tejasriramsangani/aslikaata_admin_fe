"use client";

import React from 'react';
import { AdminAppShell } from '../../components/layout/AdminAppShell';
import { OutwardAndYardInventoryScreen } from '../../components/outward/OutwardAndYardInventoryScreen';

export default function OutwardPage() {
  return (
    <AdminAppShell>
      <OutwardAndYardInventoryScreen />
    </AdminAppShell>
  );
}
