"use client";

import React from 'react';
import { AdminAppShell } from '../../components/layout/AdminAppShell';
import { UserManagementScreen } from '../../components/users/UserManagementScreen';

export default function UsersPage() {
  return (
    <AdminAppShell>
      <UserManagementScreen />
    </AdminAppShell>
  );
}
