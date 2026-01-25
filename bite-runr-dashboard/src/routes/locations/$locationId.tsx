import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Package,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Search,
  Check,
} from "lucide-react";
import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/locations/$locationId")({
  component: LocationDetailPage,
});

function LocationDetailPage() {
  const { locationId } = Route.useParams();
  const navigate = useNavigate();

  const location = useQuery(api.admin.getLocation, {
    id: locationId as Id<"locations">,
  });
  const items = useQuery(api.admin.listItems, {
    locationId: locationId as Id<"locations">,
  });

  const updateLocation = useMutation(api.admin.updateLocation);
  const deleteLocation = useMutation(api.admin.deleteLocation);
  const createItem = useMutation(api.admin.createItem);
  const updateItem = useMutation(api.admin.updateItem);
  const deleteItem = useMutation(api.admin.deleteItem);
  const deleteItems = useMutation(api.admin.deleteItems);

  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editName, setEditName] = useState("");

  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);

  const [editingItemId, setEditingItemId] = useState<Id<"items"> | null>(null);
  const [editingItemName, setEditingItemName] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedItemIds, setSelectedItemIds] = useState<Set<Id<"items">>>(
    new Set()
  );
  const [isDeletingItems, setIsDeletingItems] = useState(false);

  const filteredItems = items?.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartEditLocation = () => {
    if (location) {
      setEditName(location.name);
      setIsEditingLocation(true);
    }
  };

  const handleSaveLocation = async () => {
    await updateLocation({
      id: locationId as Id<"locations">,
      name: editName.trim(),
    });
    setIsEditingLocation(false);
  };

  const handleDeleteLocation = async () => {
    await deleteLocation({ id: locationId as Id<"locations"> });
    navigate({ to: "/locations" });
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    setIsAddingItem(true);
    try {
      await createItem({
        name: newItemName.trim(),
        locationId: locationId as Id<"locations">,
      });
      setNewItemName("");
      setShowAddItem(false);
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleStartEditItem = (id: Id<"items">, name: string) => {
    setEditingItemId(id);
    setEditingItemName(name);
  };

  const handleSaveItem = async () => {
    if (!editingItemId || !editingItemName.trim()) return;
    await updateItem({
      id: editingItemId,
      name: editingItemName.trim(),
    });
    setEditingItemId(null);
    setEditingItemName("");
  };

  const handleDeleteItem = async (id: Id<"items">) => {
    await deleteItem({ id });
  };

  const handleDeleteSelectedItems = async () => {
    if (selectedItemIds.size === 0) return;
    setIsDeletingItems(true);
    try {
      await deleteItems({ ids: Array.from(selectedItemIds) });
      setSelectedItemIds(new Set());
    } finally {
      setIsDeletingItems(false);
    }
  };

  const toggleSelectItem = (id: Id<"items">) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allFilteredSelected = filteredItems?.every((item) =>
    selectedItemIds.has(item._id)
  );

  const toggleSelectAllItems = () => {
    if (!filteredItems) return;
    if (allFilteredSelected) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredItems.map((item) => item._id)));
    }
  };

  if (location === undefined) {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground">Loading...</p>
      </DashboardLayout>
    );
  }

  if (location === null) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <p className="text-muted-foreground">Location not found</p>
          <Button variant="outline" asChild>
            <Link to="/locations">
              <ArrowLeft className="mr-1 size-4" />
              Back to Locations
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/locations">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{location.name}</h1>
          </div>
        </div>

        {/* Location Details Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Location Details</CardTitle>
                <CardDescription>Edit location information</CardDescription>
              </div>
              {!isEditingLocation && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartEditLocation}
                  >
                    <Pencil className="mr-1 size-3" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="mr-1 size-3" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Location</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{location.name}"?
                          This will also delete all {items?.length ?? 0} menu
                          items. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteLocation}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditingLocation ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveLocation}>
                    <Save className="mr-1 size-4" />
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingLocation(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{location.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Menu Items Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="size-5" />
                  Menu Items
                </CardTitle>
                <CardDescription>
                  {items?.length ?? 0} items at this location
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {selectedItemIds.size > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isDeletingItems}
                      >
                        <Trash2 className="mr-1 size-4" />
                        Delete {selectedItemIds.size}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Items</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {selectedItemIds.size}{" "}
                          item{selectedItemIds.size > 1 ? "s" : ""}? This action
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSelectedItems}>
                          {isDeletingItems ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button size="sm" onClick={() => setShowAddItem(true)}>
                  <Plus className="mr-1 size-4" />
                  Add Item
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Add Item Form */}
            {showAddItem && (
              <div className="mb-4 flex gap-2">
                <Input
                  placeholder="Item name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                />
                <Button onClick={handleAddItem} disabled={isAddingItem}>
                  {isAddingItem ? "Adding..." : "Add"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddItem(false);
                    setNewItemName("");
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>
            )}

            {/* Search and Select All */}
            {items && items.length > 0 && (
              <div className="mb-4 flex items-center gap-4">
                {items.length > 5 && (
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                )}
                {filteredItems && filteredItems.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={filteredItems.length > 0 && allFilteredSelected}
                      onCheckedChange={toggleSelectAllItems}
                    />
                    <span className="text-sm text-muted-foreground">
                      Select all
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Items List */}
            {filteredItems === undefined ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : filteredItems.length === 0 ? (
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No items match your search"
                  : "No menu items yet"}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    {editingItemId === item._id ? (
                      <div className="flex flex-1 gap-2">
                        <Input
                          value={editingItemName}
                          onChange={(e) => setEditingItemName(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleSaveItem()
                          }
                          autoFocus
                        />
                        <Button size="icon" onClick={handleSaveItem}>
                          <Check className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setEditingItemId(null);
                            setEditingItemName("");
                          }}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedItemIds.has(item._id)}
                            onCheckedChange={() => toggleSelectItem(item._id)}
                          />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() =>
                              handleStartEditItem(item._id, item.name)
                            }
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon-xs">
                                <Trash2 className="size-3 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Item</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{item.name}"?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteItem(item._id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
