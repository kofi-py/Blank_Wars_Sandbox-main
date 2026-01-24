#!/bin/bash

# git-commit.sh - Easy git commit script for Blank Wars Sandbox
# Usage: ./git-commit.sh "Your commit message here"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if commit message was provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide a commit message${NC}"
    echo -e "${YELLOW}Usage: ./git-commit.sh \"Your commit message here\"${NC}"
    exit 1
fi

COMMIT_MESSAGE="$1"

echo -e "${BLUE}=== Git Commit Script ===${NC}"
echo ""

# Show current status
echo -e "${YELLOW}Current git status:${NC}"
git status --short
echo ""

# Check if there are any changes to commit
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}No changes to commit. Working tree is clean.${NC}"
    exit 0
fi

# Stage all changes
echo -e "${BLUE}Staging all changes...${NC}"
git add -A

# Show what will be committed
echo -e "${YELLOW}Files to be committed:${NC}"
git diff --cached --stat
echo ""

# Create commit with co-author
echo -e "${BLUE}Creating commit...${NC}"
git commit -m "$COMMIT_MESSAGE

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

# Check if commit was successful
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Commit successful!${NC}"
    echo ""
    echo -e "${YELLOW}Latest commit:${NC}"
    git log --oneline -1
    echo ""
    echo -e "${YELLOW}Current status:${NC}"
    git status --short
else
    echo -e "${RED}✗ Commit failed${NC}"
    exit 1
fi
