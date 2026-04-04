---
description: Add or update an entry in the site changelog (bundles/updates/updates.json)
---

# Changelog Update Workflow

This workflow adds or updates an entry in `bundles/updates/updates.json`, which is displayed on the homepage under "Recent Updates".

## Input Required

The user must provide:
- **Type**: `update` or `patch`
- **Version number**: integer (e.g. `1`, `2`, `3`)
- **Description**: A short, user-facing summary of what changed (functional only, no technical details)

If the user doesn't provide the description, generate one from the context of recent changes made in the conversation. Keep it simple and functional — this is displayed to end users.

## Steps

1. Read the current file at `c:\github\mc4db-2.0\bundles\updates\updates.json`

2. Check if an entry with the same `type` AND `version` already exists:
   - **If it exists**: **APPEND** the new description to the existing one (do NOT replace). Read the current description first, then add the new text at the end. Update the `date` to today.
   - **If it doesn't exist**: Add a new entry with today's date

3. Entry format:
```json
{
  "type": "update",
  "version": 1,
  "date": "YYYY-MM-DD",
  "description": "Short functional description."
}
```

4. Save the file, keeping entries sorted by date descending (newest first)

5. Confirm to the user what was added/updated

## Rules
- Version numbers are integers, not decimals (use `1` not `1.0`)
- Descriptions should be simple, user-facing, and functional — no technical jargon
- The date is always today's date (from system time)
- The homepage displays only the 3 most recent entries
- When appending to an existing description, separate items with `\n` so each change appears on its own line
