# Security Recommendations (Production Hardening)

The current implementation is suitable for a controlled internship / learning environment.  
The following items should be added before real production use.

## Priority List

| Item | Why it matters |
|------|----------------|
| Multi-AZ managed database (RDS/Aurora) | Single-node DB is a single point of failure |
| Horizontal Pod Autoscaler + Cluster Autoscaler | Handle traffic spikes automatically |
| NetworkPolicies | Limit pod-to-pod and namespace traffic |
| Admission controllers (OPA/Kyverno) | Enforce security policies at deploy time |
| Image signing & verification | Prevent running tampered images |
| Centralized secret rotation | Reduce blast radius of leaked credentials |
| Runtime security (Falco) | Detect anomalous behaviour inside pods |
| Comprehensive alerting & on-call runbooks | Faster detection and response |
| Regular restore testing | Prove that backups actually work |
| Cost monitoring & budget alerts | Avoid unexpected cloud spend |

## Related Documents

- [Production Readiness Gap Analysis](../architecture/overview.md) (see main architecture document)
- [Cloud Architecture](../architecture/cloud-architecture.md)
- [Security Architecture](./security-architecture.md)
