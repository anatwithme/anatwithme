"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
          <table className="w-full min-w-[820px] table-fixed border-collapse">
            <caption className="sr-only">
              {studentName}&apos;s weekly availability. Days are columns and times are rows.
              Each cell states whether the student is available.
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="h-8 w-[72px] pr-2 text-right text-xs font-medium text-muted-foreground"
                >
                  Time
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    scope="col"
                    className="h-8 pb-1 text-center text-xs font-medium text-muted-foreground whitespace-nowrap"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_LABELS.map((label, slotPosition) => (
                <tr key={slotPosition}>
                  <th
                    scope="row"
                    className="h-8 pr-2 text-right text-xs font-normal text-muted-foreground whitespace-nowrap"
                  >
                    {label}
                  </th>

                  {DAYS.map((dayLabel, day) => {
                    const slotId = slotLookup[`${day}-${slotPosition}`];
                    const isSelected = selected.has(slotId);

                    return (
                      <td
                        key={dayLabel}
                        className={cn(
                          "h-8 border border-border text-center text-xs font-medium",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-card text-muted-foreground",
                        )}
                      >
                        <span aria-hidden="true">{isSelected ? "✓" : "—"}</span>
                        <span className="sr-only">
                          {isSelected ? "Available" : "Not available"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          Check marks show times this student marked as available; dashes show unavailable times.
        </p>
      </DialogContent>
    </Dialog>
  )
}
