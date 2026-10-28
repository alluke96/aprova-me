output "url" {
  description = "Endereço público da aplicação."
  value       = "${local.https ? "https" : "http"}://${aws_lb.this.dns_name}"
}

output "ecr_repositories" {
  description = "Para onde o pipeline envia as imagens."
  value       = { for key, repository in aws_ecr_repository.this : key => repository.repository_url }
}

output "ecs_cluster" {
  value = aws_ecs_cluster.this.name
}

output "github_deploy_role_arn" {
  description = "Coloque em Settings > Secrets do GitHub como AWS_DEPLOY_ROLE_ARN."
  value       = aws_iam_role.github_deploy.arn
}
