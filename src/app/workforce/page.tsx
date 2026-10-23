"use client";

import React from 'react';
import { AdminAppShell } from '../../components/layout/AdminAppShell';
import { WorkforceHRMScreen } from '../../components/workforce/WorkforceHRMScreen';

export default function WorkforcePage() {
  return (
    <AdminAppShell>
      <WorkforceHRMScreen />
    </AdminAppShell>
  );
}
