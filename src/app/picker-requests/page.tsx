"use client";

import React from 'react';
import { AdminAppShell } from '../../components/layout/AdminAppShell';
import { PickerRequestsScreen } from '../../components/picker-requests/PickerRequestsScreen';

export default function PickerRequestsPage() {
  return (
    <AdminAppShell>
      <PickerRequestsScreen />
    </AdminAppShell>
  );
}
