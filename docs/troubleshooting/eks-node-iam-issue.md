# Troubleshooting: EKS Node Allocation / IAM Policy Issue

## Symptom

When creating the EKS cluster and node groups, worker nodes failed to join the cluster. Nodes remained in a non-Ready state or the node group creation failed.

## Investigation

- Checked the EKS console and node group status
- Examined the IAM role assigned to the nodes
- Found that the cluster role / node role was missing required actions in its trust policy
- Required managed policies were not attached

## Root Cause

The IAM role used for EKS nodes did not have the complete set of permissions needed for:

- Registering with the EKS control plane
- Pulling images from ECR
- CNI networking

## Solution

1. Created a dedicated node IAM role (`employee-app-nodes`)
2. Attached the following AWS managed policies:
   - `AmazonEKSWorkerNodePolicy`
   - `AmazonEC2ContainerRegistryReadOnly`
   - `AmazonEKS_CNI_Policy`
3. Corrected the trust relationship so that EC2 / EKS could assume the role
4. Re-created / updated the node group

## Result

Nodes successfully registered with the cluster and moved to the **Ready** state. Workloads could then be scheduled.

## Lessons Learned

- Always verify the node role has the three standard EKS worker policies
- Trust policy and attached policies are both required
- IAM mistakes surface as “nodes never join” rather than clear error messages

## Related Documents

- [Kubernetes Architecture](../architecture/kubernetes-architecture.md)
- [Cloud Architecture](../architecture/cloud-architecture.md)
- [Terraform Permissions](./terraform-permissions.md)
