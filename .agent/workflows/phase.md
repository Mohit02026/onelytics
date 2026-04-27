# /phase — Phase Gate Check

Run when you think a phase is complete before moving to the next.

## Check the Gate
Read workflow.md and run through the gate checklist for the current phase.

## For Each Item
Test it manually or show me the code that proves it works.
Do not mark a gate item as passed without evidence.

## If Gate Passes
1. Update AGENTS.md — mark phase complete
2. Update SESSION.md — set next phase tasks
3. Run: git tag phase-X-complete
4. Push to GitHub
5. Confirm ready for next phase

## If Gate Fails
List what failed and what needs to be fixed before we can proceed.
Do not move to the next phase until every gate item passes.
