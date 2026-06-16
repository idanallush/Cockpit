"use client";

import { useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setThreshold } from "./actions";

export function ThresholdForm({
  projects,
}: {
  projects: Array<{ id: string; name: string }>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const res = await setThreshold(formData);
          if (res.ok) toast.success("Threshold saved");
          else toast.error(res.error);
        });
      }}
      className="grid gap-3 md:grid-cols-5"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="period">Period</Label>
        <select
          id="period"
          name="period"
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          defaultValue="monthly"
        >
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="amount_usd">Budget (USD)</Label>
        <Input
          id="amount_usd"
          name="amount_usd"
          type="number"
          step="0.01"
          min="0.01"
          required
          placeholder="25.00"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="provider">Provider</Label>
        <select
          id="provider"
          name="provider"
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          defaultValue=""
        >
          <option value="">All</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="google">Google</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="project_id">Project</Label>
        <select
          id="project_id"
          name="project_id"
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
          defaultValue=""
        >
          <option value="">All</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid items-end">
        <Button type="submit" disabled={pending}>
          <Plus className="h-4 w-4" /> {pending ? "Saving..." : "Add / Update"}
        </Button>
      </div>
    </form>
  );
}
