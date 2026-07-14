import { redirect } from "next/navigation";
import StudentAgendaBoard from "@/components/student/student-agenda-board";
import { Card, CardContent } from "@/components/ui/card";
import { WelcomeSkeletons } from "@/components/layout/welcome-skeletons";
import {
  buildAgendaSummaries,
  buildCompletedTaskSet,
} from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";

// Student resources page
// This page consolidates all `agenda` rows with `week < 0` into a single
// shared resource view for students. Sections from every matching agenda are
// flattened into a single list so instructors can publish materials without
// creating separate collections.
// Minimal DB row types for resources (used to avoid `any` in lint)
type ResourceTaskRow = {
  id: number;
  section_id?: number;
  title: string;
  description?: string | null;
  link?: string | null;
  order?: number | null;
};

type ResourceSectionRow = {
  id: number;
  agenda_id?: number;
  title: string;
  description?: string | null;
  type?: "solo" | "group";
  order?: number | null;
  tasks?: ResourceTaskRow[];
};

type ResourceRow = {
  id: number;
  title: string;
  description: string | null;
  week?: number;
  enabled?: boolean;
  unitValue?: number | null;
  start_date?: string;
  end_date?: string;
  sections?: ResourceSectionRow[];
};

export default async function StudentResourcesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("member_of")
    .select("group_id")
    .eq("user_id", user.id)
    .single();

  let membersData: Array<{ user_id: string }> = [];
  if (membership) {
    const membersRes = await supabase.rpc("get_my_group_members");
    membersData = membersRes.data ?? [];
  }

  const memberIds = membersData.map((member) => member.user_id);

  const { data: resourcesData, error: resourcesError } = await supabase
    .from("agenda")
    .select(
      `
      *,
      sections:section(
        *,
        tasks:task(*)
      )
    `,
    )
    .eq("enabled", true)
    .lt("week", 0)
    .order("id", { ascending: true });

  if (resourcesError) {
    return (
      <section className="w-full max-w-5xl px-4 py-6 sm:px-6">
        <div className="space-y-3">
          <WelcomeSkeletons />
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-8 text-center text-sm text-destructive">
              There was a problem loading resources. Please try again.
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  const resources = (resourcesData ?? []) as ResourceRow[];
  const allSections = resources.flatMap((resource) => resource.sections ?? []);
  const selectedResource =
    resources.length > 0
      ? {
          id: resources[0].id,
          title: resources[0].title,
          description: resources[0].description,
          week: resources[0].week ?? -1,
          enabled: resources[0].enabled ?? true,
          unitValue: resources[0].unitValue ?? null,
          start_date: resources[0].start_date ?? new Date().toISOString().slice(0, 10),
          end_date: resources[0].end_date ?? new Date().toISOString().slice(0, 10),
          // Normalize sections and tasks into the exact shape expected by the
          // student board and progress helpers. Ensure required numeric IDs
          // (`agenda_id` on sections and `section_id` on tasks) are present so
          // TypeScript aligns with the `Agenda` / `ProgressAgenda` types.
          sections: allSections.map((section) => ({
            id: section.id,
            agenda_id: section.agenda_id ?? resources[0].id,
            title: section.title,
            description: section.description ?? null,
            type: section.type ?? "group",
            order: section.order ?? null,
            tasks: (section.tasks ?? []).map((task) => ({
              id: task.id,
              section_id: task.section_id ?? section.id,
              title: task.title,
              description: task.description ?? null,
              link: task.link ?? null,
              order: task.order ?? null,
            })),
          })),
        }
      : null;

  if (!selectedResource || allSections.length === 0) {
    return (
      <section className="w-full max-w-5xl px-4 py-6 sm:px-6">
        <div className="animate-fade-in-up flex flex-col items-center gap-8 text-center">
          <WelcomeSkeletons />
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
              Student resources
            </span>
            <h1 className="text-balance text-4xl font-bold leading-tight sm:text-5xl">
              No resources yet
            </h1>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground">
              Your instructor has not published any sections or tasks yet.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const allTaskIds = allSections.flatMap((section) =>
    (section.tasks ?? []).map((task) => task.id),
  );

  const { data: myCompletions } =
    allTaskIds.length > 0
      ? await supabase
          .from("task_completion")
          .select("task_id, completed")
          .eq("user_id", user.id)
          .in("task_id", allTaskIds)
      : { data: [] as { task_id: number; completed: boolean }[] };

  const { data: groupCompletions } =
    allTaskIds.length > 0 && memberIds.length > 0
      ? await supabase
          .from("task_completion")
          .select("user_id, task_id, completed")
          .in("user_id", memberIds)
          .in("task_id", allTaskIds)
      : { data: [] as { user_id: string; task_id: number; completed: boolean }[] };

  const myCompletedTaskSet = buildCompletedTaskSet(myCompletions ?? []);
  const resourceSummaries = buildAgendaSummaries({
    agendas: [selectedResource],
    completedTaskIds: myCompletedTaskSet,
    groupCompletions: groupCompletions ?? [],
    memberCount: memberIds.length,
  });

  const totalCompletedOverall = (myCompletions ?? []).filter(
    (completion) => completion.completed,
  ).length;
  const overallProgressPercent =
    allTaskIds.length > 0
      ? Math.round((totalCompletedOverall / allTaskIds.length) * 100)
      : 0;

  return (
    <section className="w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-8 text-center">
        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
          Student resources
        </span>
        <h1 className="mt-3 text-balance text-4xl font-bold leading-tight sm:text-5xl">
          Course resources
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
          Browse sections and tasks shared by your instructor without resource collections.
        </p>
      </div>
      <StudentAgendaBoard
        agenda={selectedResource}
        allAgendas={[selectedResource]}
        agendaSummaries={resourceSummaries}
        selectedAgendaId={selectedResource.id}
        selectedUnit={null}
        availableUnits={[]}
        hasExplicitSelection={false}
        hideViewModeSelector
        myCompletedTaskSet={myCompletedTaskSet}
        groupCompletions={groupCompletions ?? []}
        memberIds={memberIds}
        hasGroup={Boolean(membership)}
        overallProgressPercent={overallProgressPercent}
      />
    </section>
  );
}
