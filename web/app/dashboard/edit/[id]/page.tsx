import EditListing from "@/components/EditListing";
export default async function Page({ params }: PageProps<"/dashboard/edit/[id]">) {
  const { id } = await params;
  return <EditListing id={id} />;
}
