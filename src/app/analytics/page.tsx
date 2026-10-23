"use client";

import React from 'react';
import { AdminAppShell } from '../../components/layout/AdminAppShell';
import { UnitEconomicsAndPnLScreen } from '../../components/analytics/UnitEconomicsAndPnLScreen';

export default function AnalyticsPage() {
  return (
    <AdminAppShell>
      <UnitEconomicsAndPnLScreen />
    </AdminAppShell>
  );
}
