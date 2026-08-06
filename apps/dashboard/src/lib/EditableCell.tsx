"use client"

import React, { useEffect, useState } from "react";
import {
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "najm-kit";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { flexRender } from "@tanstack/react-table";

type EditorType = "text" | "number" | "select" | "checkbox" | "textarea";

interface EditableCellProps {
  cell: any;
  onCellEdit: (row: any, columnId: string, value: any) => Promise<any> | any;
  renderCell?: any;
}

const resolve = <T,>(v: T | ((row: any) => T), row: any): T =>
  typeof v === "function" ? (v as any)(row) : v;

function EditableCell({ cell, onCellEdit, renderCell }: EditableCellProps) {
  const columnDef = cell.column.columnDef as any;
  const displayCell = renderCell ?? columnDef.cell;
  const meta = columnDef.meta || {};
  const row = cell.row.original;
  const columnId = cell.column.id;

  const editor: EditorType = meta.editor || "text";
  const initial = cell.getValue();

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<any>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setValue(initial);
  }, [initial, editing]);

  const commit = async (next: any) => {
    if (next === initial) {
      setEditing(false);
      return;
    }
    if (meta.validate) {
      const err = meta.validate(next, row);
      if (err) {
        setError(err);
        return;
      }
    }
    setError(null);
    setSaving(true);
    try {
      await onCellEdit(row, columnId, next);
      setEditing(false);
    } catch {
      setValue(initial);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setValue(initial);
    setError(null);
    setEditing(false);
  };

  // ---- non-editing display ----
  if (!editing && editor !== "checkbox" && editor !== "select") {
    return (
      <div
        className={cn(
          "min-h-8 -mx-2 px-2 py-1 rounded cursor-text",
          "hover:bg-muted/60 hover:ring-1 hover:ring-border"
        )}
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      >
        {flexRender(displayCell, cell.getContext())}
        {saving && (
          <Loader2 className="inline-block ml-2 h-3 w-3 animate-spin" />
        )}
      </div>
    );
  }

  // ---- editors ----
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  if (editor === "checkbox") {
    return (
      <div onClick={stop} className="flex items-center">
        <Checkbox
          checked={!!value}
          disabled={saving}
          onCheckedChange={(v) => {
            setValue(!!v);
            commit(!!v);
          }}
        />
        {saving && <Loader2 className="ml-2 h-3 w-3 animate-spin" />}
      </div>
    );
  }

  if (editor === "select") {
    const options: { value: any; label: string }[] =
      resolve(meta.options, row) || [];
    return (
      <div onClick={stop}>
        <Select
          value={value != null ? String(value) : ""}
          disabled={saving}
          onValueChange={(v) => {
            setValue(v);
            commit(v);
          }}
        >
          <SelectTrigger className={cn("h-8 w-full", error && "ring-2 ring-destructive")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (editor === "textarea") {
    return (
      <div onClick={stop} className="relative">
        <div className="invisible">{flexRender(displayCell, cell.getContext())}</div>
        <Textarea
          autoFocus
          value={value ?? ""}
          disabled={saving}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => commit(value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) commit(value);
          }}
          className={cn(
            "absolute inset-0 min-h-full text-sm",
            error && "ring-2 ring-destructive"
          )}
        />
        {error && <div className="text-xs text-destructive absolute -bottom-4 left-0">{error}</div>}
      </div>
    );
  }

  // text / number
  return (
    <div onClick={stop} className="relative w-full">
      <div className="invisible truncate">{flexRender(displayCell, cell.getContext())}</div>
      <Input
        autoFocus
        type={editor === "number" ? "number" : "text"}
        value={value ?? ""}
        disabled={saving}
        min={editor === "number" ? resolve(meta.min, row) : undefined}
        max={editor === "number" ? resolve(meta.max, row) : undefined}
        step={editor === "number" ? meta.step ?? "any" : undefined}
        onChange={(e) =>
          setValue(
            editor === "number"
              ? e.target.value === ""
                ? null
                : Number(e.target.value)
              : e.target.value
          )
        }
        onBlur={() => commit(value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(value);
          } else if (e.key === "Escape") {
            cancel();
          }
        }}
        className={cn(
          "absolute inset-0 h-full w-full px-2 text-sm",
          error && "ring-2 ring-destructive"
        )}
      />
      {saving && (
        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin" />
      )}
      {error && <div className="text-xs text-destructive absolute -bottom-4 left-0 whitespace-nowrap">{error}</div>}
    </div>
  );
}

export default EditableCell;
