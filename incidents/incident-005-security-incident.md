# Incident 005: Controlled Secret Exposure Exercise

**Date:** [FILL IN — date you actually run this]
**Severity:** High (simulated — treated as if a real credential was exposed)

> This is a **deliberately staged exercise** using a dummy credential, run to demonstrate secret
> detection, removal, rotation, and prevention. It is not a real security incident. Follow the exact
> commands below, then fill in the observed output.

## Exercise steps — run these on your EC2 (in a scratch branch, not master)

### Step 1: Create a scratch branch
```bash
cd ~/employee-api
git checkout -b secret-exposure-test
```

### Step 2: Introduce a dummy credential into a tracked file
```bash
echo 'DUMMY_API_KEY=AKIA_FAKE_EXAMPLE_1234567890' >> application/config/db.js
git add application/config/db.js
git commit -m "test: accidental dummy credential commit (controlled exercise)"
```

### Step 3: Push the branch (exposing it in the remote repository)
```bash
git push gitlab secret-exposure-test
```

### Step 4: Detect it — using gitleaks, the same tool already in your CI pipeline
```bash
docker run --rm -v "$(pwd):/repo" zricethezav/gitleaks:latest detect --source=/repo --verbose
```
Record the exact output here:
```
[FILL IN — paste gitleaks' detection output]
```

You can also confirm detection happens automatically in CI, since `secret_detection` is already a
stage in `.github/.gitlab-ci.yml` — check the GitLab pipeline for this branch and confirm the job
either fails or flags the finding (currently configured with `allow_failure: true`, so document
whether that setting should be reconsidered for a real secret).

### Step 5: Remove the credential from the file
```bash
git checkout master -- application/config/db.js
git add application/config/db.js
git commit -m "fix: remove dummy credential from db.js"
git push gitlab secret-exposure-test
```

### Step 6: Remove it from Git history (since a plain revert leaves it in prior commits)
```bash
pip install git-filter-repo --break-system-packages   # if not already installed
git filter-repo --path application/config/db.js --invert-paths --force
```
> Note: `git filter-repo` rewrites history. For a real incident, coordinate with anyone else who has
> cloned the repository, since they would need to re-clone afterward.

### Step 7: "Rotate" the dummy credential
Since this is a dummy value, rotation is simulated by generating a new dummy value and confirming the
process — for a real credential, this step would mean generating a new key in the actual provider
(e.g. AWS IAM) and revoking the old one immediately:
```bash
echo "Simulated rotation: old dummy key AKIA_FAKE_EXAMPLE_1234567890 -> revoked."
echo "New dummy key generated: AKIA_FAKE_EXAMPLE_9876543210 (not committed anywhere)."
```

### Step 8: Verify the credential no longer appears anywhere in history
```bash
git log --all --full-history -p -- application/config/db.js | grep -i "DUMMY_API_KEY"
```
Expected: no output (confirms it's gone from history after `git filter-repo`).

### Step 9: Clean up — delete the scratch branch
```bash
git branch -D secret-exposure-test
git push gitlab --delete secret-exposure-test
```

## Fill in after running the exercise

**Detection:** [describe what gitleaks reported and how quickly]
**Removal:** [confirm the credential no longer appears in the working tree or history]
**Rotation:** [describe what real-world rotation would have involved for this credential type]
**Verification:** [paste the empty result from Step 8]

## Preventive Control
Recommend adding a **pre-commit hook** running gitleaks locally, so a credential is caught before it
is ever pushed, rather than relying solely on CI-stage detection after the fact:
```bash
# .git/hooks/pre-commit (example)
gitleaks protect --staged --verbose
```
Also recommend removing `allow_failure: true` from the `secret_detection` CI stage for real secrets,
so a genuine detection actually blocks the pipeline rather than just reporting a warning.

## Lessons Learned
Detection tooling (gitleaks) was already present in the CI pipeline from earlier work, but had never
been exercised against an actual positive case — this exercise confirms it works as intended, and
surfaces that `allow_failure: true` currently means a real detected secret would not stop a release
from proceeding, which is a gap worth closing.
