# CI/CD Pipeline Flow — employee-app

This diagram shows the full pipeline: from `git push` through build, test,
security scanning, image publishing, and GitOps-based deployment via ArgoCD.

```mermaid
flowchart TD
    A[Git Push to master] --> B[Install Dependencies<br/>npm install]
    B --> C[Run Tests<br/>npm test]
    C --> D[Static Analysis<br/>eslint]
    D --> E[Dependency Scan<br/>npm audit]
    D --> F[Secret Detection<br/>gitleaks]
    E --> G[Build Application<br/>node -c server.js]
    F --> G
    G --> H[Docker Build<br/>docker build + save image.tar]
    H --> I[Image Scan<br/>trivy HIGH/CRITICAL]
    I --> J[Container Test<br/>spin up app + mongo, hit /health/ready]
    J --> K{Container Test Passed?}
    K -- No --> Z1[Pipeline Fails<br/>Stop — image not pushed]
    K -- Yes --> L[Push to Registry<br/>Docker Hub]
    L --> M[ArgoCD Image Updater<br/>detects new tag]
    M --> N[ArgoCD syncs manifest<br/>to EKS cluster]
    N --> O[Health Verification<br/>argocd app wait --health]
    O --> P{Healthy?}
    P -- Yes --> Q[Deployment Complete ✅]
    P -- No --> R[Manual Rollback<br/>argocd app rollback]
    R --> S[Previous Version Restored]

    style Z1 fill:#5a1a1a,stroke:#ff4d4d,color:#fff
    style Q fill:#1a4d2e,stroke:#4dff88,color:#fff
    style R fill:#5a3d1a,stroke:#ffaa4d,color:#fff
    style S fill:#1a4d2e,stroke:#4dff88,color:#fff
```

## Stage-by-stage notes

| Stage | Tool | Blocking? |
|---|---|---|
| Install | npm | Yes |
| Test | npm test | Yes |
| Static Analysis | eslint | No (`allow_failure: true`) |
| Dependency Scan | npm audit | No (`allow_failure: true`) |
| Secret Detection | gitleaks | No (`allow_failure: true`) |
| Build | node syntax check | Yes |
| Docker Build | docker | Yes |
| Image Scan | trivy | No — *recommend changing to blocking for production* |
| Container Test | docker + health check | Yes |
| Registry Push | Docker Hub | Yes |
| Deploy | ArgoCD (GitOps, outside CI) | N/A — decoupled from CI |
| Health Verification | argocd app wait | Yes |
| Rollback | argocd app rollback | Manual trigger only |

## Why deployment is decoupled from CI

The CI pipeline's responsibility ends at pushing a scanned, tested image to
the registry. ArgoCD (with Image Updater) separately watches the registry/Git
and handles the actual cluster deployment. This avoids CI directly running
`kubectl` against the cluster, keeps deployment auditable via Git history, and
prevents drift between what's in Git and what's running.