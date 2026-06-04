import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-stone-200 bg-gradient-to-b from-amber-50/80 via-stone-50 to-stone-50 dark:border-stone-800 dark:from-amber-950/30 dark:via-stone-950 dark:to-stone-950">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-20"
          aria-hidden
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, rgb(180 83 9 / 0.15), transparent 45%),
              radial-gradient(circle at 80% 10%, rgb(120 53 15 / 0.12), transparent 40%),
              radial-gradient(circle at 50% 100%, rgb(87 83 78 / 0.08), transparent 50%)`,
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28">
          <p className="mb-4 inline-flex rounded-full border border-amber-200/80 bg-amber-100/50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
            Flashcards, simmered slowly
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-stone-900 dark:text-stone-50 sm:text-5xl sm:leading-[1.08]">
            The flashcard app that{" "}
            <span className="text-amber-800 dark:text-amber-400">sticks</span>{" "}
            with you.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-600 dark:text-stone-400">
            Pasta is for people who want decks that feel organized, study sessions
            that respect your attention, and optional sharing when you are ready to
            show your work—not another noisy feed.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex rounded-full bg-amber-700 px-6 py-3 text-base font-medium text-white shadow-md transition hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
            >
              Start for free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex rounded-full border border-stone-300 bg-white/60 px-6 py-3 text-base font-medium text-stone-800 backdrop-blur transition hover:border-stone-400 hover:bg-white dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500 dark:hover:bg-stone-900"
            >
              See plans
            </Link>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="scroll-mt-16 border-b border-stone-200 bg-stone-50 py-20 dark:border-stone-800 dark:bg-stone-950"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="mt-3 max-w-2xl text-stone-600 dark:text-stone-400">
            Built around decks and cards you actually control—whether you are
            cramming for an exam or keeping a long-running personal wiki.
          </p>
          <ul className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Decks with intent",
                body: "Group cards by topic, course, or language. Flip public when you want others to learn from your stack.",
              },
              {
                title: "Study mode",
                body: "Focus on one card at a time. Fewer distractions, clearer recall when it matters.",
              },
              {
                title: "Your data, your pace",
                body: "Profiles and subscriptions stay tied to you—share decks when you choose, not by default.",
              },
            ].map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40"
              >
                <div className="mb-4 h-1.5 w-10 rounded-full bg-amber-600/80 dark:bg-amber-500/80" />
                <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b border-stone-200 bg-white py-20 dark:border-stone-800 dark:bg-stone-900">
        <div className="mx-auto grid max-w-5xl gap-12 px-4 sm:grid-cols-2 sm:items-center sm:px-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              Why &ldquo;Pasta&rdquo;?
            </h2>
            <p className="mt-4 text-stone-600 dark:text-stone-400">
              Good flashcards are a little like good pasta: simple ingredients,
              repeated practice, and a recipe you can tweak until it feels right.
              We built Pasta to stay out of your way while you do the real work—
              remembering.
            </p>
          </div>
          <ol className="space-y-4 text-sm text-stone-700 dark:text-stone-300">
            {[
              "Create a deck and drop in cards (front / back, ordered how you like).",
              "Study in a dedicated flow—no infinite scroll competing for your brain.",
              "Mark decks public when you want a link worth sharing.",
            ].map((step, i) => (
              <li key={step} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  {i + 1}
                </span>
                <span className="pt-1 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-gradient-to-br from-amber-900 via-amber-800 to-stone-900 py-20 text-amber-50 dark:from-stone-900 dark:via-amber-950 dark:to-stone-950">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Ready to plate your first deck?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-amber-100/90">
            Jump into the app in seconds. Upgrade when you outgrow the basics—we
            will keep your streak warm on the free tier too.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex rounded-full bg-white px-6 py-3 text-base font-medium text-amber-900 shadow transition hover:bg-amber-50"
            >
              Open Pasta
            </Link>
            <Link
              href="/pricing"
              className="inline-flex rounded-full border border-amber-400/50 px-6 py-3 text-base font-medium text-white transition hover:border-amber-300 hover:bg-white/10"
            >
              Compare plans
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
