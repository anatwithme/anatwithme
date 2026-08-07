"use client";

import { CalendarPlus, Trash2, Pencil, Check, X } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExam, deleteExam, updateExam } from "@/app/admin/exams/action";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type Exam = {
  id: number;
  title: string;
  exam_start: string;
  exam_end: string;
  created_at: string;
};

function formatExamRange(start: string, end: string) {
    const s = new Date(`${start}T00:00:00`);
    const e = new Date(`${end}T00:00:00`);
    const fmt = new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit", year: "numeric" });
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return start;
    return `${fmt.format(s)} – ${fmt.format(e)}`;
  }

export function ExamManager({ exams }: { exams: Exam[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [createTitle, setCreateTitle] = useState("");
  const [createStart, setCreateStart] = useState("");
  const [createEnd, setCreateEnd] = useState("");
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  const resetCreateForm = () => {
    setCreateTitle("");
    setCreateStart("");
    setCreateEnd("");
    setShowCreateForm(false);
  };

  const startEditing = (exam: Exam) => {
    setEditingId(exam.id);
    setEditTitle(exam.title);
    setEditStart(exam.exam_start);
    setEditEnd(exam.exam_end);
  };
  
  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
    setEditStart("");
    setEditEnd("");
  };
  
  const handleUpdateExam = () => {
    if (!editingId) return;
  
    if (!editTitle.trim() || !editStart || !editEnd) {
      toast.error("Title and date are required.");
      return;
    }
  
    startTransition(async () => {
      try {
        await updateExam(editingId, editTitle.trim(), editStart, editEnd);
        cancelEditing();
        toast.success("Exam updated successfully.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update exam.",
        );
      }
    });
  };

  const handleCreateExam = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!createTitle.trim() || !createStart || !createEnd) {
      toast.error("Title and date are required.");
      return;
    }

    startTransition(async () => {
      try {
        await createExam(createTitle.trim(), createStart, createEnd);
        resetCreateForm();
        toast.success("Exam created successfully.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create exam.",
        );
      }
    });
  };

  const handleDeleteExam = (examId: number) => {
    setDeletingId(examId);

    startTransition(async () => {
      try {
        await deleteExam(examId);
        toast.success("Exam deleted successfully.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete exam.",
        );
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      {showCreateForm ? (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>New exam</CardTitle>
            <CardDescription>
              Students will see a reminder as this date approaches.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateExam} className="space-y-4">
              <div className="grid items-start gap-4 lg:grid-cols-[16rem_11rem_11rem]">
                <div className="grid gap-2">
                  <Label htmlFor="exam-title">Title</Label>
                  <Input
                    id="exam-title"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g. Exam 1"
                    required
                    disabled={isPending}
                  />
                </div>
            <div className="grid gap-2">
                <Label htmlFor="exam-start">Exam start</Label>
                <Input
                    id="exam-start"
                    type="date"
                    value={createStart}
                    onChange={(e) => setCreateStart(e.target.value)}
                    required
                    disabled={isPending}
                />
                </div>
                    <div className="grid gap-2">
                    <Label htmlFor="exam-end">Exam end</Label>
                    <Input
                        id="exam-end"
                        type="date"
                        value={createEnd}
                        onChange={(e) => setCreateEnd(e.target.value)}
                        required
                        disabled={isPending}
                    />
                    </div>
                </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating..." : "Create exam"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetCreateForm}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          onClick={() => {
            setShowCreateForm(true);
          }}
        >
          <CalendarPlus className="size-4" />
          Add exam
        </Button>
      )}

      <div className="border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/100">
              <TableHead className="px-4">Title</TableHead>
              <TableHead className="px-4">Exam date</TableHead>
              <TableHead className="px-4 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No exams scheduled yet.
                </TableCell>
              </TableRow>
            ) : (
              exams.map((exam) => {
                const isDeleting = deletingId === exam.id;
                const isEditing = editingId === exam.id;

                if (isEditing) {
                    return (
                      <TableRow key={exam.id} className="bg-muted/40">
                        <TableCell className="px-4">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="h-7 text-sm"
                            disabled={isPending}
                            autoFocus
                          />
                        </TableCell>
                        <TableCell className="px-4">
                          <div className="flex gap-2">
                            <Input
                              type="date"
                              value={editStart}
                              onChange={(e) => setEditStart(e.target.value)}
                              className="h-7 text-sm"
                              disabled={isPending}
                            />
                            <Input
                              type="date"
                              value={editEnd}
                              onChange={(e) => setEditEnd(e.target.value)}
                              className="h-7 text-sm"
                              disabled={isPending}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="px-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={handleUpdateExam}
                              disabled={isPending}
                            >
                              <Check className="h-4 w-4" />
                              <span className="sr-only">Save</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={cancelEditing}
                              disabled={isPending}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Cancel</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                return (
                  <TableRow key={exam.id} className={isDeleting ? "opacity-50" : ""}>
                    <TableCell className="px-4 font-medium">{exam.title}</TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {formatExamRange(exam.exam_start, exam.exam_end)}
                    </TableCell>
                    <TableCell className="px-4 text-right">
                    <div className="flex justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={isPending || isDeleting}
                        onClick={() => startEditing(exam)}
                    >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                    </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={isPending || isDeleting}
                        onClick={() => handleDeleteExam(exam.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}