terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source = "./modules/vpc"

  aws_region          = var.aws_region
  project_name        = var.project_name
  vpc_cidr            = var.vpc_cidr
  public_subnet_cidrs = var.public_subnet_cidrs
}

module "admin_ec2" {
  source = "./modules/ec2-instance"

  name                = "kops-admin"
  vpc_id              = module.vpc.vpc_id
  subnet_id           = module.vpc.public_subnet_ids[0]
  key_name            = var.key_name
  instance_type       = "t3.small"
  allowed_ssh_cidr    = var.allowed_ssh_cidr
  extra_ingress_ports = [8081, 3001, 30950]
}