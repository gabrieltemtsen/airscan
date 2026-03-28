import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
  const me = await api.me();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy">Settings</h1>
        <p className="text-sm text-muted-foreground">Workspace configuration and account details.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-navy">Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium text-navy">AirScan Workspace</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Team member management will be available on Pro/Enterprise.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-navy">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-navy">{me.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plan</span>
              <Badge variant="gold">{me.plan.toUpperCase()}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Authentication is handled by Clerk. Backend uses your Clerk JWT for API access.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-navy">API Access</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          For now, AirScan API access is via Clerk session tokens (Bearer). A dedicated API key system can be added under
          Enterprise deployments.
        </CardContent>
      </Card>
    </div>
  );
}
