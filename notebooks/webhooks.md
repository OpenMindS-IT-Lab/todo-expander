# Webhook setup notebook

Environment:

- REPO=OpenMindS-IT-Lab/todo-expander
- WEBHOOK_URL=https://example.com/webhook
- WEBHOOK_SECRET=...

gh templates:

- Create:
  gh api repos/$REPO/hooks -f name=web -f active=true -f "events[]=push" -f "events[]=pull_request" -f "events[]=release" -f config.url="$WEBHOOK_URL" -f config.content_type=json -f config.insecure_ssl=0 -f config.secret="$WEBHOOK_SECRET"

- List:
  gh api repos/$REPO/hooks --paginate | jq '.[] | {id, url: .config.url, events}'

- Delete (by id):
  HOOK_ID=123456 gh api repos/$REPO/hooks/$HOOK_ID -X DELETE

curl template:
curl -X POST -H "Content-Type: application/json" -H "X-Hub-Signature-256: sha256=..." -d '{"test":"ok"}' "$WEBHOOK_URL"

Troubleshooting:

- Ensure endpoint returns 2xx quickly; GitHub timeouts yield delivery failures.
- Validate secret matches; mismatch causes signature verification failures.
- Check organization or repo webhook permissions and firewalls.
