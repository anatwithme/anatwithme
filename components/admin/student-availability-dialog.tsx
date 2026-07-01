"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useState } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// 7am - 11pm, one label per hour
const TIME_LABELS = [
  "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
  "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM",
];

// Shape of a time_slot row from the DB
type TimeSlot = {
  id: number;
  day: number;
  slot_index: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  // all 112 time_slot rows from the DB
  timeSlots: TimeSlot[];
  // the slot IDs the student has already saved
  savedSlotIds: number[];
};

export function StudentAvailabilityDialog({
  open,
  onOpenChange,
  studentName,
  timeSlots,
  savedSlotIds,
}: Props) {
  const selected = new Set(savedSlotIds);

  const slotLookup: Record<string, number> = {};

  timeSlots.forEach((slot) => {
    let dayIndex = Number(slot.day);
    const slotIndex = Number(slot.slot_index);

    if (dayIndex >= 1 && dayIndex <= 7) {
      dayIndex -= 1;
    }

    let positionInDay = slotIndex - dayIndex * 16;

    if (positionInDay < 0 || positionInDay > 15) {
      if (slotIndex >= 0 && slotIndex < 112) {
        dayIndex = Math.floor(slotIndex / 16);
        positionInDay = slotIndex % 16;
      } else if (slotIndex >= 1 && slotIndex <= 112) {
        const normalizedIndex = slotIndex - 1;
        dayIndex = Math.floor(normalizedIndex / 16);
        positionInDay = normalizedIndex % 16
      }
    }

    if (dayIndex >= 0 && dayIndex < 7 && positionInDay >= 0 && positionInDay < 16) {
      slotLookup[`${dayIndex}-${positionInDay}`] = slot.id;
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[950px]">
        <DialogHeader>
          <DialogTitle>
            {studentName}&apos;s Availability
          </DialogTitle>
        </DialogHeader>

        <div className="w-full overflow-x-auto">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[72px_repeat(7,minmax(90px,1fr))] mb-1">
              <div />
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted-foreground pb-1 whitespace-nowrap"
                >
                  {day}
                </div>
              ))}
            </div>

            {TIME_LABELS.map((label, slotPosition) => (
              <div
                key={slotPosition}
                className="grid grid-cols-[72px_repeat(7,minmax(90px,1fr))]"
              >
                <div className="flex h-8 items-center justify-end pr-2 text-xs text-muted-foreground whitespace-nowrap">
                  {label}
                </div>

                {DAYS.map((_, day) => {
                  const slotId = slotLookup[`${day}-${slotPosition}`];
                  const isSelected = selected.has(slotId);

                  return (
                    <div
                      key={day}
                      className={cn(
                        "h-8 border border-border",
                        isSelected ? "bg-primary" : "bg-card",
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Highlighted cells are times this student marked as available.
        </p>
      </DialogContent>
    </Dialog>
  )
}