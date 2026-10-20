"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ticketDeleteCopy() {
  return {
    label: "Delete",
    title: "Delete this task?",
    description:
      "The task and its details will be removed from your board. This action cannot be undone.",
  };
}

export function TicketDeleteDialog({
  open,
  onOpenChange,
  onConfirmDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
}) {
  const copy = ticketDeleteCopy();

  function stopCardOpen(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onOpenChange(false)}>
      <DialogContent
        className="sm:max-w-md"
        onClick={stopCardOpen}
        onPointerDown={stopCardOpen}
      >
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirmDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
