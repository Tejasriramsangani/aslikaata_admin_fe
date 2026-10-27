"use client";

import React from 'react';
import { AdminAppShell } from '../../components/layout/AdminAppShell';
import { DispatchPickupScreen } from '../../components/dispatch/DispatchPickupScreen';

export default function DispatchPage() {
  return (
    <AdminAppShell>
      <DispatchPickupScreen />
    </AdminAppShell>
  );
}
