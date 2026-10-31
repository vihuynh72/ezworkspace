#!/usr/bin/env bash
# Lets one more phone text the iMessage coach: registers it on the Photon project, then restarts the agent so it hears that phone.
set -euo pipefail
phone="${1:-}"
[[ "$phone" =~ ^\+[1-9][0-9]{7,14}$ ]] || { echo "Usage: ./add-phone.sh +14155550123  (your number, with + and country code)"; exit 1; }
cd "$(dirname "$0")/agent"
here=$(pwd -P)
project=$(grep -E '^PROJECT_ID=' .env | head -1 | cut -d= -f2- | tr -d "\"' ")
npx -y @photon-ai/cli spectrum users add --phone "$phone" -p "$project" || echo "Photon did not add it (maybe it is already there). Restarting the agent anyway."
for p in $(pgrep -f "bun src/index.ts" || true); do
  if [ "$(lsof -a -p "$p" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')" = "$here" ]; then kill "$p"; fi
done
sleep 1
nohup bun start > "${TMPDIR:-/tmp}/ezworkspace-agent.log" 2>&1 &
echo "Done. Text START to +1 (415) 590-1577 from $phone."
