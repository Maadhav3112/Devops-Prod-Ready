# variables.tf
variable "name" {
  description = "Name tag for the instance"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID to launch into"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID to launch into"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "key_name" {
  description = "Existing EC2 key pair name for SSH"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR block allowed to SSH into the instance"
  type        = string
  default     = "0.0.0.0/0"  # tighten this to your actual IP, e.g. "203.0.113.5/32"
}

variable "extra_ingress_ports" {
  description = "Additional TCP ports to open (e.g. ArgoCD UI)"
  type        = list(number)
  default     = []
}