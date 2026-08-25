variable "project_name" {
  description = "Prefix used for naming all resources"
  type        = string
  default     = "employee-app"
}

variable "environment" {
  description = "Deployment environment (dev, staging, production concept)"
  type        = string
  default     = "dev"
}

variable "app_image" {
  description = "Docker image for the application"
  type        = string
  default     = "raiden004/employee-api:latest"
}

variable "mongo_image" {
  description = "Docker image for MongoDB"
  type        = string
  default     = "raiden004/employee-mongo:latest"
}

variable "app_host_port" {
  type    = number
  default = 9500
}

variable "mongo_host_port" {
  type    = number
  default = 20000
}

variable "mongo_root_user" {
  description = "MongoDB root username"
  type        = string
  sensitive   = true
}

variable "mongo_root_password" {
  description = "MongoDB root password"
  type        = string
  sensitive   = true
}