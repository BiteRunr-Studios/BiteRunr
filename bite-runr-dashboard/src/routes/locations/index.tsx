import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { DashboardLayout } from '@/components/dashboard-layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Search, X, Upload } from 'lucide-react'
import { useState, useRef } from 'react'
import type { Id } from '../../../convex/_generated/dataModel'

export const Route = createFileRoute('/locations/')({
  component: LocationsPage,
})

function LocationsPage() {
  const locations = useQuery(api.admin.listLocations)
  const createLocation = useMutation(api.admin.createLocation)
  const deleteLocation = useMutation(api.admin.deleteLocation)
  const deleteLocations = useMutation(api.admin.deleteLocations)
  const bulkCreateLocations = useMutation(api.admin.bulkCreateLocations)

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<Id<'locations'>>>(
    new Set(),
  )
  const [isDeleting, setIsDeleting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredLocations = locations?.filter((loc) =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleCreate = async () => {
    if (!newName.trim()) return
    setIsCreating(true)
    try {
      await createLocation({ name: newName.trim() })
      setNewName('')
      setShowCreate(false)
    } catch (error) {
      console.error('Failed to create location:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: Id<'locations'>) => {
    await deleteLocation({ id })
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    setIsDeleting(true)
    try {
      await deleteLocations({ ids: Array.from(selectedIds) })
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Failed to delete locations:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportError(null)
    setIsImporting(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)

      let names: string[]
      if (Array.isArray(parsed)) {
        names = parsed.map((entry) => {
          if (typeof entry === 'string') return entry
          if (typeof entry === 'object' && entry !== null && typeof entry.name === 'string') return entry.name
          throw new Error('Each entry must be a string or an object with a "name" field')
        })
      } else {
        throw new Error('JSON file must contain an array')
      }

      if (names.length === 0) {
        throw new Error('No locations found in file')
      }

      const result = await bulkCreateLocations({ names })
      setImportError(null)
      // Show brief success — it'll appear in the list via reactivity
      console.log(`Imported ${result.created} locations`)
    } catch (error) {
      setImportError(
        error instanceof SyntaxError
          ? 'Invalid JSON file'
          : error instanceof Error
            ? error.message
            : 'Failed to import locations',
      )
    } finally {
      setIsImporting(false)
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const toggleSelect = (id: Id<'locations'>) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const allFilteredSelected = filteredLocations?.every((loc) =>
    selectedIds.has(loc._id)
  )

  const toggleSelectAll = () => {
    if (!filteredLocations) return
    if (allFilteredSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredLocations.map((loc) => loc._id)))
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Locations</h1>
            <p className="text-muted-foreground">
              Manage restaurant locations and their menu items
            </p>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportJSON}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              <Upload className="mr-1 size-4" />
              {isImporting ? 'Importing...' : 'Import JSON'}
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-1 size-4" />
              Add Location
            </Button>
          </div>
        </div>

        {/* Search and Bulk Actions */}
        <div className="flex items-center gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          {filteredLocations && filteredLocations.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filteredLocations.length > 0 && allFilteredSelected}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Select all</span>
            </div>
          )}
          {selectedIds.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  <Trash2 className="mr-1 size-4" />
                  Delete {selectedIds.size} selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Locations</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedIds.size} location
                    {selectedIds.size > 1 ? 's' : ''}? This will also delete all
                    menu items associated with these locations. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSelected}>
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Import Error */}
        {importError && (
          <div className="flex items-center justify-between rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span>{importError}</span>
            <button onClick={() => setImportError(null)}>
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Create Form */}
        {showCreate && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Location</CardTitle>
              <CardDescription>
                Create a new restaurant or food location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Restaurant name"
                  value={newName}
                  autoComplete="off"
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Location'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreate(false)
                    setNewName('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Locations List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLocations === undefined ? (
            <p className="text-muted-foreground col-span-full">Loading...</p>
          ) : filteredLocations.length === 0 ? (
            <p className="text-muted-foreground col-span-full">
              {searchQuery
                ? 'No locations match your search'
                : 'No locations yet'}
            </p>
          ) : (
            filteredLocations.map((location) => (
              <Card key={location._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedIds.has(location._id)}
                        onCheckedChange={() => toggleSelect(location._id)}
                      />
                      <CardTitle className="text-base">
                        {location.name}
                      </CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon-xs">
                            <Trash2 className="size-3 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Location</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{location.name}"?
                              This will also delete all menu items associated
                              with this location. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(location._id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full"
                  >
                    <Link
                      to="/locations/$locationId"
                      params={{ locationId: location._id }}
                    >
                      Manage Items
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
