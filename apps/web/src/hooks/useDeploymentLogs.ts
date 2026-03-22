"use client";

import { useEffect, useState } from "react";
import type { BuildLogLineDto, DeploymentStatus } from "@launchpad/types";

import { getDeploymentLogs } from "@/lib/api";
import { getSocket } from "@/lib/socket";

type LogLineEvent = {
  deploymentId: string;
  line: BuildLogLineDto;
};

type StatusEvent = {
  deploymentId: string;
  status: DeploymentStatus;
};

export function useDeploymentLogs({
  deploymentId,
  initialStatus
}: {
  deploymentId: string | null;
  initialStatus: DeploymentStatus | null;
}) {
  const [logs, setLogs] = useState<BuildLogLineDto[]>([]);
  const [status, setStatus] = useState<DeploymentStatus | null>(initialStatus);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (!deploymentId) {
      setLogs([]);
      setIsLive(false);
      return undefined;
    }

    const currentDeploymentId = deploymentId;
    let cancelled = false;
    setLogs([]);
    setIsLive(false);

    async function loadLogs() {
      try {
        const existingLogs = await getDeploymentLogs(currentDeploymentId);

        if (!cancelled) {
          setLogs(existingLogs);
        }
      } catch {
        if (!cancelled) {
          setLogs([]);
        }
      }
    }

    void loadLogs();

    const socket = getSocket();

    const handleConnect = () => {
      setIsLive(true);
      socket.emit("join-deployment", currentDeploymentId);
    };

    const handleDisconnect = () => {
      setIsLive(false);
    };

    const handleLogLine = (event: LogLineEvent) => {
      if (event.deploymentId !== currentDeploymentId) {
        return;
      }

      setLogs((current) => [...current, event.line]);
    };

    const handleStatus = (event: StatusEvent) => {
      if (event.deploymentId !== currentDeploymentId) {
        return;
      }

      setStatus(event.status);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("log-line", handleLogLine);
    socket.on("deployment-status", handleStatus);

    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      cancelled = true;
      socket.emit("leave-deployment", currentDeploymentId);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("log-line", handleLogLine);
      socket.off("deployment-status", handleStatus);
    };
  }, [deploymentId]);

  return {
    logs,
    status,
    isLive
  };
}
