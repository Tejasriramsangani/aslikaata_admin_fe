"use client";

import React from 'react';
import { AdminAppShell } from '../../components/layout/AdminAppShell';
import { FleetManagementScreen } from '../../components/fleet/FleetManagementScreen';

export default function FleetPage() {
  return (
    <AdminAppShell>
      <FleetManagementScreen />
    </AdminAppShell>
  );
}
