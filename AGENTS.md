# Citadelle Development Constitution

This repository follows these permanent rules.

1. Canonical repo:
   `C:\Users\Révérend Doxa\Desktop\CITADELLE\repo\cier-platform`

2. Never implement directly on canonical main.

3. One agent = one isolated Git worktree.

4. All future temporary development worktrees must live only under:
   `C:\Users\Révérend Doxa\Desktop\CITADELLE\work\<LOT>\worktrees\`

5. Reports only under:
   `C:\Users\Révérend Doxa\Desktop\CITADELLE\work\<LOT>\reports\`

6. Temporary files only under:
   `C:\Users\Révérend Doxa\Desktop\CITADELLE\work\<LOT>\tmp\`

7. Never scatter project folders or files directly on Desktop.

8. Shared-tree parallelism is forbidden.

9. If worktree isolation fails: STOP. Never fall back to editing main.

10. Before implementation declare:
    `FILES_EXPECTED_TO_MODIFY`
    `FILES_EXPECTED_TO_CREATE`
    `DB_CHANGE`
    `MIGRATION`
    `REMOTE_MUTATIONS`

11. Unexpected changed files must equal 0 at completion.

12. Evidence First:
    never claim tests, build, deploy, or DB checks without executing them.

13. Never print secrets or `.env` values.

14. No Supabase, DB, or storage mutation without explicit GO.

15. No production deployment without explicit GO.

16. Preserve:
    `app.js`
    `.env`
    `.htaccess`
    `logs`
    and never use `rsync --delete` for production deployment.

17. Production builds must guard against local Supabase leakage:
    `LOCALHOST_LEAK=0`
    `PLACEHOLDER_SUPABASE=0`
    production ref=`nvyuyffywnuollaxguen`

18. Before declaring a task complete verify:
    canonical main unchanged unless explicitly integrating
    unexpected worktrees=0
    stray project files=0
    unexpected changed files=0

19. Prefer concise investigation and prompts. Do not reread the whole repository unnecessarily.

20. Use parallel agents only when tasks are genuinely independent and the benefit justifies the additional token usage.
