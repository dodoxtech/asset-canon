#!/usr/bin/env bash

# Local skill registry — maps install-name -> SKILL.md path.
# Portable (works on macOS bash 3.2; no associative arrays).
# Usage: ./skill.sh <skill-name>   (prints the path)
#        ./skill.sh                 (lists available skills)

SKILLS="asset-canon asset-icon asset-illustration asset-sprite asset-texture asset-social asset-style-extract"

skill_path() {
  case "$1" in
    asset-canon)        echo "skills/asset-canon/SKILL.md" ;;
    asset-icon)         echo "skills/asset-icon/SKILL.md" ;;
    asset-illustration) echo "skills/asset-illustration/SKILL.md" ;;
    asset-sprite)       echo "skills/asset-sprite/SKILL.md" ;;
    asset-texture)      echo "skills/asset-texture/SKILL.md" ;;
    asset-social)       echo "skills/asset-social/SKILL.md" ;;
    asset-style-extract) echo "skills/asset-style-extract/SKILL.md" ;;
    *)                  echo "" ;;
  esac
}

if [ $# -eq 0 ]; then
  echo "Usage: ./skill.sh <skill-name>"
  echo "Available skills: $SKILLS"
else
  skill_path "$1"
fi
