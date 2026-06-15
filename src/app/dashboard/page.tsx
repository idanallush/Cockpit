import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Your API cost and health dashboard.
          </p>
        </div>
        <Badge variant="outline">Phase 1</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foundation ready</CardTitle>
          <CardDescription>
            Auth, database schema, and dashboard shell are in place.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Phase 1 complete. Add API keys in Phase 2.
        </CardContent>
      </Card>
    </div>
  );
}
