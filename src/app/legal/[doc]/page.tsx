import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { COMPANY, LEGAL_DOCS } from "@/lib/legal";
import { Logo } from "@/components/Logo";

export function generateStaticParams() {
  return LEGAL_DOCS.map((d) => ({ doc: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }): Promise<Metadata> {
  const { doc } = await params;
  const d = LEGAL_DOCS.find((x) => x.slug === doc);
  return { title: d ? `${d.title} · KripFresh` : "KripFresh" };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const d = LEGAL_DOCS.find((x) => x.slug === doc);
  if (!d) notFound();
  return (
    <div className="min-h-dvh bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" aria-label="KripFresh home"><Logo /></Link>
          <Link href="/help" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand">Help &amp; support</Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Policies" className="lg:sticky lg:top-6 lg:self-start">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {LEGAL_DOCS.map((x) => (
              <li key={x.slug}>
                <Link href={`/legal/${x.slug}`} aria-current={x.slug === doc ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-medium ${x.slug === doc ? "bg-mint font-semibold text-brand" : "hover:bg-tile"}`}>{x.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <main id="main" className="min-w-0 max-w-[68ch]">
          <h1 className="text-3xl font-bold tracking-tight">{d.title}</h1>
          <p className="mt-1 text-sm text-ink-2">Last updated {COMPANY.updated}</p>
          <p className="mt-4 rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn"><b>Template.</b> Company details are placeholders. Have a lawyer review this policy before launch.</p>
          <p className="mt-5 text-[15px] leading-relaxed">{d.intro}</p>
          {d.sections.map((s, i) => (
            <section key={s.h} className="mt-7">
              <h2 className="text-lg font-bold">{i + 1}. {s.h}</h2>
              {s.p.map((p) => <p key={p.slice(0, 40)} className="mt-2 text-[15px] leading-relaxed text-ink-2">{p}</p>)}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
