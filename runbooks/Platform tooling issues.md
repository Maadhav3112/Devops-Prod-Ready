# Runbook: Platform Tooling & CI/CD Issues

**Scope:** Docker build, ArgoCD CLI, GitLab CI/CD pipeline, and ArgoCD
server availability issues encountered while operating the employee
management platform.

---

## Issue 1: Docker build fails with missing build context

**Problem**
`docker build` fails immediately with a buildx argument error instead of
building the image.

**Symptoms**
```
docker build -t raiden004/employee-app:v2.0
ERROR: docker: 'docker buildx build' requires 1 argument
```

**Checks**
- Confirm the exact command being run and compare against Docker's
  required syntax (`docker build -t <tag> <path>`).

**Investigation**
`docker build` always requires a `PATH` (build context) argument in
addition to `-t`. The context path was omitted, so Docker had no
directory to read the `Dockerfile` and source files from.

**Resolution**
```bash
docker build -t raiden004/employee-app:v2.0 .
```
Run from inside the folder containing the `Dockerfile` (the
`application/` folder), or point at it explicitly:
```bash
docker build -f <path-to-Dockerfile> -t raiden004/employee-app:v2.0 <context-path>
```

**Verification**
Re-ran the corrected command; image built successfully and appeared in
`docker images`.

**Status:** ✅ Resolved

---

## Issue 2: `argocd` CLI not found

**Problem**
`argocd` commands fail because the CLI binary isn't installed on the host.

**Symptoms**
```
argocd app history employee-mangement
bash: argocd: command not found
```

**Checks**
- Confirmed `kubectl` was installed and working
- Confirmed `argocd` was absent from `$PATH`

**Investigation**
The Argo CD CLI is a separate binary from `kubectl` — it talks to the
Argo CD API server, not the Kubernetes API directly — and had never been
installed on this EC2 instance.

**Resolution**
```bash
curl -sSL -o /usr/local/bin/argocd \
  https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x /usr/local/bin/argocd
argocd login localhost:8080 --username admin --password <password> --insecure
```

**Verification**
`argocd version` returned client and server versions; `argocd app list`
returned the deployed applications successfully.

**Status:** ✅ Resolved

---

## Issue 3: Wrong flag used with `argocd` CLI

**Problem**
`argocd app history` fails with the same "not found"-style error even
after the CLI was installed, when a `-n` namespace flag is added.

**Symptoms**
```
argocd app history employee-mangement -n argocd
```
Fails / behaves unexpectedly.

**Checks**
- Verified the app name spelling via `argocd app list`
- Compared `argocd` CLI flag conventions against `kubectl`'s

**Investigation**
`-n <namespace>` is `kubectl` syntax for targeting a Kubernetes
namespace. The `argocd` CLI instead talks to the already-authenticated
Argo CD API server (via `argocd login`), so it doesn't accept `-n` the
same way for this command — the flag (and the app name typo,
"mangement") were both incorrect.

**Resolution**
```bash
argocd app list                          # confirm exact app name first
argocd app history employee-management   # correct name, no -n flag
```

**Verification**
Command returned the deployment history for `employee-management` as
expected.

**Status:** ✅ Resolved

---

## Issue 4: GitLab CI/CD pipeline not triggering after push

**Problem**
Pushing commits to GitLab does not trigger a pipeline run.

**Symptoms**
- No pipeline appears after `git push`
- No errored/skipped entry visible via CLI-based checks

**Checks performed so far**
- Custom CI/CD config path setting reviewed: **Settings → CI/CD →
  General pipelines → CI/CD configuration file** — currently set to
  `.github/gitlab-ci.yml`
- Confirmed the file at that path contains valid GitLab CI syntax
  (`stages:`, `services: docker:24-dind`, `rules: if: $CI_COMMIT_BRANCH`)
  — not a GitHub Actions file, despite living under a `.github/` folder
- Confirmed default branch is `master`, matching the pipeline's `rules`
- Confirmed a new commit was pushed *after* saving the config path change

**Investigation**
Root cause not yet confirmed. Two remaining candidates:
1. The configured path string doesn't match the tracked file path
   character-for-character (case sensitivity or hidden typo)
2. CI/CD is disabled at the project level (**Settings → General →
   Visibility, project features → CI/CD** toggle)

**Next steps to close out**
```bash
git ls-files | grep -i yml     # confirm exact tracked path/filename
```
Compare the output exactly against the Settings field, character for
character. Also check the project's **Pipelines** tab directly (not just
CLI history) to confirm whether it's genuinely empty or shows a
skipped/errored run that CLI checks missed.

**Resolution**
_Pending — not yet applied._

**Verification**
_Pending — will be a successful pipeline run appearing in the Pipelines
tab immediately after the next push._

**Status:** 🟡 Open

---

## Issue 5: `argocd-server` port-forward failing intermittently

**Problem**
`kubectl port-forward` to `argocd-server` drops with a connection-refused
error partway through use, despite the pod appearing healthy.

**Symptoms**
```
kubectl port-forward svc/argocd-server -n argocd 8080:443 --address=0.0.0.0
Forwarding from 0.0.0.0:8080 -> 8080
Handling connection for 8080
Handling connection for 8080
E... failed to connect to localhost:8080 inside namespace ...: connection refused
error: lost connection to pod
```

**Checks**
- `argocd-server` pod confirmed `Running`/`Ready`, 0 restarts — not
  crash-looping
- Cluster is 3 nodes on **t3.small** (2GB RAM each)
- `monitoring-grafana` pod showed **2/3 READY** — one container not
  ready, consistent with resource pressure
- Noted timing: issue began shortly after installing the full
  `kube-prometheus-stack` (Prometheus, Grafana, Alertmanager,
  kube-state-metrics, node-exporters)

**Investigation**
Working theory: node-level resource pressure introduced by the newly
installed monitoring stack, possibly worsened if `argocd-server` and the
heavier Prometheus/Grafana pods landed on the same undersized node.

**Next steps to confirm**
```bash
kubectl get pods -n argocd -o wide
kubectl get pods -n monitoring -o wide
kubectl describe nodes | grep -A5 "Conditions:"
```

**Resolution**
_Pending confirmation._ If resource pressure is confirmed:
- Trim the monitoring stack's resource requests/retention via a Helm
  values override (lower memory requests/limits, shorter Prometheus
  retention)
- Add node affinity/anti-affinity so `argocd-server` doesn't share a
  node with the Prometheus/Grafana pods
- Longer-term: resize nodes from `t3.small` to `t3.medium` once actual
  workload footprint is known

**Verification**
_Pending — will be a sustained port-forward session with no dropped
connections, and Grafana showing 3/3 ready._

**Status:** 🟡 Open — mitigation identified, not yet applied

---

## Recurring themes for the Technical Decision Records section

- **Issue 4** stems from conflating GitHub's `.github/` folder convention
  with GitLab's separate CI config mechanism — worth a TDR entry on CI/CD
  platform conventions if pushing to both remotes is a recurring pattern.
- **Issue 5** stems from under-provisioning node size before the full
  monitoring stack's footprint was known — a good TDR entry: *"Chose
  t3.small initially for cost; revisited to t3.medium once
  Prometheus/Grafana/Alertmanager footprint was measured."*