"use client";

import { Alert, Card, cx } from "@/components/ui";
import { authErrorMessage } from "@/lib/client/errors";
import { type ReactNode } from "react";

export type AuthLike = Parameters<typeof authErrorMessage>[0];

export type Msg = { tone: "success" | "error"; text: ReactNode } | null;

export function Section({
  id,
  title,
  description,
  danger,
  children,
}: {
  id: string;
  title: string;
  description: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="grid scroll-mt-24 gap-x-8 gap-y-6 py-10 md:grid-cols-3"
    >
      <div>
        <h2
          className={cx(
            "text-base font-semibold",
            danger ? "text-danger" : "text-fg",
          )}
        >
          {title}
        </h2>
        <p className="mt-1 text-sm text-fg-muted">{description}</p>
      </div>
      <Card className={cx("md:col-span-2", danger && "ring-danger/25")}>
        {children}
      </Card>
    </section>
  );
}

export function Feedback({ msg }: { msg: Msg }) {
  return msg ? (
    <div className="mt-4">
      <Alert tone={msg.tone}>{msg.text}</Alert>
    </div>
  ) : null;
}
