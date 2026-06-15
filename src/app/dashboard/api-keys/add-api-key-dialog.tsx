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
import { addApiKey } from "./actions";

type Project = { id: string; name: string };

export function AddApiKeyDialog({ projects }: { projects: Project[] }) {
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Add Key
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add API Key</DialogTitle>
          <DialogDescription>
            The key value is encrypted with AES-256-GCM before storage.
          </DialogDescription>
        </DialogHeader>
        <form
          action={(formData) => {
            startTransition(async () => {
              const res = await addApiKey(formData);
              if (res.ok) {
                toast.success("Key added");
                setOpen(false);
                setIsAdmin(false);
              } else {
                toast.error(res.error);
              }
            });
          }}
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="provider">Provider</Label>
            <select
              id="provider"
              name="provider"
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
              required
              defaultValue="openai"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Main OpenAI Admin Key"
              required
              maxLength={120}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project_id">Project</Label>
            <select
              id="project_id"
              name="project_id"
              className="h-9 rounded-md border bg-transparent px-3 text-sm disabled:opacity-50"
              defaultValue=""
              disabled={isAdmin}
            >
              <option value="">None — Admin / Org Level</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_admin_key"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
            />
            This is an admin / org-level key
          </label>
          <div className="grid gap-2">
            <Label htmlFor="key_value">Key value</Label>
            <Input
              id="key_value"
              name="key_value"
              type="password"
              required
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
