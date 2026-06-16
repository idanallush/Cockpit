"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function HealthCheckButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            const res = await fetch("/api/health", { method: "POST" });
            const data = await res.json();
            if (!res.ok) {
              toast.error(data.error ?? "Health check failed");
              return;
            }
            type HealthResult = { provider: string; ok: boolean; latency_ms: number };
            const lines = (data.results as HealthResult[])
              .map((r) => `${r.provider}: ${r.ok ? "ok" : "error"} (${r.latency_ms}ms)`)
              .join(" · ");
            const allOk = (data.results as HealthResult[]).every((r) => r.ok);
            if (allOk) toast.success(lines);
            else toast.error(lines);
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Network error");
          }
        });
      }}
    >
      <Stethoscope className={`h-4 w-4 ${pending ? "animate-pulse" : ""}`} />
      {pending ? "Checking..." : "Run health check"}
    </Button>
  );
}
