export default async function Share({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1>Share Page for Pasta — {id}</h1>
    </div>
  );
}