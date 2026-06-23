"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Props = {
  examTitle: string;
  daysUntilExam: number;
};

export default function ExamReminderBanner({ examTitle, daysUntilExam }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (daysUntilExam < 0) return null;

  const isHardReminder = daysUntilExam <= 3;

  if (dismissed && !isHardReminder) return null;

  return (
    <div
      className={`mb-6 flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
        isHardReminder
          ? "border-red-300 bg-red-50 text-red-800"
          : "border-yellow-300 bg-yellow-50 text-yellow-800"
      }`}
    >
      <p className="font-medium">
        {daysUntilExam === 0
          ? `${examTitle} is today!`
          : `${examTitle} is in ${daysUntilExam} day${daysUntilExam === 1 ? "" : "s"}!`}
      </p>
      {!isHardReminder && (
        <button
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