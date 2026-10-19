"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

/**
 * Reorderable list. Drag the handle, use the handle with Space + arrow keys,
 * or the up/down buttons. Each change is saved immediately.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  label,
}: {
  items: T[];
  onReorder: (ids: string[]) => Promise<ActionResult>;
  renderItem: (item: T) => ReactNode;
  label: string;
}) {
  const [order, setOrder] = useState(items);
  // Adopt fresh server data (after a refresh) without an extra effect pass.
  const [source, setSource] = useState(items);
  if (source !== items) {
    setSource(items);
    setOrder(items);
  }

  // Stable id so server and client render the same accessibility ids.
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function commit(next: T[]) {
    const previous = order;
    setOrder(next);
    const result = await onReorder(next.map((i) => i.id));
    if (!result.ok) {
      setOrder(previous);
      toast.error(result.error);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = order.findIndex((i) => i.id === active.id);
    const to = order.findIndex((i) => i.id === over.id);
    void commit(arrayMove(order, from, to));
  }

  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul aria-label={label} className="grid gap-2">
          {order.map((item, index) => (
            <SortableRow
              key={item.id}
              id={item.id}
              first={index === 0}
              last={index === order.length - 1}
              onMove={(delta) => void commit(arrayMove(order, index, index + delta))}
            >
              {renderItem(item)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  first,
  last,
  onMove,
  children,
}: {
  id: string;
  first: boolean;
  last: boolean;
  onMove: (delta: number) => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius)] border border-border bg-surface px-2 py-2",
        isDragging && "relative z-10 shadow-lg ring-1 ring-accent-line",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="inline-flex size-7 cursor-grab touch-none items-center justify-center rounded-[3px] text-subtle hover:bg-surface-2 hover:text-fg active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={first}
          aria-label="Move up"
          className="inline-flex h-4 w-6 items-center justify-center text-subtle hover:text-fg disabled:opacity-25"
        >
          <ChevronUp className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={last}
          aria-label="Move down"
          className="inline-flex h-4 w-6 items-center justify-center text-subtle hover:text-fg disabled:opacity-25"
        >
          <ChevronDown className="size-3.5" />
        </button>
      </div>
    </li>
  );
}
