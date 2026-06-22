"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type Row = {
  date: string;
  provider: "openai" | "anthropic" | "google";
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  requests_count: number | null;
  cost_usd: number;
  project_id: string | null;
};

type SortKey =
  | "date"
  | "provider"
  | "model"
  | "input_tokens"
  | "output_tokens"
  | "requests_count"
  | "cost_usd"
  | "project";

function fmtUSD(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function fmtInt(n: number | null | undefined) {
  return (n ?? 0).toLocaleString("en-US");
}

function providerColor(p: "openai" | "anthropic" | "google") {
  if (p === "openai") return "#0ecb81";
  if (p === "anthropic") return "#FCD535";
  return "#3b82f6";
}

function SortableHeader({
  label,
  k,
  sortKey,
  dir,
  onClick,
  align,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  dir: "asc" | "desc";
  onClick: (k: SortKey) => void;
  align?: "right";
}) {
  const Icon =
    sortKey !== k ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1 hover:text-foreground ${
          align === "right" ? "ml-auto" : ""
        }`}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </TableHead>
  );
}

export function UsageTable({
  rows,
  projectNameById,
}: {
  rows: Row[];
  projectNameById: Record<string, string>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const sign = dir === "asc" ? 1 : -1;
    const arr = [...rows];
    arr.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "date":
          av = a.date;
          bv = b.date;
          break;
        case "provider":
          av = a.provider;
          bv = b.provider;
          break;
        case "model":
          av = a.model ?? "";
          bv = b.model ?? "";
          break;
        case "input_tokens":
          av = Number(a.input_tokens ?? 0);
          bv = Number(b.input_tokens ?? 0);
          break;
        case "output_tokens":
          av = Number(a.output_tokens ?? 0);
          bv = Number(b.output_tokens ?? 0);
          break;
        case "requests_count":
          av = Number(a.requests_count ?? 0);
          bv = Number(b.requests_count ?? 0);
          break;
        case "cost_usd":
          av = Number(a.cost_usd);
          bv = Number(b.cost_usd);
          break;
        case "project":
          av = a.project_id ? (projectNameById[a.project_id] ?? "") : "zzz";
          bv = b.project_id ? (projectNameById[b.project_id] ?? "") : "zzz";
          break;
      }
      if (av < bv) return -1 * sign;
      if (av > bv) return 1 * sign;
      return 0;
    });
    return arr;
  }, [rows, sortKey, dir, projectNameById]);

  const toggle = (k: SortKey) => {
    if (k === sortKey) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setDir(k === "date" || k === "cost_usd" ? "desc" : "asc");
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader label="Date" k="date" sortKey={sortKey} dir={dir} onClick={toggle} />
          <SortableHeader label="Provider" k="provider" sortKey={sortKey} dir={dir} onClick={toggle} />
          <SortableHeader label="Model" k="model" sortKey={sortKey} dir={dir} onClick={toggle} />
          <SortableHeader label="Project" k="project" sortKey={sortKey} dir={dir} onClick={toggle} />
          <SortableHeader label="Input" k="input_tokens" sortKey={sortKey} dir={dir} onClick={toggle} align="right" />
          <SortableHeader label="Output" k="output_tokens" sortKey={sortKey} dir={dir} onClick={toggle} align="right" />
          <SortableHeader label="Requests" k="requests_count" sortKey={sortKey} dir={dir} onClick={toggle} align="right" />
          <SortableHeader label="Cost" k="cost_usd" sortKey={sortKey} dir={dir} onClick={toggle} align="right" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r, i) => (
          <TableRow
            key={`${r.date}-${r.provider}-${r.model ?? "x"}-${r.project_id ?? "n"}-${i}`}
          >
            <TableCell>{format(new Date(r.date), "MMM d")}</TableCell>
            <TableCell>
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                style={{ color: providerColor(r.provider) }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: providerColor(r.provider) }}
                />
                {r.provider}
              </span>
            </TableCell>
            <TableCell className="num text-xs">{r.model ?? "—"}</TableCell>
            <TableCell className="text-sm">
              {r.project_id ? (
                projectNameById[r.project_id] ?? "—"
              ) : (
                <span className="text-[color:var(--muted-tone)]">Unassigned</span>
              )}
            </TableCell>
            <TableCell className="text-right num">{fmtInt(r.input_tokens)}</TableCell>
            <TableCell className="text-right num">{fmtInt(r.output_tokens)}</TableCell>
            <TableCell className="text-right num">{fmtInt(r.requests_count)}</TableCell>
            <TableCell className="text-right num font-semibold text-yellow">
              {fmtUSD(Number(r.cost_usd))}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
