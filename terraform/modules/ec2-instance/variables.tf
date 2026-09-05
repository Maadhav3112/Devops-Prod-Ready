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
  default     = "t3.micro"
}

variable "key_name" {
  description = "Existing EC2 key pair name for SSH"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "CIDR allowed to SSH into the instance"
  type        = string
  default     = "0.0.0.0/0"
}

variable "extra_ingress_ports" {
  description = "Additional TCP ports to open (e.g. for ArgoCD, Grafana)"
  type        = list(number)
  default     = []
}