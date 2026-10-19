"use client";

import { RefreshCw } from "lucide-react";

import { useAction } from "@/components/admin/use-entity-form";
import { Button } from "@/components/ui/button";
import { refreshPublicSite } from "@/server/actions/admin/settings";

export function RefreshPublicSiteButton() {
  const { run, pending } = useAction();
  return (
    <Button disabled={pending} onClick={() => run(() => refreshPublicSite())}>
      <RefreshCw /> Refresh public site
    </Button>
  );
}
