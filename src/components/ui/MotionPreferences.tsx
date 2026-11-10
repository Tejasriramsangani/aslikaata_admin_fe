"use client";
import { MotionConfig } from 'framer-motion';
export function MotionPreferences({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={{ duration: 0.2 }}>{children}</MotionConfig>;
}
