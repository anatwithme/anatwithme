import { SectionManager } from "@/components/admin/resource-section-manager";
import { createClient } from "@/lib/supabase/server";

// Page-level DB shapes are read directly from supabase queries; local types not required here.

// Page-level DB shapes are read directly from supabase queries; local types not required here.

export default async function AdminResourcesPage() {
  const supabase = await createClient();
  let { data: resources } = await supabase
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
    .lt("week", 0)
    .order("id", { ascending: true });

  if (!resources || resources.length === 0) {
    const week = -1;
    // Use .single() so the insert returns a single row object instead of an
    // array; this avoids destructuring a potentially-null `data` value which
    // TypeScript flags as non-iterable.
    const { data: createdResource, error } = await supabase
      .from("agenda")
      .insert({
        title: "Resources",
        description: null,
        week,
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date().toISOString().slice(0, 10),
        enabled: true,
        unitValue: null,
      })
      .select("*")
      .single();

    if (error || !createdResource) {
      throw new Error("Unable to initialize resources.");
    }

    resources = [createdResource];
  }

  const allSections = (resources ?? []).flatMap((resource) => resource.sections ?? []);
  const rootResource = {
    ...resources[0],
    sections: allSections,
  };

  return (
    <section className="w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
            Instructor resources
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Resources sections & tasks
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Organize sections and tasks in a single shared resource space without collections.
          </p>
        </div>

        <SectionManager resourceId={rootResource.id} sections={rootResource.sections} />
      </div>
    </section>
  );
}
