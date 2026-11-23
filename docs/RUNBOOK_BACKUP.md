# MealMate Backup & Restore Runbook (B3.4)

## Overview
Nightly encrypted database dumps with off-site storage, quarterly restore drills, and post-restore verification.

## Schedule
| Task | Schedule | Owner |
|------|----------|-------|
| Database dump | Nightly 02:00 Asia/Dhaka | Cron job |
| Encrypt & upload to off-site storage | Nightly 02:30 Asia/Dhaka | Cron job |
| Retain local dumps | 7 days | Rotation |
| Retain off-site dumps | 90 days | Lifecycle policy |
| Quarterly restore drill | First Saturday of quarter | Engineering |

## Backup Procedure

### 1. Database Dump
```bash
mongodump --uri="$MONGODB_URI" --db=mealmate --archive=dump-$(date +%Y%m%d).archive --gzip
```

### 2. Encrypt
```bash
openssl enc -aes-256-cbc -salt -pbkdf2 -in dump-$(date +%Y%m%d).archive.gz \
    -out dump-$(date +%Y%m%d).archive.gz.enc \
    -pass env:BACKUP_ENCRYPTION_KEY
```

### 3. Upload Off-Site
Upload to S3-compatible storage with lifecycle policy (90-day retention):
```bash
aws s3 cp dump-$(date +%Y%m%d).archive.gz.enc s3://mealmate-backups/daily/
```

## Restore Procedure

### 1. Download & Decrypt
```bash
aws s3 cp s3://mealmate-backups/daily/dump-YYYYMMDD.archive.gz.enc .
openssl enc -d -aes-256-cbc -pbkdf2 -in dump-YYYYMMDD.archive.gz.enc \
    -out dump-YYYYMMDD.archive.gz \
    -pass env:BACKUP_ENCRYPTION_KEY
```

### 2. Restore
```bash
mongorestore --uri="$MONGODB_URI" --db=mealmate --archive=dump-YYYYMMDD.archive --gzip
```

### 3. Post-Restore Check
After restore, verify the **accounting-equation endpoint** is healthy:

```bash
curl -s -X GET "$API_URL/api/statements/accounting-equation" \
    -H "Authorization: Bearer $ADMIN_TOKEN"
```

Expected response: `{"balanced": true, "debits": "...", "credits": "..."}` with `balanced: true`.

If `balanced` is `false`, investigate journal inconsistencies before allowing traffic.

## Emergency Contacts
- On-call engineer: #mealmate-ops
- Database admin: dba@mealmate.example.com

## Testing
Quarterly restore drill must complete within 4 hours RTO and confirm zero data loss (RPO = 24 hours).