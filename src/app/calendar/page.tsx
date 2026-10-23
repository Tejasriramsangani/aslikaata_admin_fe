"use client";

import React from 'react';
import { AdminAppShell } from '../../components/layout/AdminAppShell';
import { HolidayAndRoutePlanningScreen } from '../../components/calendar/HolidayAndRoutePlanningScreen';

export default function CalendarPage() {
  return (
    <AdminAppShell>
      <HolidayAndRoutePlanningScreen />
    </AdminAppShell>
  );
}
