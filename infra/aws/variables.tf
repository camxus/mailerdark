variable "region" {
  description = "AWS region for SES + SNS. Must support SES and match SES_REGION in Vercel."
  type        = string
  default     = "eu-west-1"
}

variable "name" {
  description = "Prefix for created resources."
  type        = string
  default     = "mailerdark"
}

variable "webhook_url" {
  description = "Public URL of the SNS webhook, e.g. https://mailerdark.vercel.app/api/webhooks/ses-sns. Leave empty on the first apply."
  type        = string
  default     = ""
}
