"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteThreshold } from "./actions";

export function ThresholdRow({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this threshold?")) return;
        startTransition(async () => {
          const fd = new FormData();
          fd.set("id", id);
          const res = await deleteThreshold(fd);
          if (res.ok) toast.success("Deleted");
          else toast.error(res.error);
        });
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
