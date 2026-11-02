export default function Prose({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <article className="card mx-auto max-w-3xl space-y-4 p-6 text-sm leading-relaxed text-stone-700 sm:p-8 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-stone-900 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      <h1 className="text-2xl font-extrabold text-stone-900">{title}</h1>
      {note && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{note}</p>}
      {children}
    </article>
  );
}
