"use client";

// Absolute URLs (needed for QR codes and Copy Link) can't be known during
// server render — `window` doesn't exist there. Starts empty (matches the
// server-rendered HTML) and fills in after mount, so there's no hydration
// mismatch.

import { useEffect, useState } from "react";

export function useOrigin(): string {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  return origin;
}
