output "public_ip" {
  description = "Public IP of the EC2 server"
  value       = aws_instance.app_server.public_ip
}

output "ssh_example" {
  description = "SSH command template"
  value       = var.key_pair_name != "" ? "ssh -i <path-to-key.pem> ec2-user@${aws_instance.app_server.public_ip}" : "Set key_pair_name to get SSH access"
}

output "app_url" {
  description = "Application URL (after DNS setup)"
  value       = "https://<your-domain>"
}
