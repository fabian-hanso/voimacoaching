"use client";

import { GlobalErrorState } from "@/components/global-error-state";

export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return <GlobalErrorState error={error} retry={retry} />;
}
