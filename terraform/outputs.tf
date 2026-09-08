output "vpc_id" {
  value = module.vpc.vpc_id
}

output "public_subnet_ids" {
  value = module.vpc.public_subnet_ids
}

output "app_security_group_id" {
  value = module.vpc.security_group_id
}

output "admin_instance_id" {
  value = module.admin_ec2.instance_id
}

output "admin_public_ip" {
  value = module.admin_ec2.public_ip
}