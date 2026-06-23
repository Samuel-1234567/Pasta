import Link from "next/link";
import { CheckoutButton } from "@/app/components/billing/checkout-button";

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.292a1 1 0 0 1 .004 1.416l-7.2 7.25a1 1 0 0 1-1.418.002L3.292 9.162a1 1 0 1 1 1.416-1.414l4.09 4.084 6.492-6.54a1 1 0 0 1 1.414 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function Pricing() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-stone-200 bg-gradient-to-b from-amber-50/80 via-stone-50 to-stone-50 dark:border-stone-800 dark:from-amber-950/30 dark:via-stone-950 dark:to-stone-950">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-20"
          aria-hidden
          style={{
            backgroundImage: `radial-gradient(circle at 15% 20%, rgb(180 83 9 / 0.15), transparent 45%),
              radial-gradient(circle at 85% 10%, rgb(120 53 15 / 0.12), transparent 40%),
              radial-gradient(circle at 50% 110%, rgb(87 83 78 / 0.08), transparent 55%)`,
          }}
        />

        <div className="relative mx-auto max-w-5xl px-4 pb-14 pt-16 sm:px-6 sm:pb-16 sm:pt-24">
          <p className="mb-4 inline-flex rounded-full border border-amber-200/80 bg-amber-100/50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
            Simple plans, calm upgrades
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-stone-900 dark:text-stone-50 sm:text-5xl sm:leading-[1.08]">
            Pricing that stays{" "}
            <span className="text-amber-800 dark:text-amber-400">al dente</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-600 dark:text-stone-400">
            Start free. Upgrade when you want more room to grow—bigger decks, better
            sharing, and more control over how your learning looks.
          </p>
        </div>
      </section>

      <section className="border-b border-stone-200 bg-stone-50 py-16 dark:border-stone-800 dark:bg-stone-950">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                name: "Free",
                price: "$0",
                cadence: "forever",
                blurb: "For getting started and keeping a steady study streak.",
                ctaLabel: "Start free",
                ctaHref: "/dashboard",
                featured: false,
                highlights: [
                  "Create decks and cards",
                  "Study mode",
                  "Basic sharing",
                  "Community-friendly limits",
                ],
              },
              {
                name: "Pro",
                price: "$4.99",
                cadence: "per month",
                blurb: "For serious learners who want more space and polish.",
                ctaLabel: "Go Pro",
                checkout: true,
                featured: true,
                highlights: [
                  "Everything in Free",
                  "Larger deck limits",
                  "Advanced deck privacy controls",
                  "Priority generation & exports (when available)",
                ],
              },
              {
                name: "Team",
                price: "Soon",
                cadence: "",
                blurb: "For small cohorts studying together with consistent decks.",
                ctaLabel: "Coming soon",
                comingSoon: true,
                featured: false,
                highlights: [
                  "Shared team workspace",
                  "Role-based deck access",
                  "Shared templates",
                  "Central billing",
                ],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={[
                  "relative rounded-2xl border bg-white p-6 shadow-sm dark:bg-stone-900/40",
                  plan.featured
                    ? "border-amber-300/80 ring-1 ring-amber-400/30 dark:border-amber-700/60 dark:ring-amber-500/20"
                    : "border-stone-200 dark:border-stone-800",
                ].join(" ")}
              >
                {plan.featured ? (
                  <div className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-amber-700 px-3 py-1 text-xs font-semibold text-white shadow-sm dark:bg-amber-600">
                    Most popular
                  </div>
                ) : null}

                <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
                  {plan.name}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                  {plan.blurb}
                </p>

                <div className="mt-6 flex items-end gap-2">
                  <span className="text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                    {plan.price}
                  </span>
                  {plan.cadence ? (
                    <span className="pb-1 text-sm text-stone-500 dark:text-stone-400">
                      {plan.cadence}
                    </span>
                  ) : null}
                </div>

                {'checkout' in plan && plan.checkout ? (
                  <CheckoutButton
                    loginNext="/pricing"
                    className={[
                      "mt-6 inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium shadow-sm transition",
                      plan.featured
                        ? "bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
                        : "border border-stone-300 bg-white/60 text-stone-800 backdrop-blur hover:border-stone-400 hover:bg-white dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500",
                    ].join(" ")}
                  >
                    {plan.ctaLabel}
                  </CheckoutButton>
                ) : 'comingSoon' in plan && plan.comingSoon ? (
                  <button
                    type="button"
                    disabled
                    className="mt-6 inline-flex w-full cursor-not-allowed items-center justify-center rounded-full border border-stone-200 bg-stone-100 px-4 py-2.5 text-sm font-medium text-stone-500 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-400"
                  >
                    {plan.ctaLabel}
                  </button>
                ) : (
                  <Link
                    href={'ctaHref' in plan && plan.ctaHref ? plan.ctaHref : '/dashboard'}
                    className={[
                      "mt-6 inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium shadow-sm transition",
                      plan.featured
                        ? "bg-amber-700 text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
                        : "border border-stone-300 bg-white/60 text-stone-800 backdrop-blur hover:border-stone-400 hover:bg-white dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:border-stone-500",
                    ].join(" ")}
                  >
                    {plan.ctaLabel}
                  </Link>
                )}

                <ul className="mt-6 space-y-3 text-sm text-stone-700 dark:text-stone-300">
                  {plan.highlights.map((item) => (
                    <li key={item} className="flex gap-3">
                      <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-stone-500 dark:text-stone-400">
            No hidden fees. Cancel anytime. Your decks stay yours.
          </p>
        </div>
      </section>

      <section className="border-b border-stone-200 bg-white py-16 dark:border-stone-800 dark:bg-stone-900">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                What you get with Pasta
              </h2>
              <p className="mt-3 max-w-xl text-stone-600 dark:text-stone-400">
                Plans differ by scale and control—not by hiding the basics. Study
                mode is always included.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Focused study flow",
                  body: "One card at a time, with a clean session that respects your attention.",
                },
                {
                  title: "Deck-first organization",
                  body: "Structure by topic, course, or language—no feed, no noise.",
                },
                {
                  title: "Share on your terms",
                  body: "Keep decks private, unlisted, or public when you are ready.",
                },
                {
                  title: "Portable learning",
                  body: "Build a library that grows with you and stays readable months later.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm dark:border-stone-800 dark:bg-stone-950"
                >
                  <div className="mb-3 h-1.5 w-10 rounded-full bg-amber-600/80 dark:bg-amber-500/80" />
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-stone-200 bg-stone-50 py-16 dark:border-stone-800 dark:bg-stone-950">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            FAQ
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {[
              {
                q: "Can I start on Free and upgrade later?",
                a: "Yes. Start free anytime. If you upgrade, your decks and progress come with you.",
              },
              {
                q: "Do you lock study mode behind a paywall?",
                a: "No—study mode is core to Pasta. Paid plans are about scale, control, and convenience.",
              },
              {
                q: "Can I cancel Pro?",
                a: "Yes. Cancel anytime. You will keep access through the end of your billing period.",
              },
              {
                q: "When is Team available?",
                a: "Team is coming soon. Join Pro today for individual upgrades, and we will announce Team when shared workspaces are ready.",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900/40"
              >
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {item.q}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-amber-900 via-amber-800 to-stone-900 py-16 text-amber-50 dark:from-stone-900 dark:via-amber-950 dark:to-stone-950">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Pick a plan and start studying today
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-amber-100/90">
            Pasta works best when you use it daily. Start free, then upgrade when
            your decks (and ambitions) get bigger.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex rounded-full bg-white px-6 py-3 text-base font-medium text-amber-900 shadow transition hover:bg-amber-50"
            >
              Open Pasta
            </Link>
            <Link
              href="/"
              className="inline-flex rounded-full border border-amber-400/50 px-6 py-3 text-base font-medium text-white transition hover:border-amber-300 hover:bg-white/10"
            >
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}