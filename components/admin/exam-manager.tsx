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

type Exam = {
  id: number;
  title: string;
  exam_date: string;
  created_at: string;
};

function formatExamDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export function ExamManager({ exams }: { exams: Exam[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [createTitle, setCreateTitle] = useState("");
  const [createDate, setCreateDate] = useState("");
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");

  const resetCreateForm = () => {
    setCreateTitle("");
    setCreateDate("");
    setShowCreateForm(false);
  };

  const startEditing = (exam: Exam) => {
    setActionError(null);
    setEditingId(exam.id);
    setEditTitle(exam.title);
    setEditDate(exam.exam_date);
  };
  
  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDate("");
  };
  
  const handleUpdateExam = () => {
    if (!editingId) return;
    setActionError(null);
  
    if (!editTitle.trim() || !editDate) {
      setActionError("Title and date are required.");
      return;
    }
  
    startTransition(async () => {
      try {
        await updateExam(editingId, editTitle.trim(), editDate);
        cancelEditing();
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to update exam.",
        );
      }
    });
  };

  const handleCreateExam = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);

    if (!createTitle.trim() || !createDate) {
      setActionError("Title and date are required.");
      return;
    }

    startTransition(async () => {
      try {
        await createExam(createTitle.trim(), createDate);
        resetCreateForm();
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to create exam.",
        );
      }
    });
  };

  const handleDeleteExam = (examId: number) => {
    setActionError(null);
    setDeletingId(examId);

    startTransition(async () => {
      try {
        await deleteExam(examId);
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to delete exam.",
        );
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {actionError}
        </div>
      )}

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
              <div className="grid items-start gap-4 lg:grid-cols-[16rem_11rem]">
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
                  <Label htmlFor="exam-date">Exam date</Label>
                  <Input
                    id="exam-date"
                    type="date"
                    value={createDate}
                    onChange={(e) => setCreateDate(e.target.value)}
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
            setActionError(null);
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
                          <Input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="h-7 text-sm"
                            disabled={isPending}
                          />
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
                      {formatExamDate(exam.exam_date)}
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