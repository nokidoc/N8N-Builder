#!/bin/bash

# Git Push with Exponential Backoff Retry
# Retries up to 4 times with delays: 2s, 4s, 8s, 16s

BRANCH="claude/lead-scraper-workflow-jtCt8"
MAX_RETRIES=4
DELAYS=(2 4 8 16)

echo "🚀 Pushing to $BRANCH..."
echo ""

for i in $(seq 0 $((MAX_RETRIES-1))); do
  echo "📤 Attempt $((i+1))/$MAX_RETRIES"

  if git push -u origin "$BRANCH" 2>&1; then
    echo ""
    echo "✅ Push successful!"
    exit 0
  else
    if [ $i -lt $((MAX_RETRIES-1)) ]; then
      DELAY=${DELAYS[$i]}
      echo "⏳ Waiting ${DELAY}s before retry..."
      sleep $DELAY
    fi
  fi
done

echo ""
echo "❌ Push failed after $MAX_RETRIES attempts"
echo "⚠️  Local commit was successful - stored in git history"
echo ""
echo "Next steps:"
echo "1. Try again later: git push -u origin $BRANCH"
echo "2. Or check network: curl https://github.com"
exit 1
