"use client";

import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui";
import type { CourseWithSessions } from "@/lib/types";
import { scheduleLabel } from "./utils";

export function CourseMeta({ course }: { course: CourseWithSessions }) {
  return (
    <div className="mt-2 space-y-1 text-sm text-fg-muted">
      <p className="flex items-center gap-1.5">
        <Icon name="clock" className="size-3.5 shrink-0" />{" "}
        {scheduleLabel(course.schedule)} · {course.durationMin} min
      </p>
      {course.location && (
        <p className="flex items-center gap-1.5">
          <Icon name="building" className="size-3.5 shrink-0" />{" "}
          {course.location}
        </p>
      )}
      <p className="flex items-center gap-1.5">
        {course.trainer ? (
          <>
            <Avatar
              name={course.trainer.name}
              src={course.trainer.avatarUrl}
              className="size-4 text-[8px] ring-1"
            />{" "}
            {course.trainer.name}
          </>
        ) : (
          <>
            <Icon name="user" className="size-3.5 shrink-0" /> Trainer folgt
          </>
        )}
      </p>
    </div>
  );
}
