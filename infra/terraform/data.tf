resource "aws_ecr_repository" "this" {
  for_each = toset(["api", "web"])

  name                 = "${local.name}-${each.key}"
  image_tag_mutability = "MUTABLE"
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "this" {
  for_each   = aws_ecr_repository.this
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Guarda as 30 imagens mais recentes"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 30
      }
      action = { type = "expire" }
    }]
  })
}

# ---------- Postgres ----------

resource "random_password" "database" {
  length  = 32
  special = false # vai dentro da DATABASE_URL; sem caracteres especiais evita escapar
}

resource "aws_db_subnet_group" "this" {
  name       = local.name
  subnet_ids = module.vpc.private_subnets
}

resource "aws_db_instance" "this" {
  identifier     = local.name
  engine         = "postgres"
  engine_version = "17"
  instance_class = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "aprovame"
  username = "aprovame"
  password = random_password.database.result

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.database.id]
  publicly_accessible    = false

  backup_retention_period    = 7
  auto_minor_version_upgrade = true
  deletion_protection        = var.db_deletion_protection
  skip_final_snapshot        = false
  final_snapshot_identifier  = "${local.name}-final"
}

# ---------- Redis (filas do BullMQ) ----------

resource "aws_elasticache_subnet_group" "this" {
  name       = local.name
  subnet_ids = module.vpc.private_subnets
}

# O BullMQ exige noeviction: se o Redis descartar chaves por falta de memória,
# jobs da fila somem sem aviso.
resource "aws_elasticache_parameter_group" "this" {
  name   = "${local.name}-bullmq"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "noeviction"
  }
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id = local.name
  description          = "Filas de lotes do aprova-me"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.redis_node_type
  num_cache_clusters   = 1
  port                 = 6379

  parameter_group_name = aws_elasticache_parameter_group.this.name
  subnet_group_name    = aws_elasticache_subnet_group.this.name
  security_group_ids   = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  snapshot_retention_limit   = 1
}

# ---------- Segredos ----------

resource "random_password" "jwt" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.name}/app"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    DATABASE_URL  = "postgresql://${aws_db_instance.this.username}:${random_password.database.result}@${aws_db_instance.this.address}:5432/${aws_db_instance.this.db_name}?schema=public"
    JWT_SECRET    = random_password.jwt.result
    SMTP_USER     = var.smtp_user
    SMTP_PASSWORD = var.smtp_password
  })
}
