"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
  destructive?: boolean;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  cancelText = "Cancel",
  destructive = false,
  disabled = false,
  onCancel,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !disabled) onCancel();
      }}
    >
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => {
          if (disabled) event.preventDefault();
        }}
        onInteractOutside={(event) => event.preventDefault()}
        className="flex max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-xl flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl"
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 border-b px-5 py-4">
          <div className="space-y-1">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          {children}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={onCancel}
            >
              {cancelText}
            </Button>

            <Button
              type="button"
              variant={destructive ? "destructive" : "default"}
              disabled={disabled}
              onClick={onConfirm}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
