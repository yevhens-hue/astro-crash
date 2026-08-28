---
name: macos-launchd-services
description: Guidelines for managing background services and daemon agents on macOS using launchd and launchctl. Use this when the user needs to run an AI agent, Express API, or Python script persistently in the background, start it on boot, or replace Linux systemd patterns on macOS. Includes .plist structure, standard commands (load, unload, list, start, stop), and logging locations.
---

# macOS `launchd` for Background AI Agents

On Linux, you use `systemd` (`systemctl`). On macOS, the native equivalent is `launchd`, controlled via `launchctl`. This is essential for running background AI agents, webhooks, or periodic data scrapers without keeping an IDE or terminal window open.

## 1. The `.plist` File Structure

Services are defined as XML files ending in `.plist`.
User-level services (run under your user, start when you log in) go to:
`~/Library/LaunchAgents/`

Example file: `~/Library/LaunchAgents/com.yevhen.aivoices.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- 1. Unique Name -->
    <key>Label</key>
    <string>com.yevhen.aivoices</string>

    <!-- 2. What command to run -->
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string> <!-- Always use absolute paths! -->
        <string>/Users/yevhen/Cursor/AI Voices/src/index.js</string>
    </array>

    <!-- 3. Working Directory -->
    <key>WorkingDirectory</key>
    <string>/Users/yevhen/Cursor/AI Voices</string>

    <!-- 4. Keep Alive (Auto-Restart on Crash) -->
    <key>KeepAlive</key>
    <true/>

    <!-- 5. Logging -->
    <key>StandardOutPath</key>
    <string>/tmp/ai_voices_out.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/ai_voices_err.log</string>
</dict>
</plist>
```

## 2. Core Commands

Instead of `systemctl enable --now`, you use:

**Load and start the service:**
```bash
launchctl load ~/Library/LaunchAgents/com.yevhen.aivoices.plist
```

**Check if it's running:**
```bash
launchctl list | grep aivoices
```

**Stop and remove the service:**
```bash
launchctl unload ~/Library/LaunchAgents/com.yevhen.aivoices.plist
```

**Force restart (if already loaded):**
```bash
launchctl stop com.yevhen.aivoices
launchctl start com.yevhen.aivoices
```

## 3. Important Gotchas for Node/Python
- **Environment Variables:** `launchd` does NOT load `~/.zshrc` or `~/.bash_profile`. Your script must load its own `.env` file or you must provide full paths to `node`/`npm`/`python`.
- **Absolute Paths:** Never use `npm start` in the plist unless you provide the absolute path to npm (e.g. `/opt/homebrew/bin/npm`).
