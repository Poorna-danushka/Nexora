// ─── AIRateLimitBanner ────────────────────────────────────────────────────────
// Displayed whenever an AI call returns HTTP 429 (daily limit exhausted).
// Wraps the existing Message component — no new design primitives needed.

import React from 'react';
import { Message } from '@/components/ui';

export function AIRateLimitBanner() {
  return (
    <Message tone="warning">
      ⚠ Rolling 24-hour AI limit reached (20 requests). Try again later.
    </Message>
  );
}
