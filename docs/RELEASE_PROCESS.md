# GLASSSKIN — Release Process

This document is the canonical reference for how code goes from a merged PR to a live app in the App Store and Google Play. Follow it for every release.

---

## Table of Contents

1. [Branching Model](#branching-model)
2. [Version Bump Process](#version-bump-process)
3. [Changelog Guidelines](#changelog-guidelines)
4. [EAS Secrets Setup](#eas-secrets-setup)
5. [Building with EAS](#building-with-eas)
6. [CI Workflow & Branch Protection](#ci-workflow--branch-protection)
7. [Store Submission](#store-submission)
8. [Rollback Plan](#rollback-plan)

---

## Branching Model

We use a lightweight trunk-based model:

```
main                    ← production-ready trunk, protected
release/vX.Y.Z          ← staging branch per release (cut from main)
feature/<ticket>        ← short-lived feature branches off main
fix/<ticket>            ← bug fix branches off main
hotfix/<ticket>         ← emergency branches cut off a release tag
```

### Rules

| Branch | Who merges | CI required | EAS Build triggered |
|--------|-----------|------------|---------------------|
| `main` | Pull Request | ✅ Mandatory | On version tag push |
| `release/*` | Lead developer | ✅ Mandatory | Manual via `workflow_dispatch` |
| `feature/*` | Author via PR | ✅ Mandatory | ❌ No |
| `hotfix/*` | Lead developer | ✅ Mandatory | Manual trigger |

**Direct pushes to `main` are blocked** (see [CI Workflow & Branch Protection](#ci-workflow--branch-protection)).

---

## Version Bump Process

We follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

| Change Type | Example | Version Bump |
|------------|---------|--------------|
| Breaking change | Nav redesign | `MAJOR` |
| New feature | Wishlist | `MINOR` |
| Bug fix / perf | Crash fix | `PATCH` |

### Step-by-Step

1. **Update `package.json` version:**
   ```bash
   npm version patch    # or minor / major
   ```
   This bumps `package.json` and creates a git commit + tag automatically.

2. **Update `app.json` version** (must match `package.json`):
   ```json
   { "expo": { "version": "1.2.3" } }
   ```
   > [!IMPORTANT]
   > EAS `"autoIncrement": true` in `eas.json` manages `buildNumber` (iOS) and `versionCode` (Android) automatically — never set these manually.

3. **Update `CHANGELOG.md`** (see next section).

4. **Push the version tag to GitHub:**
   ```bash
   git push origin main --tags
   ```
   Pushing a `v*` tag triggers the [EAS build workflow](.github/workflows/eas-build.yml) automatically.

---

## Changelog Guidelines

Maintain a `CHANGELOG.md` in the repo root following [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [Unreleased]

## [1.2.3] - 2026-07-16
### Added
- Swipe-to-delete in CartScreen

### Fixed
- Race condition during checkout stock validation

### Security
- Hardened RLS policies on push_tokens table
```

**Rules:**
- Keep an `[Unreleased]` section at the top for in-progress work.
- Move unreleased items to the new version section when cutting a release.
- Every PR that adds a feature or fixes a bug must add a changelog entry.

---

## EAS Secrets Setup

> [!CAUTION]
> Never commit real secrets to the repository. All production credentials must be stored in EAS Secrets, not in `.env` files or `eas.json`.

### Required Secrets

These must be configured as **EAS Secrets** via the [Expo Dashboard](https://expo.dev) or the EAS CLI before any production build can succeed:

| Secret Name | Description | Type |
|------------|-------------|------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project REST API URL | Plain |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous public key | Plain |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (pk_live_…) | Plain |
| `SENTRY_AUTH_TOKEN` | Sentry auth token for source map upload | Secret |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN for the app | Plain |
| `EXPO_PUBLIC_PROJECT_ID` | Expo project ID (from expo.dev) | Plain |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (Edge Functions only) | Secret |

Additionally, configure these **GitHub Actions Secrets** (used only by the workflow runner, never in the app bundle):

| GitHub Secret | Description |
|--------------|-------------|
| `EXPO_TOKEN` | Expo access token for EAS CLI authentication |

### How to Add EAS Secrets

**Via EAS CLI (preferred):**
```bash
# Install EAS CLI if not already installed
npm install --global eas-cli

# Log in to your Expo account
eas login

# Push a secret to EAS (you will be prompted for the value)
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --type string

# Or push from a file (for keys/certs)
eas secret:create --scope project --name GOOGLE_PLAY_KEY --type file --value ./secrets/key.json
```

**Via Expo Dashboard:**
1. Go to [expo.dev](https://expo.dev) → Your Project → **Secrets**
2. Click **Add** → enter the name and value → **Save**

> [!WARNING]
> `SENTRY_AUTH_TOKEN` must be set as an EAS Secret (not a GitHub Secret) because it is consumed by the EAS build worker during the `@sentry/react-native` source map upload step — GitHub Actions cannot inject secrets into EAS cloud builds.

### Verifying Secrets Are Not Leaked

The `eas-build.yml` workflow deliberately does **not** echo or log any secret values. Confirm:
- `EXPO_TOKEN` is only referenced in `env:` blocks within individual steps, never in `run:` commands.
- No `echo ${{ secrets.* }}` or `cat` of secret-containing files.
- EAS build logs are private by default; set visibility in the EAS Dashboard.

---

## Building with EAS

### Automatic (CI-triggered)

Push a version tag to trigger an automatic production build and submission gate:

```bash
git tag v1.2.3
git push origin v1.2.3
```

This triggers the `eas-build.yml` workflow → **build** job runs immediately → **submit** job requires manual approval in GitHub (go to **Actions → Workflow Run → Review deployments**).

### Manual (workflow_dispatch)

1. Go to **GitHub → Actions → EAS Build & Submit**
2. Click **Run workflow**
3. Select `profile` (preview / production), `platform` (all / ios / android), and whether to submit.

### Local EAS Build (for debugging)

```bash
# Build for local simulator/emulator
eas build --profile development --platform ios --local

# Build preview APK locally
eas build --profile preview --platform android --local
```

---

## CI Workflow & Branch Protection

### What CI checks on every PR

The `ci.yml` workflow runs three checks in sequence:

1. **TypeScript typecheck** (`npm run typecheck`) — zero type errors allowed
2. **ESLint** (`npm run lint`) — zero lint errors allowed (warnings are allowed but tracked)
3. **Jest tests** (`npm test`) — all tests must pass

### Platform-Parity Checklist (Pre-Merge Verification)

> [!WARNING]
> Testing exclusively on the Expo Web preview or a single platform creates a high risk of shipping silently broken code to native users. 
> The recent native regressions (where 3D models crashed with `ERR_UNKNOWN_URL_SCHEME` and the marquee animation froze) occurred because the code was only verified in a browser environment, hiding compiler bugs and native-only crashes.

Any Pull Request modifying layouts, adding animations, or introducing platform-conditional branches (`Platform.OS` checks, `.web.tsx` files, or native-only APIs) must undergo manual verification on both of the following before being merged:
* [ ] **iOS Simulator**: Verify layout, safe areas, and animation performance.
* [ ] **Android Emulator / Physical Device**: Specifically verify both gesture and 3-button navigation layouts, and check logcat output for native module errors.

**Parity Verifications:**
* **Tailwind & Stylesheet Conflicts:** Ensure custom React Native style identifiers (e.g. `btnPrimary`) do not conflict with NativeWind/Tailwind keyword selectors (like `primary`), which strips backgrounds on native compilations.
* **WebView Access & Schemes:** Ensure third-party web scripts loaded in WebViews have proper filesystem/CORS access (`allowFileAccess={true}`) and handle or filter deep-linking schemes (such as `intent://`) that crash native WebViews.
* **Reanimated worklets:** Ensure `babel.config.js` includes Reanimated plugins and animations execute smoothly on the UI thread without dropping frames.
* **Safe-Area Insets:** Ensure floating navigation components use dynamic offsets (`useSafeAreaInsets()`) instead of hardcoded values, clearing both Android 3-button bars and iOS Home Indicators.

### Required Branch Protection Setup (manual — do this in GitHub)

> [!IMPORTANT]
> Branch protection rules must be configured manually in GitHub repository settings. CI is useless without them.

1. Go to **GitHub → Repository → Settings → Branches**
2. Click **Add branch protection rule**
3. Branch name pattern: `main`
4. Enable the following:
   - ✅ **Require a pull request before merging**
     - Required approving reviews: `1` (or more)
     - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ **Require status checks to pass before merging**
     - Click **Search for status checks** and add:
       - `Typecheck · Lint · Test` (the exact job name from `ci.yml`)
   - ✅ **Require branches to be up to date before merging**
   - ✅ **Do not allow bypassing the above settings** (prevents admins from force-merging)
5. Click **Save changes**

### Production GitHub Environment (for EAS submit gate)

1. Go to **GitHub → Repository → Settings → Environments**
2. Create an environment named `production`
3. Under **Deployment protection rules**, add **Required reviewers** (yourself and/or team leads)
4. This gates the `submit` job in `eas-build.yml` — the submission cannot proceed until a reviewer clicks **Approve** in the GitHub Actions UI

---

## Store Submission

### iOS — TestFlight → App Store

| Stage | How | Manual? |
|-------|-----|---------|
| Internal testing | `eas submit` via workflow | After manual GitHub approval |
| External TestFlight | Promote in App Store Connect | ✅ Yes — in ASC UI |
| App Store review | Submit for review in ASC | ✅ Yes — in ASC UI |
| Release | Manual or phased release | ✅ Yes — in ASC UI |

### Android — Internal → Play Store

| Stage | How | Manual? |
|-------|-----|---------|
| Internal testing | `eas submit --track internal` via workflow | After manual GitHub approval |
| Closed testing (Alpha) | Promote in Play Console | ✅ Yes — in Play Console |
| Open testing (Beta) | Promote in Play Console | ✅ Yes — in Play Console |
| Production release | Promote with staged rollout | ✅ Yes — in Play Console |

> [!NOTE]
> Neither `eas-build.yml` nor any CI step performs a direct production store release. All store promotions beyond internal testing are intentionally manual, requiring a human to click in App Store Connect or Play Console.

---

## Rollback Plan

### For OTA-eligible fixes (JS-only changes)

GLASSSKIN uses Expo's update channel system. If a production release has a JS-layer bug:

```bash
# Roll back the "production" channel to the previous stable update
eas channel:edit production --branch <previous-stable-branch>
```

Users receive the rollback automatically within minutes, without going through store review.

> [!WARNING]
> OTA updates cannot roll back native code changes (new Expo modules, native dependencies). Those require a full store submission.

### For native-layer bugs

1. **Hotfix branch**: Cut `hotfix/<ticket>` from the broken release tag.
2. **Fix and test locally**: Run CI locally (`npm run typecheck && npm run lint && npm test`).
3. **Open a PR** to `main` — CI must pass.
4. **After merge, tag immediately**:
   ```bash
   npm version patch
   git push origin main --tags
   ```
5. This triggers the EAS build workflow; approve the environment gate to submit.
6. **Expedited review**: Both Apple and Google have expedited review processes for critical bugs — use them.

### "Stop the bleeding" emergency stop

If you need to immediately prevent new users from downloading a broken version:

- **App Store**: In App Store Connect → Pricing and Availability → **Remove from sale** (immediately hides the app from search while keeping existing installs).
- **Play Console**: Go to Production → Managed Publishing → **Halt rollout** (pauses staged rollout if you're mid-rollout).

---

## Staged Rollout & Hotfix Strategy

Never release an update to 100% of the user base instantly. A staged rollout minimizes the blast radius of a critical bug or crash that bypassed the CI/CD pipeline.

### Rollout Plan

**Google Play Console:**
1. Navigate to your Production track.
2. Select **Create new release**.
3. Under "Rollout percentage", enter **5%**.
4. Monitor Sentry crash rates and PostHog conversion metrics for 24 hours.
5. If stable, increase the rollout to **20%** -> **50%** -> **100%** over the next 3 days.

**Apple App Store Connect:**
1. During version submission, navigate to the **Phased Release for Updates** section.
2. Select **Release update over a 7-day period**.
3. Apple automatically handles the percentage ramp-up (1% -> 2% -> 5% -> 10% -> 20% -> 50% -> 100%).
4. Monitor Sentry. You can manually pause the phased release in App Store Connect for up to 30 days if you detect a critical issue.

### Tied Rollback / Hotfix Workflow

If a critical issue (e.g., checkout crash) is detected during the 5% (Play) or 1% (Apple) initial rollout phase:

1. **Halt the Store Rollout**:
   - Play Console: Click **Halt rollout**.
   - App Store Connect: Click **Pause Phased Release**.
2. **Immediate OTA Rollback (If JS-only issue)**:
   - Immediately revert the impacted 5% of users to the previous stable JavaScript bundle using EAS Update.
   ```bash
   eas channel:edit production --branch <previous-stable-branch-name>
   ```
3. **Develop Hotfix**:
   - Check out a hotfix branch: `git checkout -b hotfix/crash-fix`
   - Fix the bug and push a PR. Ensure the CI pipeline passes (typecheck, lint, tests).
4. **Deploy Hotfix**:
   - Merge the hotfix to `main`.
   - Bump version (`npm version patch`), push tags, and let the `eas-build.yml` workflow generate a new native binary (if native code changed) or publish a new EAS Update (if JS only).
5. **Resume Staged Rollout**:
   - Upload the new binary to the stores and begin a new 5% staged rollout.

---

## Useful Commands Reference

```bash
# Check EAS project status
eas project:info

# List all EAS builds
eas build:list

# View specific build logs
eas build:view <build-id>

# List update channels
eas channel:list

# Manage EAS secrets
eas secret:list
eas secret:create --scope project --name MY_SECRET --type string
eas secret:delete --id <secret-id>

# Promote an update to a different channel
eas channel:edit <channel-name> --branch <branch-name>
```
