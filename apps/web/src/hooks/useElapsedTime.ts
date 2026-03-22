"use client";

import { useEffect, useState } from "react";

import { getDeploymentDuration } from "@/lib/format";

export function useElapsedTime({
  startedAt,
  completedAt,
  live = false
}: {
  startedAt: string | null;
  completedAt: string | null;
  live?: boolean;
}) {
  const [duration, setDuration] = useState<number | null>(() =>
    getDeploymentDuration({
      startedAt,
      completedAt
    })
  );

  useEffect(() => {
    setDuration(
      getDeploymentDuration({
        startedAt,
        completedAt
      })
    );

    if (!live || !startedAt || completedAt) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setDuration(
        getDeploymentDuration({
          startedAt,
          completedAt
        })
      );
    }, 1_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [completedAt, live, startedAt]);

  return duration;
}
