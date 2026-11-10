"use client";

import { Icon } from "@/components/icons";
import { cx } from "@/components/ui";
import type { CourseWithSessions } from "@/lib/types";

export function CourseImage({
  course,
  className,
}: {
  course: Pick<CourseWithSessions, "imageUrl" | "title" | "category">;
  className?: string;
}) {
  return course.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- bereits serverseitig auf 1600×900 verkleinert
    <img
      src={course.imageUrl}
      alt=""
      className={cx("aspect-video w-full object-cover", className)}
    />
  ) : (
    <div
      className={cx(
        "relative grid aspect-video w-full place-items-center overflow-hidden bg-brand-fg text-brand",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="absolute -top-10 -right-10 size-40 rounded-full bg-brand opacity-25 blur-2xl"
      />
      <span className="relative text-center">
        <Icon name="users" className="mx-auto size-8" />
        {course.category && (
          <span className="mt-1 block text-xs font-semibold tracking-wide uppercase">
            {course.category}
          </span>
        )}
      </span>
    </div>
  );
}
