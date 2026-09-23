import Link from "next/link";
import LandingNavbar from "@/components/LandingNavbar";
import LandingFooter from "@/components/LandingFooter";

export default function MultiAgentPage() {
  return (
    <>
      <LandingNavbar />
      <main className="bg-cream">
        {/* Hero */}
        <section className="border-b border-ink/[.08] px-[6vw] py-16 lg:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <p className="font-manrope text-sm font-bold uppercase tracking-wider text-terracotta">
              Product
            </p>
            <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl lg:text-5xl">
              Multi-Agentic System
            </h1>
            <p className="mx-auto mt-6 max-w-2xl font-manrope text-lg text-warm-body">
              How specialized AI agents working together solve the accuracy and consistency problems in customer support automation.
            </p>
          </div>
        </section>

        {/* The Problem */}
        <section className="border-b border-ink/[.08] bg-cream-alt px-[6vw] py-16 lg:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              The Problem with AI Agents Today
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-white p-7 shadow-[0_4px_20px_-8px_rgba(43,34,28,.08)]">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="font-manrope text-lg font-bold text-ink">Low Accuracy</h3>
                <p className="mt-2 font-manrope text-warm-body">
                  Single-agent systems struggle to handle the diverse range of customer inquiries accurately. They lack the specialized knowledge needed for complex, domain-specific questions.
                </p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-white p-7 shadow-[0_4px_20px_-8px_rgba(43,34,28,.08)]">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="font-manrope text-lg font-bold text-ink">Low Consistency</h3>
                <p className="mt-2 font-manrope text-warm-body">
                  Without clear boundaries and specialization, AI agents provide inconsistent responses. The same question asked twice can yield different answers, eroding customer trust.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The Multi-Agent Solution */}
        <section className="border-b border-ink/[.08] px-[6vw] py-16 lg:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              The Multi-Agent Solution
            </h2>
            <p className="mt-4 max-w-3xl font-manrope text-lg text-warm-body">
              Our multi-agent architecture solves these problems by creating highly specialized agents, each an expert in their domain. Instead of one agent trying to do everything, we deploy a team of specialists.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {[
                {
                  title: "Refund Agent",
                  description: "Specialized in processing refunds, understanding return policies, and handling payment reversals.",
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  ),
                },
                {
                  title: "Shipping Agent",
                  description: "Expert in tracking orders, updating shipping information, and coordinating with logistics systems.",
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  ),
                },
                {
                  title: "Product Question Agent",
                  description: "Focused on answering product questions, providing recommendations, and accessing product catalogs.",
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  ),
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col rounded-2xl border border-ink/10 bg-white p-7 shadow-[0_4px_20px_-8px_rgba(43,34,28,.08)] transition-colors hover:border-terracotta/40"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-terracotta/10 text-terracotta">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {item.icon}
                    </svg>
                  </div>
                  <h3 className="font-manrope text-lg font-bold text-ink">{item.title}</h3>
                  <p className="mt-2 flex-1 font-manrope text-warm-body">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Configurability & Testing */}
        <section className="border-b border-ink/[.08] bg-cream-alt px-[6vw] py-16 lg:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              Full Configurability &amp; Sandboxed Testing
            </h2>
            <p className="mt-4 max-w-3xl font-manrope text-warm-body">
              Each agent can be individually configured and tested in a safe simulation environment. Prompt each agent, simulate real-world tickets, and ensure consistent accuracy before going live.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-white p-7 shadow-[0_4px_20px_-8px_rgba(43,34,28,.08)]">
                <h3 className="font-manrope text-lg font-bold text-ink">Individual Agent Prompting</h3>
                <p className="mt-2 font-manrope text-warm-body">
                  Configure each agent&apos;s role, tone, and behavior independently. Fine-tune their responses to match your brand voice and policies.
                </p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-white p-7 shadow-[0_4px_20px_-8px_rgba(43,34,28,.08)]">
                <h3 className="font-manrope text-lg font-bold text-ink">Simulation Mode</h3>
                <p className="mt-2 font-manrope text-warm-body">
                  Test agents with real tickets in a sandboxed environment. No emails sent, no orders changed—just pure testing to ensure accuracy.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tool Integration */}
        <section className="border-b border-ink/[.08] px-[6vw] py-16 lg:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              Powerful Tool Integration
            </h2>
            <p className="mt-4 max-w-3xl font-manrope text-warm-body">
              Agents don&apos;t just talk—they take action. Configure tools for each agent to interact with your integrated systems, from e-commerce platforms to warehouse and shipping logistics.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-white p-7 shadow-[0_4px_20px_-8px_rgba(43,34,28,.08)]">
                <h3 className="font-manrope text-lg font-bold text-ink">E-commerce &amp; Store</h3>
                <ul className="mt-3 space-y-2 font-manrope text-warm-body">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
                    Get customer orders and order history
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
                    Search and retrieve product information
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
                    Update customer and order details
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-white p-7 shadow-[0_4px_20px_-8px_rgba(43,34,28,.08)]">
                <h3 className="font-manrope text-lg font-bold text-ink">Warehouse &amp; Logistics</h3>
                <ul className="mt-3 space-y-2 font-manrope text-warm-body">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
                    Cancel orders in warehouse systems
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
                    Track shipments with major carriers
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
                    Read and apply policy documents
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Manager Agent */}
        <section className="border-b border-ink/[.08] bg-cream-alt px-[6vw] py-16 lg:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              The Manager Agent Architecture
            </h2>
            <p className="mt-4 max-w-3xl font-manrope text-warm-body">
              At the heart of our multi-agent system is the Manager Agent—an orchestrator that coordinates specialized agents to resolve customer tickets efficiently and route the right expert every time.
            </p>
            <div className="mt-10 rounded-2xl border border-terracotta/25 bg-terracotta/5 p-7">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-terracotta/15 text-terracotta">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-manrope text-lg font-bold text-ink">Manager Agent</h3>
                  <p className="mt-1 font-manrope text-warm-body">
                    Analyzes each ticket and assigns it to the right specialist—refund, shipping, or product—so customers get accurate, consistent answers every time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-[6vw] py-16 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              Ready to transform your customer support?
            </h2>
            <p className="mt-4 font-manrope text-warm-body">
              Join leading e-commerce brands using our multi-agent system to deliver accurate, consistent, and scalable customer support.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/signup?plan=free"
                className="inline-flex min-w-[160px] items-center justify-center rounded-full bg-terracotta px-6 py-3 font-manrope text-sm font-bold text-cream transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-px hover:bg-terracotta-dark hover:shadow-[0_10px_20px_-10px_rgba(190,91,55,.6)] active:scale-[.97]"
              >
                Start free, no card needed
              </Link>
              <Link
                href="/pricing"
                className="inline-flex min-w-[160px] items-center justify-center rounded-full border border-ink/[.15] bg-white px-6 py-3 font-manrope text-sm font-semibold text-ink transition-colors hover:bg-ink/[.05]"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
