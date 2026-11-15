## Git Workflow Rules (Strict Agent Instructions)

### 1. Branch Rules
- **`main` is the only permanent branch.** Never create or use a `develop` branch.
- **Never commit code directly to `main`.** All work must happen on a temporary branch created from `main`:
  - `feat/<name>` for new features
  - `fix/<name>` for bug fixes
  - `chore/<name>` for refactoring, dependency/CDN updates, or documentation/tooling
  - `hotfix/<vX.Y.Z>` for emergency production fixes (branch off the release Git tag, not `main`)
- **NEVER merge or create PRs:** You (the agent) are strictly forbidden from running `git merge`, `gh pr create`, or `gh pr merge`. The user handles all Pull Requests and merges manually on GitHub Web.

---

### 2. Step-by-Step Workflow for Every Task

**Step 0: Scope Alignment (Mandatory Before Coding)**
Before creating a branch or writing any code, always showcase the whole scope of the feature or fix (architecture, UI/UX flows, RTL/responsive layout, edge cases, and data models), especially for big features. Only begin coding after aligning with the user on the approach.

**Step 1: Start New Task**
Before writing any code for a new task, run:
```bash
git checkout main
git pull origin main
git checkout -b <type>/<branch-name>
```
*(If the user asks to start a new task while an older feature branch is still unmerged, STOP and remind the user to merge the current branch on GitHub first).*

**Step 2: Write Code & Commit**
- Commit changes to the current branch as you work.
- Keep refactoring/tooling chores separate from feature code on different branches when practical.

**Step 3: Pre-PR Checks & Push**
When the task is finished:
1. Verify the application works cleanly (check browser console for errors, test affected UI flows, and verify RTL/responsive layout). Fix all issues before pushing.
2. Mark the task as `[x]` in `AGENTS.md` on this branch so the roadmap update is included in the PR.
3. Commit and push the branch to GitHub:
```bash
git add .
git commit -m "<type>: <short summary>"
git push -u origin <branch-name>
```

**Step 4: Remind User to Open a PR (Mandatory Stop)**
Immediately after pushing the branch, **STOP working** and output this exact message to the user in chat (format the PR Description in a markdown code block for easy one-click copying):

> **🚀 Ready for Pull Request**
> - **Branch:** `<branch-name>` → `main`
> - **PR Title:** `<type>: <short summary>`
> - **PR Description:**
> ````markdown
> ### Overview
> <High-level summary>
>
> ### Key Changes
> - <Bullet changes list>
> ````
>
> **Your Next Steps:**
> 1. Go to GitHub Web and open a PR from `<branch-name>` into `main`.
> 2. Click **"Squash and merge"** and delete the branch on GitHub.
> 3. Tell me once it's merged so I can pull `main`, delete the local branch, and start the next task.

**Step 5: Post-PR Cleanup**
Once the user confirms the PR is squashed and merged on GitHub, run:
```bash
git checkout main
git pull origin main
git branch -D <old-branch-name>
```
*(Note: Use `-D` because GitHub Squash & Merge creates a new commit hash on `main`).*

---

### 3. Releases (Tag-Based)
When the user asks to create a new release:
1. Switch to `main`, pull the latest code, and create branch `chore/release-vX.Y.Z`.
2. Update `CHANGELOG.md` (and any version indicator in the app, if applicable).
3. Push `chore/release-vX.Y.Z` and trigger the **Step 4 PR Reminder**.
4. After the user merges the release PR on GitHub, pull `main` and tag the release:
```bash
git checkout main
git pull origin main
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin main --tags
```

---

### 4. Emergency Production Hotfix Flow
If live release `vX.Y.Z` needs an urgent fix while `main` contains unreleased work:
1. Branch from the **Git Tag**: `git checkout -b hotfix/vX.Y.(Z+1) vX.Y.Z`
2. Fix the bug, verify the application works cleanly with no console errors, commit, tag (`vX.Y.(Z+1)`), and push the tag.
3. Create a `fix/port-hotfix-vX.Y.(Z+1)` branch off `main`, cherry-pick the fix commit, push this branch, and trigger the **Step 4 PR Reminder** so the user can merge it into `main` on GitHub Web.
