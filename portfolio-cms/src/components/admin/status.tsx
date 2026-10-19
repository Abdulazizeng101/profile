import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: "draft" | "published" }) {
  return status === "published" ? (
    <Badge tone="success">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> Published
    </Badge>
  ) : (
    <Badge tone="neutral">Draft</Badge>
  );
}

export function ArabicBadge({ present }: { present: boolean }) {
  return present ? null : <Badge tone="warning">No Arabic</Badge>;
}
