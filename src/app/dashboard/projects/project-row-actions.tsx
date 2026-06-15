"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteProject, updateProject } from "./actions";

export function ProjectRowActions({
  id,
  name,
  description,
  openaiIds,
  anthropicIds,
  openaiSuggestions,
  anthropicSuggestions,
}: {
  id: string;
  name: string;
  description: string;
  openaiIds: string[];
  anthropicIds: string[];
  openaiSuggestions: string[];
  anthropicSuggestions: string[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              if (!confirm(`Delete project "${name}"? This will also delete its API keys and usage records.`)) return;
              startTransition(async () => {
                const fd = new FormData();
                fd.set("id", id);
                const res = await deleteProject(fd);
                if (res.ok) toast.success("Project deleted");
                else toast.error(res.error);
              });
            }}
            disabled={pending}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Adjust name, description, and provider ID mappings.
            </DialogDescription>
          </DialogHeader>
          <form
            action={(formData) => {
              startTransition(async () => {
                const res = await updateProject(formData);
                if (res.ok) {
                  toast.success("Saved");
                  setEditOpen(false);
                } else {
                  toast.error(res.error);
                }
              });
            }}
            className="grid gap-4"
          >
            <input type="hidden" name="id" value={id} />
            <div className="grid gap-2">
              <Label htmlFor={`name-${id}`}>Name</Label>
              <Input id={`name-${id}`} name="name" defaultValue={name} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`desc-${id}`}>Description</Label>
              <Input id={`desc-${id}`} name="description" defaultValue={description} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`oa-${id}`}>OpenAI Project IDs</Label>
              <Input
                id={`oa-${id}`}
                name="openai_project_ids"
                defaultValue={openaiIds.join(", ")}
                list={`oa-list-${id}`}
                placeholder="proj_..."
              />
              <datalist id={`oa-list-${id}`}>
                {openaiSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`an-${id}`}>Anthropic Workspace IDs</Label>
              <Input
                id={`an-${id}`}
                name="anthropic_workspace_ids"
                defaultValue={anthropicIds.join(", ")}
                list={`an-list-${id}`}
                placeholder="wrkspc_..."
              />
              <datalist id={`an-list-${id}`}>
                {anthropicSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
