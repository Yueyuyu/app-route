# Download and install

Choose the package for your computer. End users do not need Node.js, Git or a source build.

<!-- downloads:en:start -->
**Current preview: [0.2.0-preview.2](https://github.com/Yueyuyu/app-route/releases/tag/v0.2.0-preview.2)**

| Your computer | Download | Size | Checksum |
| --- | --- | --- | --- |
| Windows · Intel / AMD 64-bit | [Installer EXE](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-setup-x64.exe) | 140.8 MiB | [SHA-256](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-setup-x64.exe.sha256) |
| Mac · Apple silicon (experimental) | [DMG](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-arm64.dmg) | 155.0 MiB | [SHA-256](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-arm64.dmg.sha256) |
| Mac · Intel (experimental) | [DMG](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-x64.dmg) | 161.6 MiB | [SHA-256](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-x64.dmg.sha256) |

Other files: [arm64 ZIP](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-arm64.zip) · [x64 ZIP](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-x64.zip). Mac ZIP files are app archives; Source code is not an installer.

SHA-256 checks file integrity; it does not replace publisher signing.
<!-- downloads:en:end -->

<a id="support"></a>

## Support boundaries

| Platform | Verified scope |
| --- | --- |
| Windows x64 | Real Windows 11 checks with Clash Party 2.0.4 / Mihomo 1.19.32, Rule mode and TUN off |
| Mac Apple silicon / Intel | Native CI builds and packaged startup checks for both architectures; real Mac routing and recovery are unverified |
| Other clients, Windows ARM, Linux | Not officially supported |

Windows client restarts, switching between two subscriptions, and normal sleep/wake have been checked. Power loss, pending transactions across sleep, the full permissions matrix and successful remote subscription refresh remain unverified.

## Windows

1. Download the **EXE installer** above. Fully quit a running AppRoute.
2. Run the installer and complete installation for the current user.
3. Open AppRoute from the desktop or Start menu, then follow [First steps](quickstart.md).

Expected: a standalone window and tray icon. Closing the window hides it; use the tray menu to quit completely.

## Mac (experimental)

1. In Apple menu → About This Mac, check the chip. Apple M-series uses arm64; Intel uses x64.
2. Open the matching DMG, drag AppRoute into Applications and launch it there.
3. ZIP is an alternative archive of the same app. Keep the entire extracted AppRoute.app.

Windows has no publisher signature. Mac has only an ad-hoc signature, without Developer ID notarization. The OS may block launch. Check the source and exact warning; do not disable antivirus or system-wide security. A named threat detection requires investigation, not an assumption of a false positive. [Report an issue](https://github.com/Yueyuyu/app-route/issues/new/choose).

## Verify a download

Use this repository's Releases only. Compare the file with its matching .sha256 sidecar:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath '.\AppRoute-VERSION-setup-x64.exe'
```

On Mac:

```sh
shasum -a 256 AppRoute-VERSION-mac-arm64.dmg
```

Replace the filename with the one you downloaded. The hash must match exactly. SHA-256 checks integrity, not publisher identity or software safety. GitHub's **Source code** archives are not installers.

For installation or launch problems, see [FAQ](faq.md). Existing users should read [Upgrade and recovery](maintenance.md).
