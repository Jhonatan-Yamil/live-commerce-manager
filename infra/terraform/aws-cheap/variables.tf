variable "aws_region" {
  type        = string
  description = "AWS region for deployment"
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Project name prefix for resource tags"
  default     = "live-commerce-manager"
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type (free-tier friendly: t3.micro)"
  default     = "t3.micro"
}

variable "ssh_cidr" {
  type        = string
  description = "Allowed CIDR for SSH access (set to your public IP /32)"
  default     = "0.0.0.0/0"
}

variable "key_pair_name" {
  type        = string
  description = "Optional existing EC2 key pair name for SSH"
  default     = ""
}
