import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Package, Users, ShoppingCart, ArrowRight, Mail, Send } from "lucide-react";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const stats = useQuery(api.admin.getStats);
  const locations = useQuery(api.admin.listLocations);
  const waitlistCount = useQuery(api.waitlist.getCount);
  const waitlistEntries = useQuery(api.waitlist.list);
  const sendLaunchEmail = useAction(api.waitlist.sendLaunchEmail);

  const [emailSubject, setEmailSubject] = useState("BiteRunr is Live! 🎉");
  const [emailBody, setEmailBody] = useState(
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #FF8800;">BiteRunr is Live!</h1>
  <p>Hey there! You signed up for the BiteRunr waitlist, and we're excited to let you know — the app is now available!</p>
  <p>Download it today and start simplifying group food orders with your friends.</p>
  <a href="https://biterunr.com" style="display: inline-block; background: #FF8800; color: black; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Get BiteRunr</a>
  <p style="color: #888; margin-top: 24px; font-size: 12px;">— The BiteRunr Team</p>
</div>`
  );
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your BiteRunr data
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Locations
              </CardTitle>
              <MapPin className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalLocations ?? "..."}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalItems ?? "..."}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalUsers ?? "..."}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Active Orders
              </CardTitle>
              <ShoppingCart className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.activeOrders ?? "..."}
              </div>
              <p className="text-xs text-muted-foreground">
                of {stats?.totalOrders ?? "..."} total orders
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Waitlist */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="size-5" />
                  Waitlist
                </CardTitle>
                <CardDescription>
                  {waitlistCount ?? "..."} people signed up
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {waitlistEntries && waitlistEntries.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border p-3 text-sm">
                {waitlistEntries.map((entry) => (
                  <div key={entry._id} className="flex items-center justify-between">
                    <span>{entry.email}</span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(entry.signedUpAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 rounded-md border p-4">
              <h4 className="font-medium text-sm">Send Email to Waitlist</h4>
              <Input
                placeholder="Subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
              <Textarea
                placeholder="HTML body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />
              <div className="flex items-center gap-3">
                <Button
                  disabled={sending || !waitlistCount}
                  onClick={async () => {
                    if (!confirm(`Send email to ${waitlistCount} waitlist subscribers?`)) return;
                    setSending(true);
                    setSendResult(null);
                    try {
                      const result = await sendLaunchEmail({
                        subject: emailSubject,
                        html: emailBody,
                      });
                      setSendResult(`Sent to ${result.sent} subscribers!`);
                    } catch (err) {
                      setSendResult(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
                    } finally {
                      setSending(false);
                    }
                  }}
                >
                  <Send className="size-4 mr-2" />
                  {sending ? "Sending..." : `Send to ${waitlistCount ?? 0} subscribers`}
                </Button>
                {sendResult && (
                  <span className={`text-sm ${sendResult.startsWith("Error") ? "text-destructive" : "text-green-500"}`}>
                    {sendResult}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Locations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Locations</CardTitle>
                <CardDescription>
                  Recently added restaurant locations
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/locations">
                  View all
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {locations === undefined ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : locations.length === 0 ? (
              <p className="text-muted-foreground">No locations yet</p>
            ) : (
              <div className="space-y-3">
                {locations.slice(0, 5).map((location) => (
                  <Link
                    key={location._id}
                    to="/locations/$locationId"
                    params={{ locationId: location._id }}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{location.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {location.address}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
