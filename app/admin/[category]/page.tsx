import { notFound } from "next/navigation";
import AdminWorkspace from "../../components/admin-workspace";
import { masterCategoryPageFromSlug } from "../../lib/master-categories";

export default async function MasterCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const page = masterCategoryPageFromSlug(category);
  if (!page) notFound();

  return <AdminWorkspace page={page} />;
}
