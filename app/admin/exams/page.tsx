import { ExamManager } from "@/components/admin/exam-manager";
import { createClient } from "@/lib/supabase/server";

export default async function ExamsPage() {
  const supabase = await createClient();

  const { data: examData, error: examError } = await supabase
    .from("exam")
    .select("*")
    .order("exam_start", { ascending: true });

  if (examError) {
    console.error("Failed to fetch exams:", examError.message);
  }

  const exams = examData ?? [];

  return (
    <div className="w-full max-w-7xl space-y-2">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold">Exams</h1>
        <p className="text-muted-foreground text-sm">
          {exams.length} {exams.length === 1 ? "exam" : "exams"} scheduled
        </p>
      </div>
      <ExamManager exams={exams} />
    </div>
  );
}