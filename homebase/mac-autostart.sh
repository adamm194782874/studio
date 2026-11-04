#!/bin/sh
# Makes Homebase start by itself whenever you log in to the Mac, and restart if it ever crashes.
#   Turn on:   sh mac-autostart.sh
#   Turn off:  sh mac-autostart.sh remove
# Run "sh start.sh" once first so everything is installed.
cd "$(dirname "$0")"
DIR="$(pwd)"
LABEL="com.homebase.app"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [ "$1" = "remove" ]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null
  rm -f "$PLIST"
  echo "Homebase will no longer start automatically."
  exit 0
fi

if [ ! -x "$DIR/.venv/bin/python" ]; then
  echo "Run sh start.sh once first (it installs what Homebase needs), then run this again."
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents" "$DIR/data"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$DIR/.venv/bin/python</string>
    <string>$DIR/run.py</string>
  </array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>$DIR/data/startup.log</string>
  <key>StandardErrorPath</key><string>$DIR/data/startup.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Done. Homebase is running and will start by itself every time you log in."
echo "Open http://localhost:8080 to check. Logs: $DIR/data/homebase.log"
