"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Props = {
  examTitle: string;
  examStart: string;
  examEnd: string;
};

export default function ExamReminderBanner({ examTitle, examStart, examEnd }: Props) {
  const [dismissed, setDismissed] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(`${examStart}T00:00:00`);
  const end = new Date(`${examEnd}T00:00:00`);

  
  if (today > end) return null;

  const isExamWeek = today >= start && today <= end;
  const daysUntilStart = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isUpcoming = daysUntilStart > 0 && daysUntilStart <= 14;

  //only show if exam week or within 2 weeks
  if (!isExamWeek && !isUpcoming) return null;

  if (dismissed && !isExamWeek) return null;

  return (
    <div
      className={`mb-6 flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
        isExamWeek
          ? "border-red-300 bg-red-50 text-red-800"
          : "border-yellow-300 bg-yellow-50 text-yellow-800"
      }`}
    >
      <p className="font-medium">
        {isExamWeek
          ? `${examTitle} is this week!`
          : `${examTitle} is in ${daysUntilStart} day${daysUntilStart === 1 ? "" : "s"}.`}
      </p>
      {!isExamWeek && (
        <button
          style={{ cursor: "pointer" }}
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="ml-4 text-yellow-700 hover:text-yellow-900"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}