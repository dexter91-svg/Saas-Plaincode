import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import Card from "@/components/Card";

export default function MultiAgentPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black">
        {/* Hero */}
        <section className="border-b border-slate-800 bg-black px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
              Product
            </p>
            <h1 className="mt-3 text-3xl font-bold text-slate-100 sm:text-4xl lg:text-5xl">
              Multi-Agentic System
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-400">
              How specialized AI agents working together solve the accuracy and consistency problems in customer support automation.
            </p>
          </div>
        </section>

        {/* The Problem */}
        <section className="border-b border-slate-800 bg-slate-900/20 px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-slate-100 sm:text-3xl">
              The Problem with AI Agents Today
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <Card className="border-slate-700">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-100">Low Accuracy</h3>
                <p className="mt-2 text-slate-400">
                  Single-agent systems struggle to handle the diverse range of customer inquiries accurately. They lack the specialized knowledge needed for complex, domain-specific questions.
                </p>
              </Card>
              <Card className="border-slate-700">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-100">Low Consistency</h3>
                <p className="mt-2 text-slate-400">
                  Without clear boundaries and specialization, AI agents provide inconsistent responses. The same question asked twice can yield different answers, eroding customer trust.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* The Multi-Agent Solution */}
        <section className="border-b border-slate-800 bg-black px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-slate-100 sm:text-3xl">
              The Multi-Agent Solution
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-slate-400">
              Our multi-agent architecture solves these problems by creating highly specialized agents, each an expert in their domain. Instead of one agent trying to do everything, we deploy a team of specialists.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {[
                {
                  title: "Refund Agent",
                  description: "Specialized in processing refunds, understanding return policies, and handling payment reversals.",
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  ),
                },
                {
                  title: "Shipping Agent",
                  description: "Expert in tracking orders, updating shipping information, and coordinating with logistics systems.",
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  ),
                },
                {
                  title: "Product Question Agent",
                  description: "Focused on answering product questions, providing recommendations, and accessing product catalogs.",
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  ),
                },
              ].map((item) => (
                <Card key={item.title} className="flex flex-col border-slate-700 hover:border-primary-500/50 transition-colors">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/20 text-primary-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {item.icon}
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100">{item.title}</h3>
                  <p className="mt-2 flex-1 text-slate-400">{item.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Configurability & Testing */}
        <section className="border-b border-slate-800 bg-slate-900/20 px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-slate-100 sm:text-3xl">
              Full Configurability & Sandboxed Testing
            </h2>
            <p className="mt-4 max-w-3xl text-slate-400">
              Each agent can be individually configured and tested in a safe simulation environment. Prompt each agent, simulate real-world tickets, and ensure consistent accuracy before going live.
            </p>
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <Card className="border-slate-700">
                <h3 className="text-lg font-semibold text-slate-100">Individual Agent Prompting</h3>
                <p className="mt-2 text-slate-400">
                  Configure each agent&apos;s role, tone, and behavior independently. Fine-tune their responses to match your brand voice and policies.
                </p>
              </Card>
              <Card className="border-slate-700">
                <h3 className="text-lg font-semibold text-slate-100">Simulation Mode</h3>
                <p className="mt-2 text-slate-400">
                  Test agents with real tickets in a sandboxed environment. No emails sent, no orders changed—just pure testing to ensure accuracy.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Tool Integration */}
        <section className="border-b border-slate-800 bg-black px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-slate-100 sm:text-3xl">
              Powerful Tool Integration
            </h2>
            <p className="mt-4 max-w-3xl text-slate-400">
              Agents don&apos;t just talk—they take action. Configure tools for each agent to interact with your integrated systems, from e-commerce platforms to warehouse and shipping logistics.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <Card className="border-slate-700">
                <h3 className="text-lg font-semibold text-slate-100">E-commerce & Store</h3>
                <ul className="mt-3 space-y-2 text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                    Get customer orders and order history
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                    Search and retrieve product information
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                    Update customer and order details
                  </li>
                </ul>
              </Card>
              <Card className="border-slate-700">
                <h3 className="text-lg font-semibold text-slate-100">Warehouse & Logistics</h3>
                <ul className="mt-3 space-y-2 text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                    Cancel orders in warehouse systems
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                    Track shipments with major carriers
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                    Read and apply policy documents
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {/* Manager Agent */}
        <section className="border-b border-slate-800 bg-slate-900/20 px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-slate-100 sm:text-3xl">
              The Manager Agent Architecture
            </h2>
            <p className="mt-4 max-w-3xl text-slate-400">
              At the heart of our multi-agent system is the Manager Agent—an orchestrator that coordinates specialized agents to resolve customer tickets efficiently and route the right expert every time.
            </p>
            <Card className="mt-10 border-primary-500/30 bg-primary-500/5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-500/20 text-primary-400">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">Manager Agent</h3>
                  <p className="mt-1 text-slate-400">
                    Analyzes each ticket and assigns it to the right specialist—refund, shipping, or product—so customers get accurate, consistent answers every time.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-black px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-slate-100 sm:text-3xl">
              Ready to transform your customer support?
            </h2>
            <p className="mt-4 text-slate-400">
              Join leading e-commerce brands using our multi-agent system to deliver accurate, consistent, and scalable customer support.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup?plan=free">
                <Button variant="primary" className="min-w-[160px]">
                  Start free, no card needed
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" className="min-w-[160px]">View Pricing</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
