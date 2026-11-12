# Frequently asked questions

## Why is a rule ready but not verified?

Rule loading and traffic observation are separate. Create a new connection and inspect details. Cached content, old connections and traffic outside Clash cannot establish new verification. See [First steps](quickstart.md).

## What do Configured, Running and All apps mean?

Configured contains apps with dedicated routing. Running contains detected running apps. All apps shows the scanned inventory. Favorites are an independent filter, not evidence of configured routing. Search covers all apps; other category and mode filters still matter.

## How do newly installed apps appear?

AppRoute periodically checks for changes. Use Scan apps for an immediate refresh, or add an unrecognized app manually. Portable apps, store apps and shared helpers may not all be detected.

## Why is the connection indicator green but a website fails?

Green means the Clash control API is reachable. It does not prove node or destination availability. Check the selected node, observed route and timestamp of the last network check.

## What if Clash Party exits?

AppRoute does not replace a stopped core. A system proxy pointing at a stopped port can break connectivity. Reopen Clash Party normally and inspect its system-proxy state. AppRoute recovery only manages its own rules.

## Why does a shortcut open Properties?

This is usually unrelated to routing: Windows Alt + double-click opens Properties. Press and release both Alt keys and retry. If it recurs, report reproducible steps rather than assuming a cause.

## What if installation is blocked or no window appears?

Windows packages are unsigned and Mac packages are not notarized. Verify the [source and hash](install.md), record the exact warning and investigate named detections. Do not disable protection or assume a false positive. If no warning appears, check whether startup is still in progress, then [report the version and symptoms](https://github.com/Yueyuyu/app-route/issues/new/choose).

## Are other clients, automatic updates or portable packages supported?

Clash Party is the current integration target. Other clients are unverified; there is no auto-update or validated Windows portable release. A Mac ZIP is simply an app archive.

## How do I restore existing routing?

For one app, select Clash rules. For all AppRoute overrides, use [Restore network](maintenance.md#recovery). Original user rules are retained.
