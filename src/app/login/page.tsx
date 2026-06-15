import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Cockpit</CardTitle>
          <CardDescription>Sign in to your API cost dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert className="mb-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <form className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={6} />
            </div>
            <div className="flex flex-col gap-2">
              <Button formAction={signIn} type="submit">Sign in</Button>
            </div>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            By continuing you agree this is a personal cost-tracking tool.{" "}
            <Link href="/" className="underline">Home</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
