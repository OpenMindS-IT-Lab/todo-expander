# Webhook Management Notebook

## Quick Commands (Deno Tasks)

```bash
# List all webhooks with formatted output
deno task webhook:list

# Ping a specific webhook
export HOOK_ID=123456
deno task webhook:ping

# Set up new webhook (via script)
deno task webhook:set

# Delete webhook (via script)
export HOOK_ID=123456
deno task webhook:delete
```

## Environment Variables

```bash
export REPO=OpenMindS-IT-Lab/todo-expander
export WEBHOOK_URL=https://example.com/webhook
export WEBHOOK_SECRET=...
export GITHUB_TOKEN=...
export HOOK_ID=123456  # Get from list command
```

## GitHub CLI Templates

### Create Webhook

```bash
gh api repos/$REPO/hooks \
  -f name=web -f active=true \
  -f "events[]=push" -f "events[]=pull_request" -f "events[]=release" \
  -f config.url="$WEBHOOK_URL" -f config.content_type=json \
  -f config.insecure_ssl=0 -f config.secret="$WEBHOOK_SECRET"
```

### List Webhooks

```bash
gh api repos/$REPO/hooks --paginate | jq '.[] | {id, url: .config.url, events, active}'
```

### Delete Webhook

```bash
HOOK_ID=123456 gh api repos/$REPO/hooks/$HOOK_ID -X DELETE
```

### Ping Webhook

```bash
gh api repos/$REPO/hooks/$HOOK_ID/pings -X POST
```

### Check Deliveries

```bash
gh api repos/$REPO/hooks/$HOOK_ID/deliveries | jq '.[] | {id, status, delivered_at, status_code}'
```

## cURL Templates

### Test Webhook Endpoint

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d '{"test":"ok"}' \
  "$WEBHOOK_URL"
```

### Create Webhook via cURL

```bash
curl -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/$REPO/hooks \
  -d @- <<EOF
{
  "name": "web",
  "active": true,
  "events": ["push", "pull_request", "release"],
  "config": {
    "url": "$WEBHOOK_URL",
    "content_type": "json",
    "secret": "$WEBHOOK_SECRET"
  }
}
EOF
```

## Troubleshooting

### Common Issues

- **Timeouts**: Ensure endpoint returns 2xx status quickly; GitHub has strict timeouts
- **Signature Issues**: Validate secret matches; mismatch causes verification failures
- **Permissions**: Check organization/repo webhook permissions and firewalls
- **SSL**: Verify webhook URL uses valid SSL certificate

### Debug Commands

#### Check Webhook Status

```bash
gh api repos/$REPO/hooks/$HOOK_ID | jq '{id, active, events, last_response: .last_response}'
```

#### View Failed Deliveries

```bash
gh api repos/$REPO/hooks/$HOOK_ID/deliveries | jq '.[] | select(.status_code != 200) | {id, status_code, delivered_at}'
```

#### Re-deliver Failed Webhook

```bash
DELIVERY_ID=123456
gh api repos/$REPO/hooks/$HOOK_ID/deliveries/$DELIVERY_ID/attempts -X POST
```

#### Update Webhook URL

```bash
gh api repos/$REPO/hooks/$HOOK_ID -X PATCH -f config.url="$NEW_WEBHOOK_URL"
```
