import Thread from "@/components/Thread";
export default async function Page({ params }: PageProps<"/inbox/[id]">) {
  const { id } = await params;
  return <Thread id={id} />;
}
