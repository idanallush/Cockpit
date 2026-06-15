"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject } from "./actions";

export function NewProjectDialog({
  openaiSuggestions,
  anthropicSuggestions,
}: {
  openaiSuggestions: string[];
  anthropicSuggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Map OpenAI projects and Anthropic workspaces to attribute usage.
          </DialogDescription>
        </DialogHeader>
        <form
          action={(formData) => {
            startTransition(async () => {
              const res = await createProject(formData);
              if (res.ok) {
                toast.success("Project created");
                setOpen(false);
              } else {
                toast.error(res.error);
              }
            });
          }}
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" name="description" maxLength={500} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="openai_project_ids">OpenAI Project IDs (comma or space separated)</Label>
            <Input
              id="openai_project_ids"
              name="openai_project_ids"
              list="openai-project-suggestions"
              placeholder="proj_AbC..."
            />
            <datalist id="openai-project-suggestions">
              {openaiSuggestions.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="anthropic_workspace_ids">Anthropic Workspace IDs (comma or space separated)</Label>
            <Input
              id="anthropic_workspace_ids"
              name="anthropic_workspace_ids"
              list="anthropic-workspace-suggestions"
              placeholder="wrkspc_..."
            />
            <datalist id="anthropic-workspace-suggestions">
              {anthropicSuggestions.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
