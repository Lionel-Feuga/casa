"use client";

import { PROFILE_LABEL } from "@/lib/domain/profile";
import { useRealtime } from "./Realtime";

export function Presence() {
  const { othersOnline } = useRealtime();
  if (othersOnline.length === 0) return <span />;
  return (
    <span className="presence" role="status">
      <i aria-hidden="true" />
      {PROFILE_LABEL[othersOnline[0]]} est en ligne
    </span>
  );
}
