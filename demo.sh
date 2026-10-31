#!/bin/sh
# Starts the whole ezworkspace demo: the local Convex backend, the web app, and the iMessage agent.
# Ctrl-C stops all three.
cd "$(dirname "$0")" || exit 1
trap 'kill 0' INT TERM EXIT
(cd web && CONVEX_AGENT_MODE=anonymous npx convex dev) &
sleep 8 # let Convex come up before the agent subscribes to it
(cd web && npx vite --port 5173) &
(cd agent && bun start) &
echo "Dashboard: http://localhost:5173   Worker web chat: http://localhost:5173/#/text"
echo "Reset the demo: click Reset demo, or run: cd web && CONVEX_AGENT_MODE=anonymous npx convex run seed:run"
wait
