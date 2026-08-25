terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}

# --- Network ---
resource "docker_network" "app_network" {
  name = "${var.project_name}-network"
}

# --- Mongo volume (persistent data) ---
resource "docker_volume" "mongo_data" {
  name = "${var.project_name}-mongo-data"
}

# --- Mongo image + container ---
resource "docker_image" "mongo" {
  name = var.mongo_image
}

resource "docker_container" "mongo" {
  name  = "${var.project_name}-mongo"
  image = docker_image.mongo.image_id

  networks_advanced {
    name = docker_network.app_network.name
  }

  env = [
    "MONGO_INITDB_ROOT_USERNAME=${var.mongo_root_user}",
    "MONGO_INITDB_ROOT_PASSWORD=${var.mongo_root_password}",
  ]

  ports {
    internal = 27017
    external = var.mongo_host_port
  }

  volumes {
    volume_name    = docker_volume.mongo_data.name
    container_path = "/data/db"
  }

  restart = "unless-stopped"
}

# --- App image + container ---
resource "docker_image" "app" {
  name = var.app_image
}

resource "docker_container" "app" {
  name  = "${var.project_name}-app"
  image = docker_image.app.image_id

  networks_advanced {
    name = docker_network.app_network.name
  }

  env = [
    "PORT=3000",
    "MONGO_URI=mongodb://${var.mongo_root_user}:${var.mongo_root_password}@${docker_container.mongo.name}:27017/employeedb?authSource=admin",
  ]

  ports {
    internal = 3000
    external = var.app_host_port
  }

  restart = "unless-stopped"

  depends_on = [docker_container.mongo]
}