---
name: Restore a shared Vendure Insights layout nightly
description: Use a single-file scheduled task to copy a template administrator's Insights widget layout to all other administrators while preserving their personal settings.
---

We will restore the existing React Dashboard Insights layout each night by copying a designated administrator's saved layout. A single-file scheduled task accepts the template login identifier in its constructor. This is a periodic reset, not a locked dashboard.

## Scope and prerequisites

This approach was verified against Vendure **3.6.3**. Read the [Vendure best practices](../best-practices/vendure-best-practices.md) before implementing it, and the [coding and testing best practices](../best-practices/coding-best-practices.md) before writing tests.

Enable `DashboardPlugin` and `DefaultSchedulerPlugin`, and run a worker. Choose a template account and have it save an Insights layout. The plain cron `0 3 * * *` uses the scheduler's default timezone; it does not explicitly select Amsterdam or implement daylight-saving handling.

In 3.6.3, `vendure.dashboard.userSettings` stores user-scoped settings. Its `widgetLayout` maps widget IDs to `{ x, y, w, h }`. Check the installed dashboard's `user-settings.tsx` and Insights route before adapting this to another version. Do not assume this internal settings shape is stable across upgrades.

## Implementation

1. In the Vendure application, create `src/sync-insights-layout-task.ts`:

```ts
import {
  Administrator, Logger, RequestContextService, ScheduledTask,
  SettingsStoreService, TransactionalConnection,
} from '@vendure/core';

const key = 'vendure.dashboard.userSettings';
type Settings = Record<string, unknown> & {
  widgetLayout?: Record<string, { x: number; y: number; w: number; h: number }>;
};

/** Restores administrator layouts without replacing their other preferences. */
export class SyncInsightsLayoutTask extends ScheduledTask {
  /** Accepts the template login identifier, not its administrator ID. */
  constructor(templateIdentifier: string) {
    super({
      id: 'sync-insights-layout',
      description: 'Restore the shared Insights layout',
      schedule: '0 3 * * *',
      execute: async ({ injector, scheduledContext }) => {
        const connection = injector.get(TransactionalConnection);
        const contexts = injector.get(RequestContextService);
        const store = injector.get(SettingsStoreService);

        // Read the template in its own user scope.
        const admins = await connection.getRepository(scheduledContext, Administrator)
          .find({ relations: ['user'] });
        const template = admins.find(a => a.user.identifier === templateIdentifier);
        if (!template) {
          Logger.warn('Template administrator missing; skipping', 'SyncInsightsLayoutTask');
          return;
        }
        const templateCtx = await contexts.create({ apiType: 'admin', user: template.user });
        const source = await store.get<Settings>(templateCtx, key);
        if (!source?.widgetLayout || !Object.keys(source.widgetLayout).length) {
          Logger.warn('Template layout missing; skipping', 'SyncInsightsLayoutTask');
          return;
        }

        // Preserve each recipient's other settings; skip the template itself.
        for (const admin of admins) {
          if (admin.id === template.id) continue;
          const ctx = await contexts.create({ apiType: 'admin', user: admin.user });
          const current = await store.get<Settings>(ctx, key);
          const result = await store.set(ctx, key, {
            ...current, widgetLayout: source.widgetLayout,
          });
          if (!result.result) throw new Error(`Layout sync failed: ${result.error}`);
        }
      },
    });
  }
}
```

2. Import the task in `vendure-config.ts`. Append it to existing `schedulerOptions.tasks`, without dropping other tasks:

```ts
schedulerOptions: {
  tasks: [new SyncInsightsLayoutTask('template-admin@example.com')],
},
```

Replace the example identifier with the chosen account's login. Deploy the server and worker. No migration or new environment variable is required.

## Verification

3. Add an e2e test using `createTestEnvironment`, SQL.js, `DashboardPlugin`, and `DefaultSchedulerPlugin`. For this server-only test, set `runTasksInWorkerOnly: false` and a short `manualTriggerCheckInterval`.

4. Create a recipient administrator through GraphQL. Save different template and recipient preferences through `setSettingsStoreValue`. As superadmin, call:

```graphql
mutation {
  runScheduledTask(id: "sync-insights-layout") { success }
}
```

Poll `getSettingsStoreValue` as the recipient with a bounded wait. Expect the template layout and the recipient's original language/theme. Verify the template stays unchanged. Separately execute the task with an unknown template, and with a template lacking a saved layout: both should warn and leave recipients untouched. Assert the cron string. Do not wait until 03:00 in tests.

5. Run the application's test suite, TypeScript checks, and dashboard build. In the verified application these were `npm test`, `npx tsc --noEmit`, `npx tsc --noEmit -p tsconfig.e2e.json`, and `npm run build`, from its Vendure directory; adapt to local scripts.

## Limitations

Existing tabs need a reload. Saving stale dashboard settings can overwrite the nightly reset. Permissions still control which widgets and data each administrator sees. New admins receive the layout on the next run. A failed write stops the task after any earlier recipients were updated; rerunning is safe. For continuous enforcement, use a separate dashboard customization rather than claiming this cron locks the layout.
