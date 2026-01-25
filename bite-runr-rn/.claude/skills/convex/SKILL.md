---
name: convex
description: "Backend development with Convex - a real-time database and serverless functions platform. Use when Claude needs to: (1) Create Convex functions (queries, mutations, actions), (2) Define database schemas with validators, (3) Set up indexes and pagination, (4) Implement file storage, (5) Schedule crons or background jobs, (6) Build HTTP endpoints, or any Convex backend tasks"
---

# Convex Backend Development

## Quick Reference

| Task               | Approach                                                            |
| ------------------ | ------------------------------------------------------------------- |
| Public function    | `query`, `mutation`, `action` from `./_generated/server`            |
| Internal function  | `internalQuery`, `internalMutation`, `internalAction`               |
| Schema             | Define in `convex/schema.ts` with `defineSchema`, `defineTable`     |
| Function reference | `api.file.function` (public) or `internal.file.function` (internal) |

## Function Syntax

**Always use the new syntax with args, returns, and handler:**

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getUser = query({
    args: { userId: v.id("users") },
    returns: v.object({ name: v.string(), email: v.string() }),
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) throw new Error("User not found");
        return { name: user.name, email: user.email };
    },
});
```

**Critical rules:**

- Always include `args` and `returns` validators for ALL functions
- Functions without return use `returns: v.null()` and `return null`
- Import validators with `v` from `"convex/values"`

## Validators

| Type     | Validator                             | TS Type                       | Notes                         |
| -------- | ------------------------------------- | ----------------------------- | ----------------------------- |
| Id       | `v.id("tableName")`                   | `Id<"tableName">`             | Document reference            |
| Null     | `v.null()`                            | `null`                        | Use instead of undefined      |
| Int64    | `v.int64()`                           | `bigint`                      | NOT `v.bigint()` (deprecated) |
| Float64  | `v.number()`                          | `number`                      |                               |
| Boolean  | `v.boolean()`                         | `boolean`                     |                               |
| String   | `v.string()`                          | `string`                      |                               |
| Bytes    | `v.bytes()`                           | `ArrayBuffer`                 |                               |
| Array    | `v.array(v.string())`                 | `string[]`                    | Max 8192 items                |
| Object   | `v.object({...})`                     | `{...}`                       | Max 1024 fields               |
| Record   | `v.record(v.id("users"), v.string())` | `Record<Id<"users">, string>` |                               |
| Union    | `v.union(v.string(), v.number())`     | `string \| number`            |                               |
| Optional | `v.optional(v.string())`              | `string \| undefined`         |                               |
| Literal  | `v.literal("active")`                 | `"active"`                    |                               |

**Discriminated unions:**

```typescript
v.union(
    v.object({ kind: v.literal("error"), message: v.string() }),
    v.object({ kind: v.literal("success"), value: v.number() }),
);
```

## Schema Definition

Define in `convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        name: v.string(),
        email: v.string(),
    }).index("by_email", ["email"]),

    messages: defineTable({
        channelId: v.id("channels"),
        authorId: v.id("users"),
        content: v.string(),
    }).index("by_channel", ["channelId"]),
});
```

**Index rules:**

- Name indexes after fields: `by_field1_and_field2`
- Query fields in index order
- System fields `_id` and `_creationTime` are auto-added

## Queries

```typescript
// Use withIndex instead of filter
const messages = await ctx.db
    .query("messages")
    .withIndex("by_channel", (q) => q.eq("channelId", channelId))
    .order("desc")
    .take(10);

// Single document
const user = await ctx.db.get(userId);

// Unique result (throws if multiple)
const doc = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
```

**Critical:** Never use `.filter()` - always use indexes with `.withIndex()`.

## Mutations

```typescript
// Insert
const id = await ctx.db.insert("users", { name, email });

// Patch (shallow merge)
await ctx.db.patch(userId, { name: newName });

// Replace (full document)
await ctx.db.replace(userId, { name, email });

// Delete
await ctx.db.delete(userId);
```

## Actions

Actions run outside transactions. Use for external APIs:

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";

export const callExternalAPI = action({
  args: { prompt: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Call queries/mutations
    const data = await ctx.runQuery(api.myFile.getData, {});

    // External API call
    const response = await fetch("https://api.example.com", { ... });

    // Save result
    await ctx.runMutation(api.myFile.saveResult, { result });

    return result;
  },
});
```

**Critical:** Actions cannot use `ctx.db` - use `ctx.runQuery`/`ctx.runMutation`.

For Node.js modules, add `"use node";` at file top.

## Function References

```typescript
import { api, internal } from "./_generated/api";

// Public: api.filename.functionName
await ctx.runQuery(api.users.getUser, { userId });

// Internal: internal.filename.functionName
await ctx.runMutation(internal.users.updateInternal, { userId });
```

**Same-file calls need type annotation:**

```typescript
const result: string = await ctx.runQuery(api.example.myQuery, { id });
```

## Scheduling

```typescript
// Schedule immediately
await ctx.scheduler.runAfter(0, internal.tasks.process, { taskId });

// Schedule with delay (ms)
await ctx.scheduler.runAfter(60000, api.cleanup.run, {});

// Schedule at time
await ctx.scheduler.runAt(timestamp, internal.notify.send, { userId });
```

## Crons

Define in `convex/crons.ts`:

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("cleanup", { hours: 1 }, internal.tasks.cleanup, {});
crons.cron("daily report", "0 9 * * *", internal.reports.daily, {});

export default crons;
```

## Pagination

```typescript
import { paginationOptsValidator } from "convex/server";

export const listMessages = query({
  args: {
    channelId: v.id("channels"),
    paginationOpts: paginationOptsValidator
  },
  returns: v.object({
    page: v.array(v.object({ ... })),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
```

## HTTP Endpoints

Define in `convex/http.ts`:

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
    path: "/webhook",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
        const body = await req.json();
        await ctx.runMutation(internal.webhooks.process, { data: body });
        return new Response("OK", { status: 200 });
    }),
});

export default http;
```

## File Storage

```typescript
// Get URL
const url = await ctx.storage.getUrl(fileId); // Returns string | null

// Get metadata via system table
const metadata = await ctx.db.system.get(fileId);
// Returns: { _id, _creationTime, contentType?, sha256, size }

// Store file (in action)
const blob = new Blob([data], { type: "text/plain" });
const storageId = await ctx.storage.store(blob);
```

## Full-Text Search

```typescript
// Schema
messages: defineTable({ ... })
  .searchIndex("search_body", { searchField: "body", filterFields: ["channel"] })

// Query
const results = await ctx.db
  .query("messages")
  .withSearchIndex("search_body", (q) =>
    q.search("body", "hello world").eq("channel", "#general")
  )
  .take(10);
```

## TypeScript Types

```typescript
import { Id, Doc } from "./_generated/dataModel";

// Document ID type
type UserId = Id<"users">;

// Full document type
type User = Doc<"users">;

// Records with ID keys
const map: Record<Id<"users">, string> = {};
```

## Project Structure

```
project/
├── convex/
│   ├── _generated/     # Auto-generated (don't edit)
│   ├── schema.ts       # Database schema
│   ├── http.ts         # HTTP endpoints
│   ├── crons.ts        # Scheduled jobs
│   └── *.ts            # Functions (file-based routing)
├── package.json
└── tsconfig.json
```

## Common Patterns

**Validate document exists:**

```typescript
const doc = await ctx.db.get(id);
if (!doc) throw new Error("Not found");
```

**Delete with collect:**

```typescript
const docs = await ctx.db.query("items").withIndex(...).collect();
for (const doc of docs) {
  await ctx.db.delete(doc._id);
}
```

**Async iteration:**

```typescript
for await (const doc of ctx.db.query("items").withIndex(...)) {
  // Process each doc
}
```
