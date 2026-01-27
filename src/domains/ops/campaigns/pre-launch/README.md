# campaigns/pre-launch/

**NOTE: This folder name is misleading.**

## What This Folder Actually Contains

This folder contains **campaign list/workspace UI** - NOT lifecycle prelaunch logic.

- `CampaignsTab.tsx` - Table view of campaigns with filtering
- `AddCampaignDialog.tsx` - Dialog for creating new campaigns
- `index.ts` - Exports

## Why It's Named "pre-launch"

Historical naming from before the lifecycle architecture was formalized.
The name suggests it's related to the launch lifecycle, but it's actually
a simple CRUD list view that exists independently of any launch workflow.

## Correct Mental Model

```
domains/ops/campaigns/
├── pre-launch/      ← Campaign LIST UI (this folder - misnamed)
├── launch/          ← Campaign LAUNCH workflow (lifecycle pattern)
│   ├── prelaunch/   ← Actual prelaunch phase (data preparation)
│   ├── launch/      ← Actual launch phase (FB execution)
│   └── postlaunch/  ← Actual postlaunch phase (persistence)
└── post-launch/     ← Campaign VIEW/MANAGE page (also misnamed)
```

## Do NOT Confuse With

- `launch/prelaunch/` - This is the REAL prelaunch phase (selection, validation, etc.)
- The lifecycle pattern applies to `launch/` folder, not to this folder

## Future Consideration

This folder could be renamed to `list/` or `workspace/` to avoid confusion,
but that's a Phase 3+ task requiring import updates across the codebase.
