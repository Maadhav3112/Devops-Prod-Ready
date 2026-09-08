# TDR: Logging Stack — Datadog vs. Prometheus/Grafana/Loki

**Decision:** Use Datadog for centralized log collection. Keep
Prometheus + Grafana for metrics (unaffected by this decision — see
`monitoring/prometheus/README.md` and `monitoring/grafana/README.md`).

**Status:** Implemented

---

## Context

The assignment (Section 8) asks for centralized log collection and
suggests "Loki, Fluent Bit, Fluentd, or another suitable solution." Loki
was attempted first, as the most natural pairing with the
already-running Prometheus/Grafana stack. Fluent Bit + CloudWatch was
attempted second. Both hit real, time-consuming blockers documented
below, which is what ultimately drove the move to Datadog.

---

## Problems actually faced with each option

### Loki (attempted first)

| Problem | Detail |
|---|---|
| PVC stuck in `Pending` | `storage-loki-0` PVC had no `StorageClass` to bind to — `unbound pvc must define a storage class` |
| No default StorageClass on the cluster | `kubectl get storageclass` showed only `gp2`, using the deprecated in-tree `kubernetes.io/aws-ebs` provisioner |
| In-tree provisioner incompatible | EKS (especially Auto Mode) requires the CSI-based `ebs.csi.aws.com` provisioner — the old `gp2` StorageClass couldn't actually provision volumes |
| Required installing a whole extra component | Had to install the **Amazon EBS CSI Driver** add-on, which itself required a new **IAM role + Pod Identity association** before it could even attempt to fix the original problem |
| Still pending after driver install | Confirmed via `kubectl describe pod loki-0` — same "unbound pvc" error persisted until a new `StorageClass` (`gp3-csi`, using `ebs.csi.aws.com`) was manually created and set as default |

**Total dependency chain to get Loki persistent storage working:**
EBS CSI Driver → IAM Role → Pod Identity Association → new StorageClass
→ delete/recreate stuck PVC — five separate steps before a single log
line could be stored persistently.

### Fluent Bit + CloudWatch (attempted second, to sidestep the PVC problem entirely)

| Problem | Detail |
|---|---|
| Manifest URL moved | Original AWS sample repo path 404'd (`curl` returned 14 bytes — a silent HTML error page, not YAML, on the first attempt with `-O` alone) |
| Second guessed URL also 404'd | `container-insights/fluent-bit/fluent-bit.yaml` didn't exist either; correct path was under `container-insights-monitoring/` |
| IAM/Pod Identity setup confusion | "EKS Pod Identity" is not a top-level IAM trusted-entity option — it's nested inside "AWS service → choose a service or use case," easy to miss |
| Wrong console screen reached | Initially landed on **IAM access entries** (Kubernetes API access) instead of **Pod Identity associations** (AWS permissions for a ServiceAccount) — these look similar but are unrelated features |
| Required a separate ConfigMap | Unlike a single self-contained YAML, this manifest expected a `fluent-bit-cluster-info` ConfigMap with cluster name/region as separate literals, not inline `{{placeholder}}` substitution as initially assumed |

### Datadog (final choice)

| Problem | Detail |
|---|---|
| Helm install conflicted with existing Operator | `helm install datadog-agent ...` failed: `CustomResourceDefinition "datadoginstrumentations.datadoghq.com" ... cannot be imported into the current release` — because the Datadog **Operator** (installed via the guided web wizard) already owned those CRDs |
| Redundant install path | Had two valid install methods (Operator-based wizard vs. raw Helm chart) active at once; resolved by sticking with the Operator-managed `DatadogAgent` resource and patching it directly instead of a second Helm install |
| Placeholder left in config | `clusterName` was left as the literal string `"your-cluster-name-here"` from the wizard's generated YAML, which also broke cluster-checks connectivity (`context deadline exceeded` errors in Agent logs) until patched |
| Unrelated noisy errors | `redisdb` check errors (`Authentication required`) appeared in Agent logs from auto-discovery of an unrelated Redis instance — took a moment to confirm these were unrelated to the actual logging pipeline and safe to ignore |

**Time to working, queryable logs:** Once the CRD conflict was
identified and the existing `DatadogAgent` resource was used instead of
a fresh install, log collection was confirmed working (`24.2k logs
found`) within minutes — no StorageClass, IAM role, or PVC chain
required at all.

---

## Advantages of Datadog over the Prometheus/Grafana/Loki path

| Factor | Loki (self-hosted) | Datadog |
|---|---|---|
| **Persistent storage dependency** | Requires a working StorageClass + CSI driver + bound PVC before it can store anything | None — Datadog's backend storage is fully managed, nothing to provision in-cluster |
| **Setup steps to first working log** | 5+ (CSI driver, IAM role, Pod Identity, StorageClass, PVC recreation) | 1 (Agent install via wizard/Operator) |
| **UI/query experience** | Grafana Explore + LogQL — functional but a steeper learning curve, separate tool from dashboards | Unified Logs view in the same UI as Infrastructure/APM, more polished search/filtering out of the box |
| **Correlates logs with infra automatically** | Manual — requires matching labels/tags yourself between Prometheus and Loki | Automatic — Agent tags every log line with Pod, node, cluster, namespace metadata by default |
| **Auto-discovery of workloads** | None — Promtail just tails what it's told to | Detected MongoDB running in-cluster automatically, offered to configure log parsing for it without extra config |
| **Failure mode when misconfigured** | Pod stuck `Pending` indefinitely, cryptic scheduler events | Clear, specific error messages (CRD ownership conflict, auth errors) surfaced directly in Agent logs |
| **Maintenance burden** | You own the whole pipeline — storage, retention, upgrades, scaling Loki itself | Fully managed backend — nothing to operate beyond the lightweight in-cluster Agent |

## Advantages Loki/self-hosted still has (why it's not a strictly worse choice)

- **Open-source and free at any scale** — no per-GB ingestion cost ever, which matters for the assignment's "sensible local/open-source" guidance
- **Fully portable** — no vendor dependency, works identically on any Kubernetes cluster, any cloud
- **Data stays in your own infrastructure** — relevant if there were compliance/data-residency constraints (not a concern for this project, but a real factor generally)
- **No trial/account limits** — Datadog's free tier and trial windows (this setup used a 14-day trial) don't apply

---

## Cost comparison

| | Loki (self-hosted) | Fluent Bit + CloudWatch | Datadog |
|---|---|---|---|
| **Software license** | Free (Apache 2.0) | Free (Apache 2.0) | Commercial — free tier limited, paid plans required beyond it |
| **Infra cost to run it** | EBS volume (~$0.08/GB-month for gp3) + compute headroom on existing nodes | No extra compute; CloudWatch charges apply instead | Small Agent resource footprint on existing nodes; no separate storage to provision |
| **Ingestion/storage cost** | $0 beyond the EBS volume itself | ~$0.50/GB ingested + ~$0.03/GB-month stored (CloudWatch Logs pricing) | Free tier: limited log volume/retention. Paid: **~$0.10/GB ingested** (Log Management pricing), separate from Infrastructure Monitoring host pricing (~$15–23/host/month if going beyond free tier) |
| **Cost at this project's scale (demo/short-lived, low volume)** | Effectively $0 (a few GB on a small EBS volume) | A few dollars at most, given low log volume | $0 during the 14-day trial used for this project; would incur cost if continued past the trial or free-tier limits |
| **Cost trajectory if scaled to real production** | Scales with storage + engineering time to operate Loki reliably (compaction, retention tuning, HA) | Scales roughly linearly with log volume — can get expensive at high volume, but no separate tool to maintain | Scales with both log volume **and** number of hosts/containers monitored — typically the most expensive option at real production scale, but includes APM/RUM/infra monitoring bundled in if those are also adopted |

**Bottom line on cost:** for this specific assignment's scale and
duration, all three options cost effectively nothing. Datadog's trial
made it free to use here, but is the option most likely to become the
**most expensive** of the three if this were run continuously in real
production — that trade-off is worth stating explicitly rather than
implying Datadog is "cheaper," which it generally is not at scale.

---

## Why Datadog was chosen despite the above

Given the repeated, environment-specific infrastructure blockers hit
with both Loki (StorageClass/CSI chain) and Fluent Bit (manifest paths,
IAM/Pod Identity console navigation), the deciding factor was **time
spent on plumbing versus time spent on the actual assignment
requirement** — getting centralized logs that could be searched and
correlated with a failure (Section 8's real requirement). Datadog
achieved that fastest, with clearer error messages when something did
go wrong, at zero cost for the trial period this project needed.

This is explicitly a **cost/portability trade-off**, not a claim that
Datadog is objectively better — documented here so the choice can be
defended and revisited if this moved toward real, ongoing production
use, where the self-hosted, open-source path would likely be the more
defensible long-term choice on cost grounds alone.

## Related documents

- `monitoring/prometheus/README.md` — Prometheus setup (unaffected by
  this decision, still used for metrics)
- `monitoring/grafana/README.md` — Grafana setup (unaffected, metrics
  only; not used for logs in the final setup)
- `docs/troubleshooting/log.md` — raw chronological record including
  the resource-pressure issue that also motivated moving off a
  self-hosted-everything approach
- `runbooks/database-connection-failure.md` — the controlled failure
  drill originally documented against Loki, re-run and confirmed against
  Datadog