terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Estado remoto no S3. Configure no init:
  #   terraform init -backend-config="bucket=<bucket>" -backend-config="key=aprova-me/terraform.tfstate" \
  #     -backend-config="region=sa-east-1" -backend-config="use_lockfile=true"
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
