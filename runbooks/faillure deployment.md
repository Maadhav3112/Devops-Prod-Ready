# Runbook: Failed Deployment (Stale Image / Code Change Not Reflected)

## Symptoms
- A code fix was made and pushed, but the running application still exhibits the old, broken
  behaviour after redeployment.
- Browser console shows an error (e.g. `Uncaught SyntaxError: Unexpected end of input`) that was
  already fixed in the source code.

## Checks
1. Confirm which image tag the Deployment is actually configured to use:
   ```bash
   kubectl describe deployment employee-app -n employee-management-app | grep Image
   ```
2. Confirm what image tag was most recently built and pushed:
   ```bash
   # On the CI/CD side, or locally:
   docker images | grep employee-api
   ```
3. Check the Deployment's `imagePullPolicy`:
   ```bash
   kubectl get deployment employee-app -n employee-management-app -o yaml | grep imagePullPolicy
   ```

## Investigation / Diagnosis
The Deployment referenced `raiden004/employee-api:latest`. A fix had been made locally and the image
rebuilt and pushed to Docker Hub under the same `:latest` tag — but the running Pods continued to
exhibit the old bug.

Root cause: `imagePullPolicy` was left at its default, `IfNotPresent`. Since a node had already
cached an image tagged `:latest` from an earlier pull, Kubernetes considered that tag "present" and
never re-pulled the newer version pushed to the registry — `:latest` is just a tag name, not a
guarantee of freshness, and by itself does not force Kubernetes to check the registry again.

## Resolution
1. Set `imagePullPolicy: Always` on the container so Kubernetes re-checks the registry on every Pod
   creation, regardless of what tag is cached locally:
   ```yaml
   containers:
     - name: employee-app
       image: raiden004/employee-api:latest
       imagePullPolicy: Always
   ```
2. Re-apply the Deployment:
   ```bash
   kubectl apply -f kubernetes/app-deployment.yml
   ```
3. Force existing Pods to be recreated (picking up the corrected policy and a fresh pull):
   ```bash
   kubectl rollout restart deployment employee-app -n employee-management-app
   ```

## Verification
```bash
kubectl rollout status deployment employee-app -n employee-management-app
kubectl get pods -n employee-management-app
```
Confirm new Pods are `Running`. Reload the application in the browser (hard refresh to bypass browser
cache) and confirm the previously-broken behaviour is now fixed.

## Root Cause (for reference)
`imagePullPolicy` defaulted to `IfNotPresent`, so a node with a previously-cached `:latest` image
never checked the registry for a newer version with the same tag, even after a corrected image had
been pushed.

## Improvement Recommendation
Beyond setting `imagePullPolicy: Always`, the more robust long-term fix is to stop relying on mutable
tags like `:latest` for deployments entirely, and instead deploy using immutable, unique tags (e.g. a
Git commit SHA, as the CI/CD pipeline now does: `$DOCKER_IMAGE:$CI_COMMIT_SHORT_SHA`) so each
deployment unambiguously references an exact, specific image build.