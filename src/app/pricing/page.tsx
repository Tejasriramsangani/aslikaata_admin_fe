"use client";

import React from 'react';
import { AdminAppShell } from '../../components/layout/AdminAppShell';
import { RatesAndMarginScreen } from '../../components/rates/RatesAndMarginScreen';

export default function PricingPage() {
  return (
    <AdminAppShell>
      <RatesAndMarginScreen />
    </AdminAppShell>
  );
}
