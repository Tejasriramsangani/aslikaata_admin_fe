"use client";

import React from 'react';
import { AdminAppShell } from '../../components/layout/AdminAppShell';
import { FraudSentinelAndAlertsScreen } from '../../components/audits/FraudSentinelAndAlertsScreen';

export default function AuditsPage() {
  return (
    <AdminAppShell>
      <FraudSentinelAndAlertsScreen />
    </AdminAppShell>
  );
}
