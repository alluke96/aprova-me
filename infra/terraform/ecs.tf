resource "aws_ecs_cluster" "this" {
  name = local.name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_cloudwatch_log_group" "this" {
  for_each          = toset(["api", "worker", "web"])
  name              = "/ecs/${local.name}/${each.key}"
  retention_in_days = 30
}

# O front chama a API pela rede interna: api.<projeto>.local:3001
resource "aws_service_discovery_private_dns_namespace" "this" {
  name = "${var.project}.local"
  vpc  = module.vpc.vpc_id
}

resource "aws_service_discovery_service" "api" {
  name = "api"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.this.id

    dns_records {
      type = "A"
      ttl  = 10
    }
  }
}

# ---------- Permissões ----------

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${local.name}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "execution_secrets" {
  name = "read-app-secret"
  role = aws_iam_role.execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [aws_secretsmanager_secret.app.arn]
    }]
  })
}

resource "aws_iam_role" "task" {
  name               = "${local.name}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

# ---------- Definições das tarefas ----------

locals {
  backend_environment = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "3001" },
    { name = "REDIS_HOST", value = aws_elasticache_replication_group.this.primary_endpoint_address },
    { name = "REDIS_PORT", value = "6379" },
    { name = "JWT_EXPIRES_IN_SECONDS", value = "60" },
    { name = "SMTP_HOST", value = var.smtp_host },
    { name = "SMTP_PORT", value = tostring(var.smtp_port) },
    { name = "MAIL_FROM", value = var.mail_from },
    { name = "BATCH_REPORT_EMAIL", value = var.batch_report_email },
    { name = "OPERATIONS_EMAIL", value = var.operations_email },
    { name = "CORS_ORIGIN", value = "${local.https ? "https" : "http"}://${aws_lb.this.dns_name}" },
  ]

  backend_secrets = [
    for key in ["DATABASE_URL", "JWT_SECRET", "SMTP_USER", "SMTP_PASSWORD"] :
    { name = key, valueFrom = "${aws_secretsmanager_secret.app.arn}:${key}::" }
  ]

  api_image = "${aws_ecr_repository.this["api"].repository_url}:${var.image_tag}"
  web_image = "${aws_ecr_repository.this["web"].repository_url}:${var.image_tag}"
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${local.name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name         = "api"
    image        = local.api_image
    essential    = true
    portMappings = [{ containerPort = 3001, protocol = "tcp" }]
    environment  = local.backend_environment
    secrets      = local.backend_secrets

    logConfiguration = {
      logDriver = "awslogs"

      options = {
        awslogs-group         = aws_cloudwatch_log_group.this["api"].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "api"
      }
    }
  }])
}

resource "aws_ecs_task_definition" "worker" {
  family                   = "${local.name}-worker"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name        = "worker"
    image       = local.api_image
    essential   = true
    command     = ["node", "dist/worker.js"]
    environment = local.backend_environment
    secrets     = local.backend_secrets

    logConfiguration = {
      logDriver = "awslogs"

      options = {
        awslogs-group         = aws_cloudwatch_log_group.this["worker"].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "worker"
      }
    }
  }])
}

resource "aws_ecs_task_definition" "web" {
  family                   = "${local.name}-web"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name         = "web"
    image        = local.web_image
    essential    = true
    portMappings = [{ containerPort = 3000, protocol = "tcp" }]

    environment = [
      { name = "API_URL", value = "http://api.${var.project}.local:3001" },
      { name = "COOKIE_SECURE", value = tostring(local.https) },
    ]

    logConfiguration = {
      logDriver = "awslogs"

      options = {
        awslogs-group         = aws_cloudwatch_log_group.this["web"].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "web"
      }
    }
  }])
}

# ---------- Serviços ----------
# O pipeline de deploy registra novas revisões das tarefas; o Terraform não as
# reverte (ignore_changes) e cuida só da infraestrutura em volta.

resource "aws_ecs_service" "api" {
  name            = "api"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.api_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnets
    security_groups = [aws_security_group.api.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3001
  }

  service_registries {
    registry_arn = aws_service_discovery_service.api.arn
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [task_definition]
  }

  depends_on = [aws_lb_listener_rule.api]
}

resource "aws_ecs_service" "worker" {
  name            = "worker"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = var.worker_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnets
    security_groups = [aws_security_group.worker.id]
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [task_definition]
  }
}

resource "aws_ecs_service" "web" {
  name            = "web"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.web.arn
  desired_count   = var.web_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnets
    security_groups = [aws_security_group.web.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.web.arn
    container_name   = "web"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [task_definition]
  }

  depends_on = [aws_lb_listener.http]
}
