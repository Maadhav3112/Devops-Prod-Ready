# Troubleshooting: Terraform State & IAM Permission Problems

## Symptom

`terraform apply` failed repeatedly with permission denied errors or state-locking issues. Some resources (IAM roles, EKS-related networking) could not be created or updated.

## Investigation

- Examined the IAM identity that Terraform was using
- Checked which actions were denied in the error messages
- Reviewed the state backend configuration

## Root Cause

1. The executing IAM principal lacked sufficient permissions for IAM, EKS and networking resources
2. State locking / backend configuration needed adjustment

## Solution

1. Created a dedicated IAM user / group (`Terraform.admin`) with the required policies
2. Ensured the Terraform state backend was correctly configured
3. Re-ran `terraform plan` and `terraform apply` iteratively
4. Verified resources appeared in the AWS console after each successful apply

## Result

Infrastructure converged successfully. IAM users, roles and supporting resources were created as intended.

## Lessons Learned

- Give Terraform a dedicated, least-privilege-but-sufficient role
- Always run `plan` before `apply`
- Iterative apply + console verification helps isolate which resource is failing

## Related Documents

- [Cloud Architecture](../architecture/cloud-architecture.md)
- [EKS Node IAM Issue](./eks-node-iam-issue.md)
- [Security Architecture](../security/security-architecture.md)
