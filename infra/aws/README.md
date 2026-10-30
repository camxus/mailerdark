# AWS infrastructure (SES + SNS)

Creates: SNS topic, SES configuration set (events → SNS), SNS→webhook subscription, and a
least-privilege IAM user for Vercel. SNS does not send your campaigns. SES does; SNS only carries
bounce/complaint/reject events back to `/api/webhooks/ses-sns`.

## Deploy order (two applies, because SNS must reach a live webhook)

1. `cd infra/aws && terraform init && terraform apply`
2. `terraform output` → set in Vercel: `EMAIL_PROVIDER`, `SES_REGION`, `SES_CONFIGURATION_SET`,
   `SNS_TOPIC_ARN`, `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY` (`terraform output -raw SES_SECRET_ACCESS_KEY`).
3. Redeploy the app so `/api/webhooks/ses-sns` is live.
4. `terraform apply -var webhook_url=https://<your-app>/api/webhooks/ses-sns`
   The route auto-confirms the subscription (check SNS console: status "Confirmed").
5. In the app: Settings → Sending domains → add your domain, publish the DKIM CNAMEs + MAIL FROM
   MX/TXT it shows, add a DMARC TXT at `_dmarc.<domain>`, then hit refresh.
6. **Request SES production access** (SES console → Account dashboard). New accounts are in the
   sandbox: verified recipients only, 200 emails/day.

Not managed by Terraform: sending domains. The app creates/deletes them at runtime through the SES API.
