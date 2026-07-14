"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
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
  createSection,
  createTask,
} from "@/app/admin/resources/action";

type Task = {
  id: number;
  section_id: number;
  title: string;
  description: string | null;
  link: string | null;
  order: number | null;
};

type Section = {
  id: number;
  agenda_id: number;
  title: string;
  description: string | null;
  order: number | null;
  tasks: Task[];
};

type SectionManagerProps = {
  resourceId: number;
  sections: Section[];
};

// Normalize the order input so empty or invalid values are treated as "no order".
// This permits optional ordering for both sections and tasks.
function parseOrder(value: string): number | null {
  const n = Number.parseInt(value.trim(), 10);
  return value.trim() === "" || !Number.isInteger(n) || n <= 0 ? null : n;
}

// Sort items by declared order, placing un-ordered items at the end.
// Used by both sections and tasks so the UI always reflects explicit order values.
function sortByOrder<T extends { order: number | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aOrder = a.order ?? Number.POSITIVE_INFINITY;
    const bOrder = b.order ?? Number.POSITIVE_INFINITY;
    return aOrder - bOrder;
  });
}

export function SectionManager({ resourceId, sections }: SectionManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");
  const [sectionOrder, setSectionOrder] = useState("");

  const sortedSections = sortByOrder(sections ?? []);

  const resetSectionForm = () => {
    setSectionTitle("");
    setSectionDescription("");
    setSectionOrder("");
    setShowSectionForm(false);
  };

  const handleCreateSection = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);

    startTransition(async () => {
      try {
        // Create a section for the shared resource space.
        // Resources use a flattened section/task model, so the section type is handled server-side
        // and the client only needs title, description, and optional order.
        await createSection(
          resourceId,
          sectionTitle.trim(),
          sectionDescription.trim() || null,
          parseOrder(sectionOrder),
        );
        resetSectionForm();
        router.refresh();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to create section.",
        );
      }
    });
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add a section</CardTitle>
          <CardDescription>
            Organize related items into sections, then add tasks underneath each one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showSectionForm ? (
            <form onSubmit={handleCreateSection} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="section-title">Section title</Label>
                  <Input
                    id="section-title"
                    value={sectionTitle}
                    onChange={(e) => setSectionTitle(e.target.value)}
                    placeholder="e.g. Study materials"
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="section-order">Order</Label>
                  <Input
                    id="section-order"
                    type="number"
                    min={1}
                    value={sectionOrder}
                    onChange={(e) => setSectionOrder(e.target.value)}
                    placeholder="Optional"
                    disabled={isPending}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="section-description">Description</Label>
                <Input
                  id="section-description"
                  value={sectionDescription}
                  onChange={(e) => setSectionDescription(e.target.value)}
                  placeholder="Optional details"
                  disabled={isPending}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating..." : "Create section"}
                </Button>
                <Button type="button" variant="ghost" onClick={resetSectionForm}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button type="button" variant="outline" onClick={() => setShowSectionForm(true)}>
              <Plus className="mr-2 size-4" />
              Add section
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {sortedSections.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No sections yet. Add one to start organizing your course content.
            </CardContent>
          </Card>
        ) : (
          sortedSections.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <CardDescription>
                      {section.description || "No description"}
                    </CardDescription>
                  </div>
                  {section.order ? (
                    <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      Order {section.order}
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Tasks</p>
                  {section.tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No tasks yet for this section.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {sortByOrder(section.tasks).map((task) => (
                        <li key={task.id} className="rounded-lg border bg-muted/20 p-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium">{task.title}</div>
                            {task.order ? (
                              <span className="text-xs text-muted-foreground">
                                {task.order}
                              </span>
                            ) : null}
                          </div>
                          {task.description ? (
                            <div className="mt-1 text-muted-foreground">
                              {task.description}
                            </div>
                          ) : null}
                          {task.link ? (
                            <a
                              href={task.link}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex text-primary underline-offset-4 hover:underline"
                            >
                              Open link
                            </a>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <TaskForm resourceId={resourceId} sectionId={section.id} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function TaskForm({
  resourceId,
  sectionId,
}: {
  resourceId: number;
  sectionId: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [order, setOrder] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      try {
        await createTask(
          resourceId,
          sectionId,
          title.trim(),
          description.trim() || null,
          link.trim() || null,
          parseOrder(order),
        );
        setTitle("");
        setDescription("");
        setLink("");
        setOrder("");
        router.refresh();
      } catch {
        // errors are surfaced by the action; no-op here to keep the UI stable
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-background p-3">
      <p className="text-sm font-medium">Add a task</p>
      <div className="grid gap-3 md:grid-cols-[1fr_120px]">
        <div className="grid gap-2">
          <Label htmlFor={`task-title-${sectionId}`}>Task title</Label>
          <Input
            id={`task-title-${sectionId}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Review slides"
            required
            disabled={isPending}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`task-order-${sectionId}`}>Order</Label>
          <Input
            id={`task-order-${sectionId}`}
            type="number"
            min={1}
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            placeholder="Optional"
            disabled={isPending}
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <div className="grid gap-2">
          <Label htmlFor={`task-description-${sectionId}`}>Description</Label>
          <Input
            id={`task-description-${sectionId}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            disabled={isPending}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`task-link-${sectionId}`}>Link</Label>
          <Input
            id={`task-link-${sectionId}`}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
            disabled={isPending}
          />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Add task"}
      </Button>
    </form>
  );
}
