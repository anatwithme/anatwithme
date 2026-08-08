"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { generateGroupCalendarEvent } from "@/app/student/(protected)/group/action";

export default function GroupCalendarDownload() {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);

    try {
      const result = await generateGroupCalendarEvent();

      const blob = new Blob([result.content], {
        type: "text/calendar;charset=utf-8",
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = result.filename;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);

      toast.success("Calendar download successful.")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create the calendar event."
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={isDownloading}
      >
        <CalendarPlus className="mr-2 h-4 w-4" />
        {isDownloading ? "Preparing..." : "Add to Calendar"}
      </Button>
    </div>
  );
}