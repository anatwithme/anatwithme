"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { generateGroupCalendarEvent } from "@/app/student/(protected)/group/action";

export default function GroupCalendarDownload() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setIsDownloading(true);
    setError(null);

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
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create the calendar event.");
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
        {isDownloading ? "Preparing..." : "Add to calendar"}
      </Button>

      {error ? (
        <p className="mt-2 text-sm text-destructive">
            {error}
        </p>
      ) : null}
    </div>
  );
}