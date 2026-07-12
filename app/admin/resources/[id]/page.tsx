import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SectionManager } from "@/components/admin/resource-section-manager";
export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resourceId = Number.parseInt(id, 10);

  if (!Number.isInteger(resourceId) || resourceId <= 0) {
    notFound();
  }

  const supabase = await createClient();
  // Load the resource and its sections/tasks. We require `week < 0` to
  // guarantee this agenda row represents a resources collection rather
  // than a weekly agenda.
  const { data: resource, error } = await supabase
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
    .eq("id", resourceId)
    .single();

  if (error || resource === null || resource.week >= 0) {
    notFound();
  }

  return (
    <div className="w-full max-w-7xl space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{resource.title}</h1>
        <p className="text-sm text-muted-foreground">
          {resource.description || "Create sections and tasks for this resource."}
        </p>
      </div>
      <SectionManager resourceId={resource.id} sections={resource.sections} />
    </div>
  );
}
