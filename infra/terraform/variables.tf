variable "aws_region" {
  description = "Região da AWS. São Paulo por padrão, perto dos clientes."
  type        = string
  default     = "sa-east-1"
}

variable "project" {
  description = "Prefixo dos nomes dos recursos."
  type        = string
  default     = "aprova-me"
}

variable "environment" {
  description = "Nome do ambiente (prod, staging...)."
  type        = string
  default     = "prod"
}

variable "github_repository" {
  description = "Repositório que pode fazer deploy via OIDC, no formato dono/repo."
  type        = string
  default     = "alluke96/aprova-me"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "certificate_arn" {
  description = "Certificado do ACM para HTTPS. Vazio = só HTTP (útil para testar)."
  type        = string
  default     = ""
}

variable "image_tag" {
  description = "Tag inicial das imagens. Depois disso, quem atualiza é o pipeline de deploy."
  type        = string
  default     = "latest"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_deletion_protection" {
  description = "Impede apagar o banco por engano. Desligue só para destruir um ambiente de teste."
  type        = bool
  default     = true
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

variable "api_desired_count" {
  type    = number
  default = 2
}

variable "worker_desired_count" {
  type    = number
  default = 1
}

variable "web_desired_count" {
  type    = number
  default = 2
}

variable "smtp_host" {
  description = "SMTP para os e-mails de lote e de fila morta (ex.: Amazon SES)."
  type        = string
  default     = "email-smtp.sa-east-1.amazonaws.com"
}

variable "smtp_port" {
  type    = number
  default = 587
}

variable "smtp_user" {
  type      = string
  default   = ""
  sensitive = true
}

variable "smtp_password" {
  type      = string
  default   = ""
  sensitive = true
}

variable "mail_from" {
  type    = string
  default = "Aprova-me <nao-responda@aprova.me>"
}

variable "batch_report_email" {
  type    = string
  default = "cliente@aprova.me"
}

variable "operations_email" {
  type    = string
  default = "operacoes@aprova.me"
}
