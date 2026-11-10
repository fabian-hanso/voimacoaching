"use client";

import { useMe } from "../shell";
import { BillingView } from "./billing-view";

/** Route /dashboard/abo. */
export function BillingPage() {
  const { me, reload } = useMe();
  return <BillingView me={me} reload={reload} />;
}
