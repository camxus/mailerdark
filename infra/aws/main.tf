terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }
}

provider "aws" {
  region = var.region
}

data "aws_caller_identity" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
}

# ───────────────────────────────────────────────────────────
# SNS topic: SES publishes bounce / complaint / reject events here
# ───────────────────────────────────────────────────────────

resource "aws_sns_topic" "ses_events" {
  name = "${var.name}-ses-events"
}

resource "aws_sns_topic_policy" "allow_ses" {
  arn = aws_sns_topic.ses_events.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowSESPublish"
      Effect    = "Allow"
      Principal = { Service = "ses.amazonaws.com" }
      Action    = "sns:Publish"
      Resource  = aws_sns_topic.ses_events.arn
      Condition = { StringEquals = { "AWS:SourceAccount" = local.account_id } }
    }]
  })
}

# Created only once you pass webhook_url (apply twice: see README). The app's
# /api/webhooks/ses-sns route confirms the subscription automatically.
resource "aws_sns_topic_subscription" "webhook" {
  count                  = var.webhook_url == "" ? 0 : 1
  topic_arn              = aws_sns_topic.ses_events.arn
  protocol               = "https"
  endpoint               = var.webhook_url
  endpoint_auto_confirms = false
}

# ───────────────────────────────────────────────────────────
# SES configuration set → SNS
# The app attaches this set to every sending domain it creates.
# Opens/clicks are NOT enabled: Mailerdark tracks them first-party.
# ───────────────────────────────────────────────────────────

resource "aws_sesv2_configuration_set" "main" {
  configuration_set_name = "${var.name}-default"

  delivery_options {
    tls_policy = "REQUIRE"
  }
  reputation_options {
    reputation_metrics_enabled = true
  }
  sending_options {
    sending_enabled = true
  }
  suppression_options {
    suppressed_reasons = ["BOUNCE", "COMPLAINT"]
  }
}

resource "aws_sesv2_configuration_set_event_destination" "sns" {
  configuration_set_name = aws_sesv2_configuration_set.main.configuration_set_name
  event_destination_name = "sns"

  event_destination {
    enabled              = true
    matching_event_types = ["BOUNCE", "COMPLAINT", "REJECT", "RENDERING_FAILURE"]
    sns_destination {
      topic_arn = aws_sns_topic.ses_events.arn
    }
  }

  depends_on = [aws_sns_topic_policy.allow_ses]
}

# ───────────────────────────────────────────────────────────
# IAM user for the Vercel deployment (Vercel can't assume IAM roles without OIDC setup)
# Domains are created at runtime by the app, so identities are wildcarded.
# ───────────────────────────────────────────────────────────

resource "aws_iam_user" "app" {
  name = "${var.name}-vercel"
}

resource "aws_iam_user_policy" "app" {
  name = "ses-send-and-manage-identities"
  user = aws_iam_user.app.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ses:SendEmail",
        "ses:CreateEmailIdentity",
        "ses:GetEmailIdentity",
        "ses:DeleteEmailIdentity",
        "ses:PutEmailIdentityMailFromAttributes",
        "ses:PutEmailIdentityConfigurationSetAttributes",
      ]
      Resource = [
        "arn:aws:ses:${var.region}:${local.account_id}:identity/*",
        "arn:aws:ses:${var.region}:${local.account_id}:configuration-set/${aws_sesv2_configuration_set.main.configuration_set_name}",
      ]
    }]
  })
}

resource "aws_iam_access_key" "app" {
  user = aws_iam_user.app.name
}
