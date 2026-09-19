# Incident 001: Application Unavailable via NodePort

**Date:** 2026-08-27
**Severity:** High (application completely unreachable from outside the cluster)

## Symptoms
- The application frontend and API did not load when accessed at `http://<node-ip>:30950`.
- Requests either timed out or were refused, despite all Pods showing `Running` and `1/1 Ready`.

## Impact
- Application was completely inaccessible to any external user/browser during the incident window.
- No data loss; internal cluster operations (ArgoCD, Prometheus) were unaffected.

## Detection
Manually observed while attempting to open the application in a browser after a successful deployment.

## Investigation
1. Confirmed Pods were healthy:
   ```bash
   kubectl get pods -n employee-management-app
   ```
2. Confirmed the Service was correctly configured (`NodePort`, port `3000:30950/TCP`):
   ```bash
   kubectl get svc -n employee-management-app
   ```
3. Confirmed the application actually responded from **inside** the cluster:
   ```bash
   kubectl run test-curl --image=curlimages/curl -n employee-management-app --rm -it -- \
     curl http://employee-app-service:3000/health
   ```
   This succeeded, isolating the problem to network reachability, not the application itself.
4. Checked the worker node's AWS Security Group:
   ```bash
   aws ec2 describe-security-groups --group-ids <sg-id> --region ap-south-1
   ```
   Found only one rule: all traffic permitted from the Security Group itself (a self-referencing
   rule intended for pod-to-pod communication). No rule existed allowing inbound traffic from the
   public internet on port `30950`.

## Root Cause
The worker node's Security Group had no inbound rule permitting external traffic on the application's
NodePort. Kubernetes-level configuration (Pods, Service) was entirely correct; the request was being
blocked at the AWS network layer before ever reaching the node.

## Resolution
Added an inbound rule to the Security Group:
```bash
aws ec2 authorize-security-group-ingress --group-id <sg-id> \
  --protocol tcp --port 30950 --cidr 0.0.0.0/0 --region ap-south-1
```

## Verification
```bash
curl http://<node-external-ip>:30950/health
```
Returned `{"status":"ok"}`. Confirmed the application loaded correctly in a browser afterward.

## Preventive Action
- This fix currently exists only in AWS (applied via CLI), not yet reflected in the Terraform
  configuration — tracked as an open gap. Terraform should be updated to include this ingress rule so
  the environment is fully reproducible from code.
- Consider restricting the rule's source to a Load Balancer's Security Group rather than
  `0.0.0.0/0` in a production-equivalent setup.

## Lessons Learned
A fully healthy Kubernetes deployment can still be completely unreachable due to a cloud-provider
network control (Security Group) sitting outside Kubernetes' own visibility. Troubleshooting
"unreachable" symptoms should always include a network-layer check (test from inside the cluster
first, to isolate app vs. network issues) before assuming an application-level bug.
