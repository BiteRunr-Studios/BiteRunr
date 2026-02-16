import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
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
import { MapPin, Package, Users, ShoppingCart, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const stats = useQuery(api.admin.getStats);
  const locations = useQuery(api.admin.listLocations);

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
