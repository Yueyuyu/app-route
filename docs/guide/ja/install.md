# ダウンロードとインストール

お使いのコンピューターに合うファイルを選んでください。通常の利用に Node.js、Git、ソースからのビルドは不要です。

<!-- downloads:ja:start -->
**現在のプレビュー版: [0.2.0-preview.2](https://github.com/Yueyuyu/app-route/releases/tag/v0.2.0-preview.2)**

| お使いのコンピューター | ダウンロード | サイズ | 検証 |
| --- | --- | --- | --- |
| Windows · Intel / AMD 64 ビット | [インストーラー EXE](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-setup-x64.exe) | 140.8 MiB | [SHA-256](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-setup-x64.exe.sha256) |
| Mac · Apple シリコン（実験版） | [DMG](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-arm64.dmg) | 155.0 MiB | [SHA-256](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-arm64.dmg.sha256) |
| Mac · Intel（実験版） | [DMG](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-x64.dmg) | 161.6 MiB | [SHA-256](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-x64.dmg.sha256) |

その他のファイル: [arm64 ZIP](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-arm64.zip) · [x64 ZIP](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-x64.zip). Mac ZIP はアプリの圧縮ファイルです。Source code はソースコードで、インストーラーではありません。

SHA-256 はファイルの整合性を確認します。発行者署名の代わりにはなりません。
<!-- downloads:ja:end -->

<a id="support"></a>

## 対応範囲

| 環境 | 検証範囲 |
| --- | --- |
| Windows x64 | Windows 11、Clash Party 2.0.4 / Mihomo 1.19.32、ルールモード、TUN 無効で実機確認 |
| Mac Apple シリコン / Intel | 両アーキテクチャの CI ビルドとパッケージ起動を確認。Mac 実機の振り分け・復旧は未検証 |
| その他のクライアント、Windows ARM、Linux | 正式には未対応 |

Windows のクライアント再起動、2 つの購読間の切り替え、通常のスリープ復帰は確認済みです。停電、未確定処理中のスリープ、全権限条件、リモート購読更新成功後の再生成は未検証です。

## Windows

1. 上の EXE インストーラーを取得し、実行中の AppRoute を完全に終了します。
2. インストーラーで現在のユーザー向けにインストールします。
3. デスクトップまたはスタートメニューから開き、[初回設定](quickstart.md)へ進みます。

独立したウィンドウとトレイアイコンが表示されます。ウィンドウを閉じるだけでは終了しません。

## Mac（実験版）

1. Apple メニューの「この Mac について」でチップを確認します。M シリーズは arm64、Intel は x64 です。
2. 対応する DMG を開き、AppRoute を「アプリケーション」にドラッグして起動します。
3. ZIP は同じアプリの圧縮形式です。展開後の AppRoute.app 全体を保持してください。

Windows は発行者未署名、Mac は ad-hoc 署名のみで Developer ID 公証がありません。起動が制限されたら、配布元と正確な警告を確認してください。ウイルス対策やシステム全体の保護を無効にしないでください。具体的な脅威が検出された場合は利用を止め、[報告](https://github.com/Yueyuyu/app-route/issues/new/choose)してください。

## ファイルの検証

本リポジトリの Releases から取得し、同名の .sha256 と比較します。

Windows:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath '.\AppRoute-VERSION-setup-x64.exe'
```

Mac:

```sh
shasum -a 256 AppRoute-VERSION-mac-arm64.dmg
```

実際のファイル名に置き換え、ハッシュが完全一致することを確認します。SHA-256 は整合性の検査であり、発行者や安全性を証明しません。Source code はソースコードで、インストーラーではありません。

起動の問題は[よくある質問](faq.md)、既存環境の更新は[保守](maintenance.md)をご覧ください。
