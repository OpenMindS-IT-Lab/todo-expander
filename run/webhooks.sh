#!/usr/bin/env bash
set -euo pipefail
: "${REPO:=OpenMindS-IT-Lab/todo-expander}"
: "${WEBHOOK_URL:?WEBHOOK_URL is required}"
: "${WEBHOOK_SECRET:?WEBHOOK_SECRET is required}"

cmd="${1:-}"
case "$cmd" in
  set)
    gh api repos/$REPO/hooks \
      -f name=web \
      -f active=true \
      -f "events[]=push" \
      -f "events[]=pull_request" \
      -f "events[]=release" \
      -f config.url="$WEBHOOK_URL" \
      -f config.content_type=json \
      -f config.insecure_ssl=0 \
      -f config.secret="$WEBHOOK_SECRET"
    ;;
  delete)
    : "${HOOK_ID:?HOOK_ID is required for delete}"
    gh api repos/$REPO/hooks/$HOOK_ID -X DELETE
    ;;
  *)
    echo "Usage: REPO=owner/repo WEBHOOK_URL=... WEBHOOK_SECRET=... bash run/webhooks.sh set|delete"
    ;;
esac