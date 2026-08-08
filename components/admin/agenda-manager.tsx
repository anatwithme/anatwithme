"use client";

import {
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  ExternalLink,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FormEvent, Fragment, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createAgenda,
  deleteAgenda,
  copyAgenda,
  updateAgenda,
  reorderAgendas,
  toggleAgenda,
  applyDatesToActiveAgendas,
} from "@/app/admin/agendas/action";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

type Task = {
  id: number;
  section_id: number;
  title: string;
  description: string | null;
  link: string | null;
  order: number | null;
};

type SectionType = "solo" | "group";

type Section = {
  id: number;
  agenda_id: number;
  title: string;
  description: string | null;
  type: SectionType;
  order: number | null;
  tasks?: Task[];
};

type Agenda = {
  id: number;
  title: string;
  description: string | null;
  week: number | null;
  start_date: string;
  end_date: string;
  enabled: boolean;
  sections?: Section[];
  unitValue: number | null;
};

function formatAgendaDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function SortableAgendaRow({
  agendaId, 
  children
}: {
  agendaId: number; 
  children: (props: {
    setNodeRef: (node: HTMLElement | null) => void;
    style: React.CSSProperties;
    attributes: ReturnType<typeof useSortable>["attributes"];
    listeners: ReturnType<typeof useSortable>["listeners"];
  }) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: agendaId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return <>{children({ setNodeRef, style, attributes, listeners })}</>;
}

export function AgendaManager({ agendas }: { agendas: Agenda[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createWeek, setCreateWeek] = useState("");
  const [createStartDate, setCreateStartDate] = useState("");
  const [createEndDate, setCreateEndDate] = useState("");
  const [createUnitValue, setCreateUnitValue] = useState("1");

  const [expandedAgendaIds, setExpandedAgendaIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [editingAgendaId, setEditingAgendaId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editWeek, setEditWeek] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editUnitValue, setEditUnitValue] = useState("1");

  const [agendaItems, setAgendaItems] = useState(agendas);
  useEffect(() => {
    setAgendaItems(agendas);
  }, [agendas]);

  const [copyingId, setCopyingId] = useState<number | null>(null);

  const [semesterStartDate, setSemesterStartDate] = useState("");
  const [semesterEndDate, setSemesterEndDate] = useState("");

  const resetCreateForm = () => {
    setCreateTitle("");
    setCreateDescription("");
    setCreateWeek("");
    setCreateStartDate("");
    setCreateEndDate("");
    setCreateUnitValue("1");
    setShowCreateForm(false);
  };

  const beginEdit = (agenda: Agenda) => {
    setEditingAgendaId(agenda.id);
    setEditTitle(agenda.title);
    setEditDescription(agenda.description ?? "");
    setEditWeek(String(agenda.week ?? "N/A"));
    setEditStartDate(agenda.start_date);
    setEditEndDate(agenda.end_date);
    setEditUnitValue(String(agenda.unitValue ?? 1));
  };

  const cancelEdit = () => {
    setEditingAgendaId(null);
    setEditTitle("");
    setEditDescription("");
    setEditWeek("");
    setEditStartDate("");
    setEditEndDate("");
    setEditUnitValue("1");
  };

  const handleCreateAgenda = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedWeek = Number.parseInt(createWeek, 10);
    if (!Number.isInteger(parsedWeek) || parsedWeek <= 0) {
      toast.error("Week must be a positive integer.");
      return;
    }
    if (!createStartDate || !createEndDate) {
      toast.error("Start date and end date are required.");
      return;
    }

    const parsedUnitValue = Number.parseInt(createUnitValue, 10);
    if (
      !Number.isInteger(parsedUnitValue) ||
      parsedUnitValue < 1 ||
      parsedUnitValue > 5
    ) {
      toast.error("Unit value must be an integer between 1 and 5.");
      return;
    }

    startTransition(async () => {
      try {
        await createAgenda(
          createTitle.trim(),
          createDescription.trim() || null,
          parsedWeek,
          createStartDate,
          createEndDate,
          parsedUnitValue,
        );
        resetCreateForm();
        toast.success("Agenda created successfully.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create agenda.",
        );
      }
    });
  };

  const handleUpdateAgenda = (agendaId: number) => {

    const parsedWeek = Number.parseInt(editWeek, 10);
    if (!Number.isInteger(parsedWeek) || parsedWeek <= 0) {
      toast.error("Week must be a positive integer.");
      return;
    }
    if (!editStartDate || !editEndDate) {
      toast.error("Start date and end date are required.");
      return;
    }

    const parsedUnitValue = Number.parseInt(editUnitValue, 10);
    if (
      !Number.isInteger(parsedUnitValue) ||
      parsedUnitValue < 1 ||
      parsedUnitValue > 5
    ) {
      toast.error("Unit value must be an integer between 1 and 5.");
      return;
    }

    startTransition(async () => {
      try {
        await updateAgenda(
          agendaId,
          editTitle.trim(),
          editDescription.trim() || null,
          parsedWeek,
          editStartDate,
          editEndDate,
          parsedUnitValue,
        );
        cancelEdit();
        toast.success("Agenda updated successfully.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update agenda.",
        );
      }
    });
  };

  const handleDeleteAgenda = (agendaId: number) => {
    setDeletingId(agendaId);

    startTransition(async () => {
      try {
        await deleteAgenda(agendaId);
        if (editingAgendaId === agendaId) cancelEdit();
        toast.success("Agenda deleted successfully.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete agenda.",
        );
      } finally {
        setDeletingId(null);
      }
    });
  };

  const handleCopyAgenda = (agendaId: number) => {
    setCopyingId(agendaId);

    startTransition(async () => {
      try {
        await copyAgenda(agendaId);
        toast.success("Agenda copied successfully.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to copy agenda.",
        );
      } finally {
        setCopyingId(null);
      }
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = agendaItems.findIndex((agenda) => agenda.id === active.id);
    const newIndex = agendaItems.findIndex((agenda) => agenda.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(agendaItems, oldIndex, newIndex).map(
      (agenda, index) => ({
        ...agenda,
        week: index + 1,
      }),
    );

    setAgendaItems(reordered);

    startTransition(async () => {
      try {
        await reorderAgendas(
          reordered.map((agenda) => ({
            id: agenda.id,
            week: agenda.week,
            enabled: agenda.enabled,
          })),
        );
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to reorder agendas.",
        );
      }
    });
  };

  const handleApplySemesterDates = () => {
    if (!semesterStartDate || !semesterEndDate) {
      toast.error("Semester start and end dates are both required.");
      return;
    }

    startTransition(async () => {
      try {
        await applyDatesToActiveAgendas(semesterStartDate, semesterEndDate);
        toast.success("Semester dates applied successfully.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to apply semester dates.",
        );
      }
    });
  };

  function getDisplayWeek(agendas: Agenda[], agendaId: number) {
    const index = agendas
        .filter((agenda) => agenda.enabled)
        .findIndex((agenda) => agenda.id === agendaId);

    return index === -1 ? null : index + 1;
  }

  function addDays(dateString: string, days: number) {
    const date = new Date(`${dateString}T00:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-none">
        <CardHeader>
          <CardTitle>Automatic Date Adjuster</CardTitle>
          <CardDescription>
            Apply weekly date ranges to active agendas. This will update
            all active agenda dates once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid items-end gap-4 md:grid-cols-[11rem_11rem_auto]">
            <div className="grid gap-2">
              <Label htmlFor="semester-start-date">Semester Start</Label>
              <Input
                id="semester-start-date"
                type="date"
                value={semesterStartDate}
                max={semesterEndDate ? addDays(semesterEndDate, -1) : undefined}
                onChange={(e) => setSemesterStartDate(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="semester-end-date">Semester End</Label>
              <Input
                id="semester-end-date"
                type="date"
                value={semesterEndDate}
                min={semesterStartDate ? addDays(semesterStartDate, 1) : undefined}
                onChange={(e) => setSemesterEndDate(e.target.value)}
                disabled={isPending}
              />
            </div>

            <Button
              type="button"
              onClick={handleApplySemesterDates}
              disabled={isPending || !semesterStartDate || !semesterEndDate}
            >
              {isPending ? "Applying..." : "Apply to Active Agendas"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Collapsible create form */}
      {showCreateForm ? (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle>New agenda</CardTitle>
            <CardDescription>
              Each week can only have one agenda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAgenda} className="space-y-4">
              <div className="grid items-start gap-4 lg:grid-cols-[4rem_16rem_11rem_11rem_4rem_1fr]">
                <div className="grid gap-2">
                  <Label htmlFor="agenda-week">Week</Label>
                  <Input
                    id="agenda-week"
                    type="number"
                    min={1}
                    value={createWeek}
                    onChange={(e) => setCreateWeek(e.target.value)}
                    placeholder="1"
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="agenda-title">Title</Label>
                  <Input
                    id="agenda-title"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="e.g. Midterm 1 Review"
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="agenda-start-date">Start date</Label>
                  <Input
                    id="agenda-start-date"
                    type="date"
                    value={createStartDate}
                    onChange={(e) => setCreateStartDate(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="agenda-end-date">End date</Label>
                  <Input
                    id="agenda-end-date"
                    type="date"
                    value={createEndDate}
                    onChange={(e) => setCreateEndDate(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="agenda-unit-value">Unit</Label>
                  <Input
                    id="agenda-unit-value"
                    type="number"
                    min={1}
                    max={5}
                    value={createUnitValue}
                    onChange={(e) => setCreateUnitValue(e.target.value)}
                    required
                    disabled={isPending}
                    className="h-10 min-w-[4rem]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="agenda-description">
                    Description{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <textarea
                    id="agenda-description"
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="e.g. Review the topics covered this week (Chapters 1-3)"
                    disabled={isPending}
                    rows={1}
                    className="flex min-h-9.5 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating..." : "Create agenda"}
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
          Add agenda
        </Button>
      )}

      {/* Agenda table */}
      <DndContext id="agenda-dnd" collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="border">
          <Table>
            <colgroup>
              <col className="w-10" />
              <col className="w-10" />
              <col className="w-10" />
              <col className="w-[5rem]" />
              <col className="w-[16rem]" />
              <col className="w-[10rem]" />
              <col className="w-[10rem]" />
              <col className="w-[8rem]" />
              <col />
              <col className="w-14" />
            </colgroup>
            <TableHeader>
              <TableRow className="bg-muted/100">
                <TableHead className="w-10 px-4" aria-label="Drag" />
                <TableHead className="w-10 px-4">Enabled</TableHead>
                <TableHead className="w-10 px-4" aria-label="Expand" />
                <TableHead className="px-4">Week</TableHead>
                <TableHead className="px-4">Title</TableHead>
                <TableHead className="px-4">Start date</TableHead>
                <TableHead className="px-4">End date</TableHead>
                <TableHead className="px-4">Unit</TableHead>
                <TableHead className="px-4">Description</TableHead>
                <TableHead className="px-4 text-right">
                  {agendaItems.length > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="-mr-2"
                      onClick={() => {
                        const allExpanded =
                          expandedAgendaIds.size === agendaItems.length;
                        if (allExpanded) {
                          setExpandedAgendaIds(new Set());
                        } else {
                          setExpandedAgendaIds(new Set(agendaItems.map((a) => a.id)));
                        }
                      }}
                    >
                      {expandedAgendaIds.size === agendaItems.length ? (
                        <>
                          <ChevronsUpDown className="mr-1.5 h-4 w-4" />
                          Collapse all
                        </>
                      ) : (
                        <>
                          <ChevronsDownUp className="mr-1.5 h-4 w-4" />
                          Expand all
                        </>
                      )}
                    </Button>
                  ) : (
                    <span className="sr-only">Actions</span>
                  )}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agendaItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No agendas yet.
                  </TableCell>
                </TableRow>
              ) : (
                <SortableContext
                  items={agendaItems.map((agenda) => agenda.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {agendaItems.map((agenda) => {
                    const isEditing = editingAgendaId === agenda.id;
                    const isDeleting = deletingId === agenda.id;
                    const isExpanded = expandedAgendaIds.has(agenda.id);
                    const sections = [...(agenda.sections ?? [])]
                      .sort((a, b) => {
                        const oa = a.order ?? Infinity;
                        const ob = b.order ?? Infinity;
                        return oa - ob;
                      })
                      .map((section) => ({
                        ...section,
                        tasks: [...(section.tasks ?? [])].sort((a, b) => {
                          const oa = a.order ?? Infinity;
                          const ob = b.order ?? Infinity;
                          return oa - ob;
                        }),
                      }));
                    const taskCount = sections.reduce(
                      (count, section) => count + (section.tasks?.length ?? 0),
                      0,
                    );

                    const dragCell = (
                      <TableCell className="w-10 px-4 align-middle">
                        <button
                          type="button"
                          className="cursor-grab text-muted-foreground active:cursor-grabbing"
                          disabled={isPending || isEditing}
                          aria-label="Drag Agenda"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                      </TableCell>
                    );

                    const expandCell = (
                      <TableCell className="w-10 px-4 align-middle">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() =>
                            setExpandedAgendaIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(agenda.id)) next.delete(agenda.id);
                              else next.add(agenda.id);
                              return next;
                            })
                          }
                          aria-expanded={isExpanded}
                          aria-label={
                            isExpanded ? "Collapse sections" : "Expand sections"
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    );

                    const detailRow = isExpanded ? (
                      <TableRow
                        key={`${agenda.id}-detail`}
                        className="bg-muted/5 hover:bg-muted/5"
                      >
                        <TableCell colSpan={10} className="px-4 py-3 bg-muted/100">
                          <div className="ml-10 px-4 py-3">
                            <div className="max-h-48 overflow-y-auto">
                              {sections.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No sections
                                </p>
                              ) : (
                                <ul className="space-y-2.5 text-sm">
                                  {sections.map((section) => (
                                    <li key={section.id} className="space-y-1.5">
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <span className="font-medium">
                                          {section.order != null
                                            ? `${section.order}. ${section.title}`
                                            : section.title}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {section.description || "No description"}
                                        </span>
                                        <div className="ml-1 inline-flex items-center gap-1.5 border-l pl-3">
                                          <span className="inline-flex rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                            {section.type[0].toUpperCase() +
                                              section.type.slice(1)}
                                          </span>
                                          <span className="inline-flex rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                            {section.tasks?.length ?? 0}{" "}
                                            {(section.tasks?.length ?? 0) === 1
                                              ? "task"
                                              : "tasks"}
                                          </span>
                                        </div>
                                      </div>
                                      {section.tasks &&
                                        section.tasks.length > 0 && (
                                          <ul className="ml-4 space-y-1.5 text-muted-foreground">
                                            {section.tasks.map((task) => (
                                              <li
                                                key={task.id}
                                                className="flex flex-wrap items-center gap-x-2 gap-y-1"
                                              >
                                                <span className="font-medium text-foreground">
                                                  {task.order != null
                                                    ? `${task.order}. ${task.title}`
                                                    : task.title}
                                                </span>
                                                <span className="text-muted-foreground">
                                                  {task.description || "No description"}
                                                </span>
                                                {task.link && (
                                                  <a
                                                    href={task.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="shrink-0 text-primary hover:underline"
                                                    aria-label="Open link"
                                                  >
                                                    <ExternalLink className="size-3.5" />
                                                  </a>
                                                )}
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null;

                    if (isEditing) {
                      return (
                        <Fragment key={agenda.id}>
                          <TableRow className="bg-muted/40">
                            <TableCell className="w-10 px-4" />
                            <TableCell className="w-10 px-4" />
                            {expandCell}
                            <TableCell className="px-4 align-top">
                              <Input
                                type="number"
                                min={1}
                                value={editWeek}
                                onChange={(e) => setEditWeek(e.target.value)}
                                disabled={isPending}
                                className="h-8 min-w-[4rem]"
                              />
                            </TableCell>
                            <TableCell className="px-4 align-top">
                              <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                disabled={isPending}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell className="px-4 align-top">
                              <Input
                                type="date"
                                value={editStartDate}
                                onChange={(e) => setEditStartDate(e.target.value)}
                                disabled={isPending}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell className="px-4 align-top">
                              <Input
                                type="date"
                                value={editEndDate}
                                onChange={(e) => setEditEndDate(e.target.value)}
                                disabled={isPending}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell className="px-4 align-top">
                              <Input
                                type="number"
                                min={1}
                                max={5}
                                value={editUnitValue}
                                onChange={(e) => setEditUnitValue(e.target.value)}
                                disabled={isPending}
                                className="h-8 min-w-[4rem]"
                              />
                            </TableCell>
                            <TableCell className="px-4 align-top">
                              <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                disabled={isPending}
                                rows={1}
                                className="flex min-h-9.5 w-full resize-y rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            </TableCell>
                            <TableCell className="px-4 text-right align-top">
                              <div className="flex justify-end gap-1">
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="ghost"
                                  onClick={cancelEdit}
                                  disabled={isPending}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="xs"
                                  onClick={() => handleUpdateAgenda(agenda.id)}
                                  disabled={isPending}
                                >
                                  {isPending ? "Saving..." : "Save"}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {detailRow}
                        </Fragment>
                      );
                    }

                    return (
                      <SortableAgendaRow key={agenda.id} agendaId={agenda.id}>
                        {({ setNodeRef, style, attributes, listeners }) => (
                          <Fragment>
                            <TableRow
                              ref={setNodeRef}
                              style={style}
                              className={cn(
                                isDeleting && "opacity-50",
                                !agenda.enabled && "opacity-40",
                                "[&>td]:align-middle",
                              )}
                            >
                              <TableCell className="w-10 px-4 align-middle">
                                <button
                                  type="button"
                                  className="cursor-grab text-muted-foreground active:cursor-grabbing"
                                  disabled={isPending || isDeleting}
                                  aria-label="Drag Agenda"
                                  {...attributes}
                                  {...listeners}
                                >
                                  <GripVertical className="h-4 w-4" />
                                </button>
                              </TableCell>

                              <TableCell className="w-10 px-4 align-middle text-center">
                                <input
                                  type="checkbox"
                                  style={{ cursor: "pointer" }}
                                  checked={agenda.enabled ?? true}
                                  disabled={isPending}
                                  onPointerDown={(event) => event.stopPropagation()}
                                  onClick={(event) => event.stopPropagation()}
                                  onChange={(event) => {
                                    const enabled = event.target.checked;

                                    const updated = agendaItems.map((item) =>
                                        item.id === agenda.id
                                          ? {...item, enabled}
                                          : item,
                                    );

                                    setAgendaItems(updated);

                                    startTransition(async () => {
                                      try {
                                        await toggleAgenda(agenda.id, enabled);
                                      } catch (error) {
                                        toast.error(
                                          error instanceof Error
                                            ? error.message
                                            : "Failed to update agenda status.",
                                        );
                                      }
                                    })
                                  }}
                                />
                              </TableCell>

                              {expandCell}

                              <TableCell className="px-4">
                                <span className="inline-flex h-6 w-8 items-center justify-center rounded bg-muted text-xs font-medium tabular-nums">
                                  {agenda.enabled ? getDisplayWeek(agendaItems, agenda.id) : "N/A"}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 font-medium">
                                <Link
                                  href={`/admin/agendas/${agenda.id}`}
                                  className="text-primary underline-offset-2 hover:underline focus-visible:underline"
                                >
                                  {agenda.title}
                                </Link>
                              </TableCell>
                              <TableCell className="px-4 text-muted-foreground">
                                {formatAgendaDate(agenda.start_date)}
                              </TableCell>
                              <TableCell className="px-4 text-muted-foreground">
                                {formatAgendaDate(agenda.end_date)}
                              </TableCell>
                              <TableCell className="px-4 text-muted-foreground">
                                {agenda.unitValue ?? "—"}
                              </TableCell>
                              <TableCell className="px-4 text-muted-foreground">
                                <span className="line-clamp-1">
                                  {agenda.description}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <span className="hidden items-center gap-1.5 sm:inline-flex">
                                    <span className="inline-flex rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                      {agenda.sections?.length ?? 0}{" "}
                                      {(agenda.sections?.length ?? 0) === 1
                                        ? "section"
                                        : "sections"}
                                    </span>
                                    <span className="inline-flex rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                      {taskCount} {taskCount === 1 ? "task" : "tasks"}
                                    </span>
                                  </span>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        disabled={isPending || isDeleting}
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Open row actions</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                      <DropdownMenuItem
                                        style={{ cursor: "pointer" }}
                                        disabled={isPending || copyingId === agenda.id}
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          handleCopyAgenda(agenda.id);
                                        }}
                                      >
                                        <Copy className="size-4" />
                                        {copyingId === agenda.id ? "Copying..." : "Copy"}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        style={{ cursor: "pointer" }}
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          beginEdit(agenda);
                                        }}
                                      >
                                        <Pencil className="size-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        style={{ cursor: "pointer" }}
                                        variant="destructive"
                                        disabled={isDeleting}
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          handleDeleteAgenda(agenda.id);
                                        }}
                                      >
                                        <Trash2 className="size-4" />
                                        {isDeleting ? "Deleting..." : "Delete"}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>

                            {detailRow}

                          </Fragment>
                        )}
                      </SortableAgendaRow>
                    );
                  })}
                </SortableContext>
              )}
            </TableBody>
          </Table>
        </div>
      </DndContext>
    </div>
  );
}
