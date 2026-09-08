# Runbook: Application Unavailable

## Symptoms
- Frontend/API does not load in the browser when hitting `http://<node-ip>:<nodeport>`.
- Request times out or is refused, even though Pods appear healthy in `kubectl get pods`.

## Checks
1. Confirm the application Pods are actually running:
   ```bash
   kubectl get pods -n employee-management-app
   ```
2. Confirm the Service exists and has the expected type/port:
   ```bash
   kubectl get svc -n employee-management-app
   ```
3. Confirm the application responds from *inside* the cluster (isolates app vs. network issue):
   ```bash
   kubectl run test-curl --image=curlimages/curl -n employee-management-app --rm -it -- \
     curl http://employee-app-service:3000/health
   ```
4. Get the actual node's external IP:
   ```bash
   kubectl get nodes -o wide
   ```

## Investigation / Diagnosis
If Step 3 succeeds (the app responds correctly from inside the cluster) but the same request fails
from outside the cluster (a laptop browser), the problem is **not** the application — it is network
reachability between the outside world and the node.

The most common cause in this environment: the worker node's AWS Security Group has no inbound rule
permitting traffic on the NodePort. Check the Security Group directly:
```bash
aws ec2 describe-instances --instance-ids <node-instance-id> \
  --query "Reservations[0].Instances[0].SecurityGroups[*].GroupId" --region ap-south-1 --output text

aws ec2 describe-security-groups --group-ids <sg-id> --region ap-south-1 \
  --query "SecurityGroups[0].IpPermissions"
```
If no rule exists for the NodePort (e.g. `30950`), or the Security Group only allows traffic from
itself (a self-referencing rule intended for pod-to-pod communication), external traffic is blocked
before it ever reaches the node.

## Resolution
Add an inbound rule permitting the NodePort:
```bash
aws ec2 authorize-security-group-ingress --group-id <sg-id> \
  --protocol tcp --port 30950 --cidr 0.0.0.0/0 --region ap-south-1
```
(In production, restrict `--cidr` to a Load Balancer's Security Group rather than the whole internet.)

## Verification
```bash
curl http://<node-external-ip>:30950/health
```
Expect `{"status":"ok"}`. Confirm the frontend also loads correctly in a browser.

## Root Cause (for reference)
Worker node Security Group only permitted intra-cluster traffic by default; no explicit rule existed
for the application's NodePort, so external requests were silently dropped at the network layer even
though every Kubernetes-level resource (Pods, Service) was completely healthy.