# Troubleshooting: Controlled CI Pipeline Failure

## Purpose

Demonstrate that the pipeline fails when an important stage fails, and document the investigate → fix cycle.

## Controlled Failure Introduced

A deliberate failure was injected into one of the critical stages (for example: a failing unit test, a lint error, or a security scan finding).

## Detection

- Pipeline status turned red / failed
- The failing job was clearly identified in the GitLab pipeline view
- Logs showed the exact error

## Investigation

1. Opened the failed job log
2. Located the root cause (test assertion, missing dependency, vulnerability, etc.)
3. Confirmed the failure was intentional for the exercise

## Fix

1. Corrected the source of the failure
2. Committed the fix
3. Re-ran the pipeline

## Result

Pipeline passed all stages after the fix. The exercise confirmed that:

- Critical stage failures correctly stop the pipeline
- Logs provide enough information to diagnose the issue
- The fix path is straightforward

## Related Documents

- [CI/CD Architecture](../architecture/cicd-architecture.md)
- [Image Scanning](../security/image-scanning.md)
