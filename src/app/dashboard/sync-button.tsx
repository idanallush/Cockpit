"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
export function SyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="btn-binance inline-flex items-center gap-2 h-10 px-6 rounded-md text-sm"
      onClick={() => {
        startTransition(async () => {
          try {
            const res = await fetch("/api/sync", { method: "POST" });
            const data = await res.json();
            if (!res.ok) {
              toast.error(data.error ?? "Sync failed");
              return;
            }
            const openaiOk = data.openai?.success;
            const anthropicOk = data.anthropic?.success;
            const totalProcessed =
              (data.openai?.recordsProcessed ?? 0) +
              (data.anthropic?.recordsProcessed ?? 0);

            if (openaiOk && anthropicOk) {
              toast.success(`Synced ${totalProcessed} records`);
            } else {
              const messages = [
                !openaiOk && `OpenAI: ${data.openai?.error ?? "failed"}`,
                !anthropicOk && `Anthropic: ${data.anthropic?.error ?? "failed"}`,
              ].filter(Boolean);
              toast.error(messages.join(" · "));
            }
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Sync failed");
          }
        });
      }}
    >
      <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Syncing..." : "Sync Now"}
    </button>
  );
}
