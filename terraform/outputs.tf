output "app_url" {
  value = "http://localhost:${var.app_host_port}"
}

output "mongo_container_name" {
  value = docker_container.mongo.name
}