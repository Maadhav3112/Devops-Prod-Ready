output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the three public subnets"
  value       = aws_subnet.public[*].id
}

output "availability_zones" {
  description = "Availability Zones used by the public subnets"
  value       = aws_subnet.public[*].availability_zone
}

output "security_group_id" {
  description = "ID of the application security group"
  value       = aws_security_group.app.id
}