"use client";

import { useTransition } from "react";
import { Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markAlertRead, markAllAlertsRead } from "./actions";

export function AlertActions({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const fd = new FormData();
          fd.set("id", id);
          const res = await markAlertRead(fd);
          if (!res.ok) toast.error(res.error);
        });
      }}
    >
      <Check className="h-3.5 w-3.5" /> Read
    </Button>
  );
}

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const res = await markAllAlertsRead();
          if (res.ok) toast.success("All marked read");
          else toast.error(res.error);
        });
      }}
    >
      <CheckCheck className="h-4 w-4" /> Mark all read
    </Button>
  );
}
