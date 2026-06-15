import { Card, CardContent } from "@/components/ui/card";

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          Cost-threshold and error alerts.
        </p>
      </div>
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Alerts will appear here once thresholds are configured (Phase 4).
        </CardContent>
      </Card>
    </div>
  );
}
