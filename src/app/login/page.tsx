import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type SearchParams = Promise<{ error?: string; message?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const { error, message } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col bg-canvas-dark">
      <header className="h-16 px-6 flex items-center">
        <Link href="/" className="text-xl font-bold tracking-tight text-yellow" style={{ letterSpacing: "-0.02em" }}>
          COCKPIT
        </Link>
      </header>

      <main className="flex-1 grid lg:grid-cols-2 max-w-[1280px] w-full mx-auto px-6 gap-12 items-center pb-16">
        {/* hero block — dark, yellow display */}
        <section className="hidden lg:block">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-tone)] font-semibold mb-4">
            Personal API Cost Dashboard
          </div>
          <h1
            className="text-[56px] font-bold leading-[1.05] tracking-[-0.02em]"
            style={{ color: "var(--on-dark)" }}
          >
            One pane of glass for{" "}
            <span className="text-yellow">every dollar</span> you spend on AI.
          </h1>
          <p className="mt-5 text-base text-[color:var(--muted-strong)] max-w-md">
            Sync OpenAI and Anthropic admin costs, scope spend by project, set thresholds, and get alerted before the bill lands.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
            <MiniStat label="Providers" value="3" />
            <MiniStat label="Sync · cron" value="6h" />
            <MiniStat label="Alerts" value="80/100%" />
          </div>
        </section>

        {/* transactional auth card — light canvas inside dark page */}
        <section className="light-canvas rounded-xl border border-hairline-light p-8 max-w-[440px] w-full mx-auto lg:mx-0">
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>
            Sign in
          </h2>
          <p className="text-sm text-[color:var(--muted-tone)] mt-1">
            Access your API cost dashboard.
          </p>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert className="mt-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <form className="grid gap-4 mt-6">
            <div className="grid gap-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-tone)]">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="h-11 bg-[color:var(--surface-strong-light)] border-hairline-light text-[color:var(--ink)] rounded-md"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-tone)]">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className="h-11 bg-[color:var(--surface-strong-light)] border-hairline-light text-[color:var(--ink)] rounded-md"
              />
            </div>
            <button
              formAction={signIn}
              type="submit"
              className="btn-binance h-11 rounded-md text-sm mt-2"
            >
              Sign in
            </button>
          </form>

          <p className="mt-6 text-xs text-[color:var(--muted-tone)]">
            By continuing you agree this is a personal cost-tracking tool.{" "}
            <Link href="/" className="text-yellow font-medium hover:underline">Home</Link>
          </p>
        </section>
      </main>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-card-dark border border-hairline-dark rounded-lg px-3 py-3">
      <div className="num text-xl font-bold" style={{ color: "var(--binance-yellow)" }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-[color:var(--muted-tone)] mt-1 font-semibold">
        {label}
      </div>
    </div>
  );
}
