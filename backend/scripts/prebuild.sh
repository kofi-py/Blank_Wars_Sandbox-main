#!/bin/sh
set -eu
# Block synthetic content in active code paths.
# Use grep instead of rg for Alpine Linux compatibility
PATTERN='quick reply|thinking\)\.\.\.|warming.*thinking|I need a moment to'
if find ./src -name "*.ts" -not -name "*.bak*" -not -name "*.md" -exec grep -l "$PATTERN" {} + 2>/dev/null | head -1 | grep -q .; then
  echo "❌ Placeholder text found in active code. Remove it."
  exit 1
fi
