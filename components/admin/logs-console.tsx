"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { SystemLog } from "@/types/database";

const LEVEL_STYLE: Record<SystemLog["level"], string> = {
  INFO: "text-live",
  WARN: "text-warn",
  ERROR: "text-red-400",
};

const MAX_LOGS = 200;

/**
 * Console de logs em tempo real (abas INFO/WARN/ERROR) via Supabase Realtime.
 */
export function LogsConsole({ initial }: { initial: SystemLog[] }) {
  const [logs, setLogs] = useState<SystemLog[]>(initial);
  const [filter, setFilter] = useState<SystemLog["level"] | "ALL">("ALL");
  const [live, setLive] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_logs" },
        (payload) => {
          setLogs((prev) => [payload.new as SystemLog, ...prev].slice(0, MAX_LOGS));
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const visible = filter === "ALL" ? logs : logs.filter((l) => l.level === filter);

  return (
    <section className="panel">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">
          Logs{" "}
          <span className={cn("tag ml-1", live ? "text-live" : "text-warn")}>
            {live ? "ao vivo" : "conectando…"}
          </span>
        </h2>
        <div className="flex gap-1.5">
          {(["ALL", "INFO", "WARN", "ERROR"] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setFilter(level)}
              className={cn(
                "btn-ghost !px-2.5 !py-1 !text-xs",
                filter === level && "border-gold text-gold",
              )}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto rounded-lg border border-line bg-black/40 p-3 font-mono text-xs leading-relaxed">
        {visible.length === 0 ? (
          <p className="text-muted">Sem logs.</p>
        ) : (
          visible.map((log) => (
            <div key={log.id} className="flex gap-2">
              <span className="shrink-0 text-muted">
                {new Date(log.created_at).toLocaleTimeString("pt-BR")}
              </span>
              <span className={cn("shrink-0 font-bold", LEVEL_STYLE[log.level])}>
                [{log.level}]
              </span>
              <span className="shrink-0 text-gold">{log.source}</span>
              <span className="break-all text-foreground/90">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
