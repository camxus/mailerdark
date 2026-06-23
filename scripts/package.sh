#!/bin/bash
cd /home/claude
zip -r -q /mnt/user-data/outputs/mailerdark.zip mailerdark \
  -x 'mailerdark/node_modules/*' \
  -x 'mailerdark/.next/*' \
  -x 'mailerdark/.git/*' \
  -x 'mailerdark/.env'
echo "Packaged to /mnt/user-data/outputs/mailerdark.zip"
