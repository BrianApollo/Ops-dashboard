# _unbound

Files in this folder don't have a clear domain home in the current architecture.

## Files

### ForbiddenPage.tsx
**Reason:** Generic error page that doesn't belong to any specific domain. Could potentially move to:
- `core/error/` - if we create a core error handling module
- `domains/error/` - if error pages become a domain
- Stay here if it remains a standalone utility page

### CreativesTab.tsx
**Reason:** Transitional wrapper component that aggregates Scripts, Videos, and Images tabs.
This component exists as a convenience wrapper but may be deprecated in favor of:
- Direct usage of individual tab components
- A more structured composition pattern in the products domain

The component has complex prop drilling and coordinates state between sub-tabs, which makes
it a candidate for refactoring rather than placement in a specific domain.

## Guidelines

Files placed in `_unbound` should:
1. Be functional and tested
2. Have a documented reason for being here
3. Be reviewed periodically for proper domain placement
4. Not grow indefinitely - this is a holding area, not a dumping ground
