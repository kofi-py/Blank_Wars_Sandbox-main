#!/usr/bin/osascript

tell application "Safari"
    activate
    delay 1

    -- Open Web Inspector
    tell application "System Events"
        keystroke "i" using {command down, option down}
        delay 2

        -- Refresh page
        keystroke "r" using command down
        delay 5

        -- Try to trigger export via menu
        click menu item "Export HAR" of menu "Network" of menu bar 1 of application process "Safari"
        delay 1

        -- Save dialog
        keystroke "meshy-network"
        delay 0.5
        keystroke return
    end tell
end tell
