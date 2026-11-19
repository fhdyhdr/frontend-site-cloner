import LayoutSwitcher from "@/components/ui/animated-collection";

/**
 * Projects page.
 *
 * Only composition lives here: the page decides where the collection comes from
 * and hands it to `<LayoutSwitcher />`. Today that is the component's built-in
 * demo data; when Drive sync lands, this function becomes the one place that
 * fetches, filters, and passes `items` - the switcher itself never changes.
 *
 * `min-h-full`, not `min-h-screen`: the page renders inside the workspace panel,
 * which has its own height and scrolls. The column is centred horizontally
 * (`justify-center`) - vertically it starts at the top, because the list scrolls
 * and centring would push the first row out of view. The switcher carries its
 * own inset (p-4/md:p-8), so the page adds none.
 */
export function ProjectsPage() {
  return (
    <div className="flex min-h-full w-full justify-center bg-background">
      <LayoutSwitcher title="Projects" />
    </div>
  );
}
