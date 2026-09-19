# Incident 003: Bad Deployment — Stale Image Not Refreshed

**Date:** 2026-08-25
**Severity:** Medium (application ran, but with previously-fixed bugs still present)

## Symptoms
- A JavaScript fix had been made to the frontend (`script.js`) and pushed to the image registry, but
  the running application still exhibited the original bug.
- Browser console showed: `Uncaught SyntaxError: Unexpected end of input at script.js:168`.

## Impact
- Users continued to experience a broken frontend (roster page failed to load) despite the fix
  already being merged and the image rebuilt/pushed.

## Detection
Observed directly via browser DevTools console while verifying a fix that had already been deployed.

## Investigation
1. Confirmed the Deployment's configured image reference:
   ```bash
   kubectl describe deployment employee-app -n employee-management-app | grep Image
   ```
   Showed `raiden004/employee-api:latest` — appeared correct.
2. Confirmed a new image had genuinely been built and pushed under the same tag.
3. Checked the Deployment's `imagePullPolicy`:
   ```bash
   kubectl get deployment employee-app -n employee-management-app -o yaml | grep imagePullPolicy
   ```
   Found it was unset, defaulting to `IfNotPresent`.

## Root Cause
Since the node already had an image cached under the tag `:latest` from an earlier pull, Kubernetes'
default `imagePullPolicy: IfNotPresent` considered that tag "present" and did not re-check the
registry for a newer image under the same tag — `:latest` is just a label, not a guarantee of
freshness, and does not by itself force a re-pull.

## Resolution
1. Set `imagePullPolicy: Always` on the container spec, forcing Kubernetes to check the registry for
   a newer image on every Pod creation:
   ```yaml
   containers:
     - name: employee-app
       image: raiden004/employee-api:latest
       imagePullPolicy: Always
   ```
2. Re-applied the Deployment and forced a rollout:
   ```bash
   kubectl apply -f kubernetes/app-deployment.yml
   kubectl rollout restart deployment employee-app -n employee-management-app
   ```

## Verification
```bash
kubectl rollout status deployment employee-app -n employee-management-app
```
Confirmed new Pods running. Reloaded the application in a browser (hard refresh) — the console error
was gone and the roster page loaded correctly.

## Preventive Action
- The CI/CD pipeline now tags images with the Git commit SHA (`$DOCKER_IMAGE:$CI_COMMIT_SHORT_SHA`)
  in addition to `:latest`, so deployments can reference an immutable, unambiguous image build rather
  than relying on a mutable tag at all.

## Lessons Learned
Mutable image tags (`:latest`) combined with the default `imagePullPolicy: IfNotPresent` is a common,
easy-to-miss source of "my fix isn't showing up" bugs — the deployed configuration can look completely
correct while still silently running stale code.
