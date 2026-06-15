"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteApiKey } from "./actions";

export function DeleteApiKeyButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete key "${name}"?`)) return;
        startTransition(async () => {
          const fd = new FormData();
          fd.set("id", id);
          const res = await deleteApiKey(fd);
          if (res.ok) toast.success("Key deleted");
          else toast.error(res.error);
        });
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
