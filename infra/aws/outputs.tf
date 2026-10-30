# Copy these into Vercel → Project → Settings → Environment Variables.
output "EMAIL_PROVIDER" {
  value = "ses"
}
output "SES_REGION" {
  value = var.region
}
output "SES_CONFIGURATION_SET" {
  value = aws_sesv2_configuration_set.main.configuration_set_name
}
output "SNS_TOPIC_ARN" {
  value = aws_sns_topic.ses_events.arn
}
output "SES_ACCESS_KEY_ID" {
  value = aws_iam_access_key.app.id
}
output "SES_SECRET_ACCESS_KEY" {
  value     = aws_iam_access_key.app.secret
  sensitive = true # terraform output -raw SES_SECRET_ACCESS_KEY
}
