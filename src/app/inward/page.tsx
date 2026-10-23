"use client";

import React from 'react';
import { AdminAppShell } from '../../components/layout/AdminAppShell';
import { MultiChannelInwardScreen } from '../../components/inward/MultiChannelInwardScreen';

export default function InwardPage() {
  return (
    <AdminAppShell>
      <MultiChannelInwardScreen />
    </AdminAppShell>
  );
}
