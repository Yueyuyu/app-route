/** 中文原句作为 gettext 风格键；译文顺序为 English、日本語、Français。
 * 修改原句时同步更新三种译文，保留 {0} 等插值参数。用户数据不进入此目录。 */
export const messages: Record<string, readonly [string, string, string]> = {
  "设置与备份": ["Settings & backups","設定とバックアップ","Paramètres et sauvegardes"],
  "导入前先预览，已有设置由你决定是否替换。": ["Preview first. Choose whether to replace existing settings.","プレビューで既存の設定を置き換えるか選べます。","Prévisualisez et choisissez les paramètres à remplacer."],
  "迁移设置": ["Transfer settings","設定の移行","Transférer les paramètres"],
  "保存应用选择、收藏、语言和代理策略。文件包含本机程序路径，请妥善保管。": ["Save app choices, favorites, language and proxy strategy. The file contains local app paths; keep it private.","アプリの選択、お気に入り、言語、プロキシ戦略を保存します。ローカルパスを含むため安全に保管してください。","Enregistrez applications, favoris, langue et stratégie proxy. Le fichier contient des chemins locaux ; conservez-le en privé."],
  "导出设置": ["Export settings","設定をエクスポート","Exporter les paramètres"],
  "导入设置": ["Import settings","設定をインポート","Importer les paramètres"],
  "设置已导出": ["Settings exported","設定をエクスポートしました","Paramètres exportés"],
  "导入预览": ["Import preview","インポートのプレビュー","Aperçu de l’importation"],
  "仅导入资料": ["Import details only","情報のみインポート","Importer les informations"],
  "导入并应用": ["Import and apply","インポートして適用","Importer et appliquer"],
  "来源时间：{0}": ["Saved at: {0}","保存日時：{0}","Date de sauvegarde : {0}"],
  "已有分流默认不勾选；路径不匹配的应用不会按名称猜测。每次最多选择 100 个。": ["Configured apps are unchecked by default. Apps match by exact path, never by name. Select up to 100 at a time.","設定済みアプリは初期状態では未選択です。名前ではなく正確なパスで照合します。一度に100件まで選択できます。","Les applications configurées ne sont pas cochées par défaut. La correspondance utilise le chemin exact, jamais le nom. Maximum : 100 par importation."],
  "代理应用默认跟随当前组：{0}": ["Proxy apps follow the current group by default: {0}","プロキシアプリは既定で現在のグループに従います：{0}","Par défaut, les applications proxy suivent le groupe actuel : {0}"],
  "同时恢复文件中的代理策略": ["Also restore the saved proxy strategy","保存されたプロキシ戦略も復元","Restaurer aussi la stratégie proxy"],
  "恢复代理策略还会更新当前 {0} 个代理应用的跟随组。": ["Restoring the strategy also changes the group for {0} existing proxy apps.","戦略の復元により、既存のプロキシアプリ{0}件のグループも変わります。","La restauration modifie aussi le groupe de {0} applications proxy existantes."],
  "同时恢复显示语言：{0}": ["Also restore display language: {0}","表示言語も復元：{0}","Restaurer aussi la langue : {0}"],
  "导入前自动备份。不导入订阅、系统代理或旧的连接验证结果。": ["A backup is created before import. Subscriptions, system proxy and old connection evidence are not imported.","インポート前に自動バックアップします。サブスクリプション、システムプロキシ、過去の接続検証結果は移行しません。","Une sauvegarde précède l’importation. Les abonnements, le proxy système et les anciennes preuves de connexion sont exclus."],
  "请在桌面应用中管理设置与备份。": ["Manage settings and backups in the desktop app.","デスクトップアプリで設定とバックアップを管理してください。","Gérez les paramètres et sauvegardes dans l’application de bureau."],
  "当前": ["Current","現在","Actuel"],
  "导入后": ["Imported","インポート後","Après importation"],
  "匹配结果": ["Match","照合結果","Correspondance"],
  "缺少程序路径": ["Missing app path","アプリのパスがありません","Chemin de l’application manquant"],
  "已有设置，默认保留": ["Configured · kept by default","設定済み・既定で保持","Configuré · conservé par défaut"],
  "可导入": ["Ready to import","インポート可能","Importation possible"],
  "应用所选分流设置？": ["Apply selected routing settings?","選択した振り分け設定を適用しますか？","Appliquer les règles sélectionnées ?"],
  "仅修改勾选应用的联网方式，未勾选应用保持原样。失败时沿用现有恢复保护。": ["Only selected apps change. Other apps stay unchanged. Existing recovery protection handles failures.","選択したアプリだけ変更します。他のアプリは保持し、失敗時は既存の復元保護が働きます。","Seules les applications sélectionnées changent. Les autres restent intactes. La protection de restauration existante reste active."],
  "所选设置已导入，分流规则已就绪；新连接仍需验证。": ["Selected settings imported; routing rules are ready. New connections still require verification.","選択した設定をインポートし、ルールを準備しました。新しい接続は引き続き検証が必要です。","Paramètres importés, règles prêtes. Les nouvelles connexions doivent encore être vérifiées."],
  "应用资料与收藏已导入，现有分流保持不变。": ["App details and favorites imported. Existing routing is unchanged.","アプリ情報とお気に入りをインポートしました。既存の振り分けは変更していません。","Informations et favoris importés. Le routage existant reste inchangé."],
  "导入失败，请重新预览。": ["Import failed. Preview again.","インポートに失敗しました。再度プレビューしてください。","Échec de l’importation. Relancez l’aperçu."],
  "导出失败，请重试。": ["Export failed. Try again.","エクスポートに失敗しました。再試行してください。","Échec de l’exportation. Réessayez."],
  "本机未找到对应路径，请先扫描或添加应用。": ["No matching local path. Scan or add the app first.","一致するローカルパスがありません。先にアプリをスキャンまたは追加してください。","Aucun chemin local correspondant. Analysez ou ajoutez l’application."],
  "该应用属于受保护或共享进程，不能导入分流设置。": ["This protected or shared process cannot receive imported routing.","保護対象または共有プロセスのため振り分けをインポートできません。","Ce processus protégé ou partagé ne peut pas recevoir de routage importé."],
  "设置已变化，请重新预览。": ["Settings changed. Preview again.","設定が変更されました。再度プレビューしてください。","Les paramètres ont changé. Relancez l’aperçu."],
  "导入预览已过期，请重新选择文件。": ["Import preview expired. Select the file again.","プレビューの期限が切れました。ファイルを選び直してください。","L’aperçu a expiré. Sélectionnez à nouveau le fichier."],
  "请选择有效的导入项目，一次最多 100 个应用。": ["Select valid entries, up to 100 apps at a time.","有効な項目を一度に100件まで選択してください。","Sélectionnez des entrées valides, 100 applications maximum."],
  "设置文件过大，最多支持 2 MB。": ["Settings files must be no larger than 2 MB.","設定ファイルは2 MB以下にしてください。","Le fichier de paramètres doit faire au maximum 2 Mo."],
  "不是支持的 AppRoute 设置文件。": ["This is not a supported AppRoute settings file.","対応するAppRoute設定ファイルではありません。","Ce fichier de paramètres AppRoute n’est pas pris en charge."],
  "设置文件的时间格式无效。": ["Invalid settings timestamp.","設定の日時形式が無効です。","Date des paramètres invalide."],
  "设置文件含有无效的应用资料。": ["The file contains invalid app details.","ファイルに無効なアプリ情報があります。","Le fichier contient des informations d’application invalides."],
  "设置文件含有重复的应用路径。": ["The file contains duplicate app paths.","アプリのパスが重複しています。","Le fichier contient des chemins d’application en double."],
  "设置文件的显示语言无效。": ["Invalid display language in the file.","ファイルの表示言語が無効です。","Langue d’affichage invalide dans le fichier."],
  "设置文件的代理失效策略无效。": ["Invalid proxy failure policy in the file.","ファイルのプロキシ障害時ポリシーが無効です。","Politique de panne proxy invalide dans le fichier."],
  "设置文件不是有效的 JSON。": ["The settings file is not valid JSON.","設定ファイルは有効なJSONではありません。","Le fichier de paramètres n’est pas un JSON valide."],
  "请等待分流操作或恢复检查完成。": ["Wait for routing or recovery checks to finish.","振り分け操作または復元チェックの完了をお待ちください。","Attendez la fin du routage ou des vérifications de restauration."],
  "文件中没有可恢复的代理策略。": ["No proxy strategy is available in this file.","このファイルに復元可能なプロキシ戦略はありません。","Ce fichier ne contient pas de stratégie proxy à restaurer."],
  "文件中没有可恢复的显示语言。": ["No display language is available in this file.","このファイルに復元可能な表示言語はありません。","Ce fichier ne contient pas de langue à restaurer."],
  "应用路径已失效，请重新预览。": ["The app path is no longer available. Preview again.","アプリのパスが無効になりました。再度プレビューしてください。","Le chemin n’est plus disponible. Relancez l’aperçu."],
  "同时应用的项目超过 100 个，请分批导入或单独恢复代理策略。": ["More than 100 apps would change. Import in batches or restore the strategy separately.","変更対象が100件を超えます。分割してインポートするか、戦略を別に復元してください。","Plus de 100 applications seraient modifiées. Importez par lots ou restaurez la stratégie séparément."],
  "应用资料保存失败；已保留导入前备份，请重新预览后重试。": ["App details could not be saved. The pre-import backup is retained; preview again before retrying.","アプリ情報を保存できませんでした。インポート前のバックアップは保持されています。再度プレビューして再試行してください。","Les informations n’ont pas pu être enregistrées. La sauvegarde préalable est conservée ; relancez l’aperçu avant de réessayer."],
  "显示语言未能恢复，请在语言菜单重新选择。": ["Display language could not be restored. Choose it in the language menu.","表示言語を復元できませんでした。言語メニューで選び直してください。","La langue n’a pas pu être restaurée. Sélectionnez-la dans le menu des langues."],
  "应用资料已变化，请重新读取后再保存。": ["App details changed. Reload them before saving.","アプリ情報が変わりました。読み直してから保存してください。","Les informations ont changé. Rechargez-les avant d’enregistrer."],
  "备份编号无效。": ["Invalid backup ID.","バックアップIDが無効です。","Identifiant de sauvegarde invalide."],
  "备份文件无法安全读取。": ["The backup file cannot be read safely.","バックアップファイルを安全に読み取れません。","Le fichier de sauvegarde ne peut pas être lu en sécurité."],
  "备份已变化或属于未完成事务，请刷新列表。": ["The backup changed or belongs to an unfinished operation. Refresh the list.","バックアップが変更されたか、未完了の操作に属します。一覧を更新してください。","La sauvegarde a changé ou appartient à une opération inachevée. Actualisez la liste."],
  "规则已就绪": ["Rules ready", "ルール準備完了", "Règles prêtes"],
  "规则已写入并在内核加载，尚未观察到新连接。打开应用并建立新连接后才能验证实际出口；现有连接不会自动切换。": ["Rules are loaded in the core; no new connection has been observed yet. Open the app and create a new connection to verify its route. Existing connections do not switch automatically.", "ルールはコアに読み込み済みですが、新しい接続はまだ観測されていません。アプリで新しく接続すると経路を検証できます。既存の接続は自動で切り替わりません。", "Les règles sont chargées dans le moteur, mais aucune nouvelle connexion n’a encore été observée. Ouvrez l’application et établissez une nouvelle connexion pour vérifier sa route. Les connexions existantes ne changent pas automatiquement."],
  "上次自检 · {0}": ["Last check · {0}", "前回のチェック · {0}", "Dernière vérification · {0}"],
  "连接或配置已变化，请重新检查": ["Connection or configuration changed. Run the checks again.", "接続または設定が変わりました。再チェックしてください。", "La connexion ou la configuration a changé. Relancez les vérifications."],
  "结果已过期，请重新检查": ["Results have expired. Run the checks again.", "結果の有効期限が切れました。再チェックしてください。", "Les résultats ont expiré. Relancez les vérifications."],
  "上次结果：通过 {0}/{1} 项": ["Previous results: {0}/{1} passed", "前回の結果：{0}/{1} 合格", "Résultats précédents : {0}/{1} réussies"],
  "构建于 {0}": ["Built on {0}", "ビルド日時 {0}", "Compilé le {0}"],
  "项目主页": ["Project", "プロジェクト", "Projet"],
  "反馈问题": ["Report an issue", "問題を報告", "Signaler un problème"],
  "复制版本信息": ["Copy version info", "バージョン情報をコピー", "Copier la version"],
  "版本信息已复制": ["Version information copied", "バージョン情報をコピーしました", "Informations de version copiées"],
  "复制失败，请稍后重试。": ["Could not copy. Please try again.", "コピーできませんでした。再試行してください。", "Copie impossible. Réessayez."],
  "无法打开链接，请稍后重试。": ["Could not open the link. Please try again.", "リンクを開けませんでした。再試行してください。", "Impossible d’ouvrir le lien. Réessayez."],
  "连接方式": ["Connection", "接続方法", "Connexion"],
  "代理组": ["Proxy group", "プロキシグループ", "Groupe proxy"],
  "内核已连接": ["Core connected", "コアに接続済み", "Moteur connecté"],
  "连接异常": ["Connection issue", "接続エラー", "Problème de connexion"],
  "本机控制接口": ["Local control interface", "ローカル制御インターフェース", "Interface de contrôle locale"],
  "自检通过 {0}/{1} 项": ["Checks passed: {0}/{1}", "チェック合格：{0}/{1}", "Vérifications réussies : {0}/{1}"],
  "关于 AppRoute": ["About AppRoute", "AppRoute について", "À propos d’AppRoute"],
  "预览版": ["Preview", "プレビュー版", "Aperçu"],
  "关于": ["About", "このアプリについて", "À propos"],
  "当前为集成测试版，尚未发布稳定版本。": ["This is an integration preview. A stable version has not been released.", "統合テスト版です。安定版はまだリリースされていません。", "Ceci est une version de test d’intégration. Aucune version stable n’a encore été publiée."],
  "系统共享进程不能设置专属分流，请选择具体应用；已有设置可切回按 Clash 规则。": [
    "Shared system processes cannot have dedicated routing. Select a specific app; existing settings can be returned to Clash rules.",
    "共有システムプロセスには専用ルールを設定できません。個別のアプリを選択してください。既存の設定は Clash ルールに戻せます。",
    "Les processus système partagés ne peuvent pas recevoir de règles dédiées. Sélectionnez une application ; les réglages existants peuvent revenir aux règles Clash."
  ],
  "应用管理": [
    "Applications",
    "アプリ管理",
    "Applications"
  ],
  "分流规则": [
    "Routing rules",
    "振り分けルール",
    "Règles de routage"
  ],
  "使用帮助": [
    "Help",
    "ヘルプ",
    "Aide"
  ],
  "图标管理": [
    "Icon library",
    "アイコン管理",
    "Bibliothèque d’icônes"
  ],
  "请先在上方绑定 Clash Party 代理组，所有代理应用会共用它。": [
    "Select a Clash Party group above first. All proxy apps will follow it.",
    "先に上部で Clash Party のグループを選択してください。プロキシを使うアプリはこのグループに従います。",
    "Choisissez d’abord un groupe Clash Party. Toutes les applications utilisant le proxy le suivront."
  ],
  "AppRoute-设置记录.json": [
    "AppRoute-settings.json",
    "AppRoute-settings.json",
    "AppRoute-parametres.json"
  ],
  "已导出当前设置记录；连接验证状态请以页面为准": [
    "Settings exported. Check the app for connection verification.",
    "設定をエクスポートしました。接続の検証状態は画面で確認してください。",
    "Paramètres exportés. Consultez l’application pour la vérification des connexions."
  ],
  "从列表移除「{0}」？": [
    "Remove “{0}” from the list?",
    "「{0}」を一覧から削除しますか？",
    "Retirer « {0} » de la liste ?"
  ],
  "只从当前列表移除；重新扫描后本机应用会再次出现。不会卸载软件。": [
    "This only removes the list entry. Scanning may find it again. The software is not uninstalled.",
    "一覧からのみ削除します。再スキャンで再表示される場合があります。アンインストールはしません。",
    "Seule l’entrée est retirée. Une analyse peut la retrouver. Le logiciel reste installé."
  ],
  "移除": [
    "Remove",
    "削除",
    "Retirer"
  ],
  "保留": [
    "Keep",
    "残す",
    "Conserver"
  ],
  "查看 Clash Party 连接状态": [
    "View Clash Party connection status",
    "Clash Party の接続状態を表示",
    "Voir l’état de connexion à Clash Party"
  ],
  "已连接": [
    "Connected",
    "接続済み",
    "Connecté"
  ],
  "连接中断": [
    "Connection lost",
    "接続が切れました",
    "Connexion interrompue"
  ],
  "未连接": [
    "Disconnected",
    "未接続",
    "Déconnecté"
  ],
  "正在连接…": [
    "Connecting…",
    "接続中…",
    "Connexion…"
  ],
  "AppRoute · 预览版": [
    "AppRoute · Preview",
    "AppRoute · プレビュー",
    "AppRoute · Aperçu"
  ],
  "桌面应用": [
    "Desktop app",
    "デスクトップ版",
    "Application de bureau"
  ],
  "关闭窗口会收至托盘。右键托盘图标可退出；离线恢复入口独立运行。": [
    "Closing the window minimizes to the tray. Right-click the tray icon to quit. Offline recovery runs independently.",
    "ウィンドウを閉じるとトレイに格納します。終了はトレイの右クリックから。オフライン復旧は独立して動作します。",
    "Fermer la fenêtre réduit l’application dans la zone de notification. Faites un clic droit pour quitter. La restauration hors ligne est indépendante."
  ],
  "当前为开发预览。正式桌面入口从本地程序启动。": [
    "This is a development preview. Launch the installed app for the desktop version.",
    "開発用プレビューです。デスクトップ版はインストールしたアプリから起動してください。",
    "Ceci est un aperçu de développement. Lancez l’application installée pour la version de bureau."
  ],
  "打开导航": [
    "Open navigation",
    "ナビゲーションを開く",
    "Ouvrir la navigation"
  ],
  "工作空间": [
    "Workspace",
    "ワークスペース",
    "Espace de travail"
  ],
  "开发预览": [
    "Development preview",
    "開発プレビュー",
    "Aperçu de développement"
  ],
  "为常用应用选择联网方式。": [
    "Choose how your everyday apps connect.",
    "よく使うアプリの接続方法を選びます。",
    "Choisissez la connexion de vos applications habituelles."
  ],
  "添加应用": [
    "Add app",
    "アプリを追加",
    "Ajouter une application"
  ],
  "扫描应用": [
    "Scan apps",
    "アプリをスキャン",
    "Analyser les applications"
  ],
  "重试扫描": [
    "Retry scan",
    "再スキャン",
    "Relancer l’analyse"
  ],
  "发现 {0} 个新应用，已加入全部应用，联网方式沿用原有规则。": [
    "Found {0} new apps in All apps. Their existing routing rules are unchanged.",
    "新しいアプリを {0} 件「すべて」に追加しました。接続には従来のルールを使います。",
    "{0} nouvelles applications ajoutées à « Toutes ». Leurs règles existantes sont conservées."
  ],
  "查看全部": [
    "View all",
    "すべて表示",
    "Tout voir"
  ],
  "我的应用": [
    "My apps",
    "マイアプリ",
    "Mes applications"
  ],
  "正在运行": [
    "Running",
    "実行中",
    "En cours"
  ],
  "全部应用": [
    "All apps",
    "すべて",
    "Toutes"
  ],
  "搜索结果": [
    "Search results",
    "検索結果",
    "Résultats"
  ],
  "搜索全部应用": [
    "Search all apps",
    "すべてのアプリを検索",
    "Rechercher une application"
  ],
  "全部应用中找到 {0} 项": [
    "{0} matches across all apps",
    "すべてのアプリから {0} 件見つかりました",
    "{0} résultats dans toutes les applications"
  ],
  "收藏 + 已设分流": [
    "Favorites + configured apps",
    "お気に入り＋振り分け設定済み",
    "Favoris + applications configurées"
  ],
  "当前运行的应用": [
    "Currently running apps",
    "現在実行中のアプリ",
    "Applications en cours d’exécution"
  ],
  "本机 {0} 个应用": [
    "{0} apps on this device",
    "この端末のアプリ {0} 件",
    "{0} applications sur cet appareil"
  ],
  "搜索范围": [
    "Search scope",
    "検索対象",
    "Portée de la recherche"
  ],
  "应用列表": [
    "Application list",
    "アプリ一覧",
    "Liste des applications"
  ],
  "按名称、主进程、辅助进程和路径搜索全部应用，不受当前标签或系统工具折叠限制。下方筛选条件仍生效。": [
    "Search all apps by name, main or helper process, and path, regardless of the current tab or collapsed system tools. Other filters still apply.",
    "タブやシステムツールの折りたたみに関係なく、名前・主プロセス・補助プロセス・パスから全アプリを検索します。他のフィルターは有効です。",
    "La recherche couvre les noms, processus et chemins de toutes les applications, quel que soit l’onglet. Les autres filtres restent actifs."
  ],
  "“我的应用”包含你收藏的应用，以及已设置直接联网或跟随代理组的应用，不根据使用频率猜测。": [
    "My apps includes favorites and apps set to Direct or Follow group. It does not estimate usage frequency.",
    "マイアプリには、お気に入りと「直接接続」「グループに従う」を設定したアプリが入ります。使用頻度は推測しません。",
    "Mes applications regroupe les favoris et les applications en connexion directe ou suivant un groupe. Ce n’est pas un classement d’utilisation."
  ],
  "可在“更多”或应用详情中收藏，不改变联网方式。新安装的软件自动加入“全部应用”，也可手动扫描。": [
    "Add favorites from More or App details without changing routing. New apps appear in All apps automatically; manual scanning is also available.",
    "「その他」やアプリ詳細でお気に入りに追加できます。接続設定は変わりません。新しいアプリは自動検出され、手動スキャンも可能です。",
    "Ajoutez des favoris via le menu ou les détails, sans changer le routage. Les nouvelles applications sont détectées automatiquement ; l’analyse manuelle reste disponible."
  ],
  "只看收藏": [
    "Favorites only",
    "お気に入りのみ",
    "Favoris uniquement"
  ],
  "联网方式筛选": [
    "Filter connection method",
    "接続方法で絞り込み",
    "Filtrer par connexion"
  ],
  "全部联网方式": [
    "All connection methods",
    "すべての接続方法",
    "Toutes les connexions"
  ],
  "应用分类筛选": [
    "Filter app category",
    "カテゴリで絞り込み",
    "Filtrer par catégorie"
  ],
  "所有分类": [
    "All categories",
    "すべてのカテゴリ",
    "Toutes les catégories"
  ],
  "筛选：": [
    "Filters: ",
    "絞り込み：",
    "Filtres : "
  ],
  "已收藏": [
    "Favorited",
    "お気に入り",
    "Favori"
  ],
  "清除筛选": [
    "Clear filters",
    "絞り込みを解除",
    "Effacer les filtres"
  ],
  "重试": [
    "Retry",
    "再試行",
    "Réessayer"
  ],
  "已选择": [
    "Selected ",
    "選択済み ",
    "Sélection : "
  ],
  "个应用": [
    " apps",
    " アプリ",
    " applications"
  ],
  "已加入我的应用，联网方式保持不变": [
    "Added to My apps. Routing is unchanged.",
    "マイアプリに追加しました。接続設定は変わりません。",
    "Ajouté à Mes applications. Le routage est inchangé."
  ],
  "加入收藏": [
    "Add to favorites",
    "お気に入りに追加",
    "Ajouter aux favoris"
  ],
  "批量应用连接方式": [
    "Set connection method",
    "接続方法を一括設定",
    "Définir la connexion"
  ],
  "取消选择": [
    "Clear selection",
    "選択を解除",
    "Désélectionner"
  ],
  "没有匹配的应用，请尝试名称、进程或清除筛选": [
    "No matches. Try a name, process, or clear the filters.",
    "該当なし。名前・プロセス名を変更するか、絞り込みを解除してください。",
    "Aucun résultat. Essayez un nom, un processus ou effacez les filtres."
  ],
  "收藏常用软件，或设置专属分流后，它们会出现在这里": [
    "Favorite an app or set its routing to show it here.",
    "お気に入りに追加するか、振り分けを設定するとここに表示されます。",
    "Ajoutez un favori ou configurez son routage pour le voir ici."
  ],
  "没有找到匹配的应用": [
    "No matching apps",
    "該当するアプリがありません",
    "Aucune application correspondante"
  ],
  "系统工具与维护程序 · {0} 个": [
    "System and maintenance tools · {0}",
    "システム・保守ツール · {0} 件",
    "Outils système et de maintenance · {0}"
  ],
  "当前视图": [
    "Showing ",
    "表示中 ",
    "Affichage : "
  ],
  "个 · 本机共": [
    " of ",
    " / 合計 ",
    " sur "
  ],
  "个": [
    " items",
    " 件",
    " éléments"
  ],
  " · 正在检查新应用…": [
    " · Checking for new apps…",
    " · 新しいアプリを確認中…",
    " · Recherche de nouvelles applications…"
  ],
  " · 最近检查 {0}": [
    " · Last checked {0}",
    " · 最終確認 {0}",
    " · Dernière analyse : {0}"
  ],
  "联网方式说明": [
    "Connection methods explained",
    "接続方法の説明",
    "Comprendre les connexions"
  ],
  "列表缓存未能保存，下次将重新扫描。": [
    "Could not save the list cache. It will be scanned again next time.",
    "一覧を保存できませんでした。次回再スキャンします。",
    "La liste n’a pas pu être enregistrée. Une nouvelle analyse aura lieu au prochain lancement."
  ],
  "应用资料已保存，请在列表中选择联网方式": [
    "App details saved. Choose its connection method in the list.",
    "アプリ情報を保存しました。一覧で接続方法を選択してください。",
    "Informations enregistrées. Choisissez la connexion dans la liste."
  ],
  "应用详情": [
    "App details",
    "アプリ詳細",
    "Détails de l’application"
  ],
  "关闭": [
    "Close",
    "閉じる",
    "Fermer"
  ],
  "编辑资料": [
    "Edit details",
    "情報を編集",
    "Modifier les informations"
  ],
  "连接已中断，以下保留最近一次读取的记录。": [
    "Connection lost. Showing the last records read.",
    "接続が切れました。最後に取得した記録を表示しています。",
    "Connexion interrompue. Affichage des derniers enregistrements lus."
  ],
  "取消收藏": [
    "Remove favorite",
    "お気に入りを解除",
    "Retirer des favoris"
  ],
  "收藏": [
    "Favorite",
    "お気に入り",
    "Favori"
  ],
  "联网状态": [
    "Connection status",
    "接続状態",
    "État de connexion"
  ],
  "已保存方式": [
    "Saved method",
    "保存済みの方法",
    "Méthode enregistrée"
  ],
  "缺少记录，待核对": [
    "Missing records; review required",
    "記録なし・確認が必要",
    "Enregistrements manquants ; à vérifier"
  ],
  "已绑定代理组": [
    "Bound proxy group",
    "関連付けたグループ",
    "Groupe associé"
  ],
  "未指定": [
    "Not specified",
    "未指定",
    "Non défini"
  ],
  "组当前选择": [
    "Group selection",
    "グループの選択先",
    "Sélection du groupe"
  ],
  "我的应用收录": [
    "Included in My apps",
    "マイアプリへの登録",
    "Présence dans Mes applications"
  ],
  "已设置专属分流": [
    "App-specific routing set",
    "専用ルール設定済み",
    "Routage spécifique configuré"
  ],
  "尚未收录；收藏后即可加入": [
    "Not included yet; add it to favorites",
    "未登録。お気に入りに追加できます",
    "Pas encore inclus ; ajoutez aux favoris"
  ],
  "实际连接": [
    "Observed connections",
    "観測した接続",
    "Connexions observées"
  ],
  "条": [
    " connections",
    " 件",
    " connexions"
  ],
  "只显示已观察到的连接；已有连接可能仍使用旧节点。": [
    "Only observed connections are shown. Existing connections may still use a previous node.",
    "観測した接続のみ表示します。既存の接続は以前のノードを使い続ける場合があります。",
    "Seules les connexions observées sont affichées. Les connexions existantes peuvent conserver l’ancien nœud."
  ],
  "符合设置": [
    "Matches settings",
    "設定と一致",
    "Conforme"
  ],
  "不符合设置": [
    "Does not match",
    "設定と不一致",
    "Non conforme"
  ],
  "（旧节点）": [
    " (previous node)",
    "（以前のノード）",
    " (ancien nœud)"
  ],
  "尚未观察到新连接": [
    "No new connections observed yet",
    "新しい接続はまだ観測されていません",
    "Aucune nouvelle connexion observée"
  ],
  "主程序与辅助进程 · {0} 个": [
    "Main and helper processes · {0}",
    "主・補助プロセス · {0} 件",
    "Processus principaux et auxiliaires · {0}"
  ],
  "应用规则按程序路径匹配；辅助进程由后端识别。": [
    "Rules match executable paths. Helper processes are identified by the backend.",
    "ルールは実行ファイルのパスで照合します。補助プロセスはバックエンドが識別します。",
    "Les règles correspondent aux chemins exécutables. Le service identifie les processus auxiliaires."
  ],
  "程序位置与来源": [
    "Location and source",
    "場所と検出元",
    "Emplacement et origine"
  ],
  "来源": [
    "Source",
    "検出元",
    "Origine"
  ],
  "本机扫描": [
    "Local scan",
    "端末のスキャン",
    "Analyse locale"
  ],
  "手动添加或管理记录": [
    "Manually added or managed record",
    "手動追加または管理記録",
    "Ajout manuel ou enregistrement géré"
  ],
  "主程序": [
    "Main executable",
    "主プログラム",
    "Exécutable principal"
  ],
  "未记录": [
    "Not recorded",
    "記録なし",
    "Non enregistré"
  ],
  "其他应用": [
    "Other apps",
    "その他",
    "Autres applications"
  ],
  "示例应用": [
    "Example app",
    "サンプルアプリ",
    "Application d’exemple"
  ],
  "手动添加": [
    "Added manually",
    "手動追加",
    "Ajout manuel"
  ],
  "编辑应用资料": [
    "Edit app details",
    "アプリ情報を編集",
    "Modifier l’application"
  ],
  "取消": [
    "Cancel",
    "キャンセル",
    "Annuler"
  ],
  "保存资料": [
    "Save details",
    "情報を保存",
    "Enregistrer"
  ],
  "添加到我的应用": [
    "Add to My apps",
    "マイアプリに追加",
    "Ajouter à Mes applications"
  ],
  "未能读取程序文件，请重试或填写路径": [
    "Could not read the executable. Retry or enter its path.",
    "プログラムを読み取れません。再試行するかパスを入力してください。",
    "Impossible de lire l’exécutable. Réessayez ou saisissez son chemin."
  ],
  "从电脑选择程序文件…": [
    "Choose an executable…",
    "プログラムファイルを選択…",
    "Choisir un exécutable…"
  ],
  "应用名称": [
    "App name",
    "アプリ名",
    "Nom de l’application"
  ],
  "请输入应用名称": [
    "Enter an app name",
    "アプリ名を入力してください",
    "Saisissez un nom"
  ],
  "应用名称最多 80 个字符": [
    "Use no more than 80 characters",
    "80 文字以内で入力してください",
    "80 caractères maximum"
  ],
  "例如：QQ 音乐": [
    "For example: QQ Music",
    "例：QQ Music",
    "Exemple : QQ Music"
  ],
  "应用分类": [
    "Category",
    "カテゴリ",
    "Catégorie"
  ],
  "已识别进程 · {0} 个": [
    "Identified processes · {0}",
    "識別済みプロセス · {0} 件",
    "Processus identifiés · {0}"
  ],
  "主进程文件名": [
    "Main process filename",
    "主プロセスのファイル名",
    "Nom du processus principal"
  ],
  "请至少添加一个进程": [
    "Add at least one process",
    "プロセスを 1 件以上追加してください",
    "Ajoutez au moins un processus"
  ],
  "请输入有效的文件名，例如 QQMusic.exe，不要填写完整路径": [
    "Enter a filename such as QQMusic.exe, not a full path.",
    "QQMusic.exe のようなファイル名を入力してください。フルパスは不要です。",
    "Saisissez un nom de fichier, comme QQMusic.exe, sans chemin complet."
  ],
  "该主程序路径已属于「{0}」，请编辑已有应用": [
    "This path already belongs to “{0}”. Edit that app instead.",
    "このパスは「{0}」に登録済みです。既存のアプリを編集してください。",
    "Ce chemin appartient déjà à « {0} ». Modifiez cette application."
  ],
  "例如：QQMusic.exe": [
    "For example: QQMusic.exe",
    "例：QQMusic.exe",
    "Exemple : QQMusic.exe"
  ],
  "主程序完整路径": [
    "Full executable path",
    "実行ファイルのフルパス",
    "Chemin complet de l’exécutable"
  ],
  "请输入本机 exe 完整路径": [
    "Enter the full path to a local exe",
    "端末の exe のフルパスを入力してください",
    "Saisissez le chemin complet d’un fichier exe local"
  ],
  "本机 exe 文件的完整路径": [
    "Full path to the local exe file",
    "端末の exe ファイルのフルパス",
    "Chemin complet du fichier exe local"
  ],
  "程序位置": [
    "Executable location",
    "プログラムの場所",
    "Emplacement du programme"
  ],
  "这里只保存资料。联网方式在应用列表中选择。": [
    "This only saves app details. Choose routing in the application list.",
    "ここでは情報のみ保存します。接続方法はアプリ一覧で選択してください。",
    "Seules les informations sont enregistrées ici. Choisissez le routage dans la liste."
  ],
  "等待应用": [
    "Queued",
    "適用待ち",
    "En attente"
  ],
  "正在应用": [
    "Applying",
    "適用中",
    "Application en cours"
  ],
  "应用失败": [
    "Apply failed",
    "適用失敗",
    "Échec de l’application"
  ],
  "已加入队列，可继续选择。同一应用以最后一次选择为准。": [
    "Queued. You can keep selecting; the latest choice for each app wins.",
    "待ち行列に追加しました。続けて選択できます。同じアプリには最後の選択を適用します。",
    "En attente. Vous pouvez continuer ; le dernier choix pour chaque application sera retenu."
  ],
  "正在应用并检查，失败会恢复上一版。可以继续选择其他应用。": [
    "Applying and checking. Failure restores the previous settings. You can select other apps.",
    "適用・確認中です。失敗時は前の設定に戻します。他のアプリも選択できます。",
    "Application et vérification en cours. En cas d’échec, les réglages précédents seront rétablis. Vous pouvez sélectionner d’autres applications."
  ],
  "查看应用详情": [
    "View app details",
    "アプリ詳細を表示",
    "Voir les détails"
  ],
  "{0}：{1}，查看说明": [
    "{0}: {1}. View explanation.",
    "{0}：{1}。説明を表示",
    "{0} : {1}. Voir l’explication."
  ],
  "待核对历史规则": [
    "Review historical rules",
    "過去のルールを確認",
    "Vérifier les anciennes règles"
  ],
  "当前分流待核对": [
    "Routing needs review",
    "振り分けの確認が必要",
    "Routage à vérifier"
  ],
  "Clash Party 仍有历史 AppRoute 规则，本机管理记录已为空。请先核对记录或在恢复网络中停用历史规则，再设置联网方式。": [
    "Clash Party still has AppRoute rules, but local management records are empty. Review the records or restore the network before changing routing.",
    "Clash Party に AppRoute のルールが残っていますが、管理記録がありません。記録を確認するか復旧してから設定してください。",
    "Des règles AppRoute subsistent dans Clash Party sans enregistrements locaux. Vérifiez les enregistrements ou restaurez le réseau avant toute modification."
  ],
  "{0} 的连接方式": [
    "Connection method for {0}",
    "{0} の接続方法",
    "Connexion de {0}"
  ],
  "选择 {0}": [
    "Select {0}",
    "{0} を選択",
    "Sélectionner {0}"
  ],
  "查看全部应用": [
    "View all apps",
    "すべてのアプリを表示",
    "Voir toutes les applications"
  ],
  "应用": [
    "Application",
    "アプリ",
    "Application"
  ],
  "查看 {0} 详情": [
    "View details for {0}",
    "{0} の詳細を表示",
    "Voir les détails de {0}"
  ],
  "状态": [
    "Status",
    "状態",
    "État"
  ],
  "联网方式": [
    "Connection",
    "接続方法",
    "Connexion"
  ],
  "点击即应用": [
    "Applied on click",
    "クリックで適用",
    "Appliquer au clic"
  ],
  "选择后自动应用，可连续操作。等待中的选项尚未生效，失败会恢复上一版。": [
    "Choices apply automatically; you can keep selecting. Queued choices are not active yet. Failure restores the previous settings.",
    "選択は自動適用され、続けて操作できます。待機中は未適用です。失敗時は前の設定に戻します。",
    "Les choix s’appliquent automatiquement. Vous pouvez continuer. Les choix en attente ne sont pas encore actifs ; un échec rétablit les réglages précédents."
  ],
  "按 Clash 规则：沿用原有规则。直接联网：不经远端节点。跟随代理组：由顶部策略选择出口。": [
    "Clash rules: keep existing rules. Direct: no remote proxy node. Follow group: use the strategy above.",
    "Clash ルール：従来のルールを使用。直接接続：遠隔ノードを経由しない。グループに従う：上部の戦略を使用。",
    "Règles Clash : conserver les règles. Direct : sans nœud distant. Suivre le groupe : utiliser la stratégie ci-dessus."
  ],
  "重新识别并应用": [
    "Identify and apply again",
    "再識別して適用",
    "Identifier et réappliquer"
  ],
  "从列表移除": [
    "Remove from list",
    "一覧から削除",
    "Retirer de la liste"
  ],
  "更多操作": [
    "More actions",
    "その他の操作",
    "Autres actions"
  ],
  "{0} 更多操作": [
    "More actions for {0}",
    "{0} のその他の操作",
    "Autres actions pour {0}"
  ],
  "{0}说明": [
    "About {0}",
    "{0}の説明",
    "À propos de {0}"
  ],
  "图片边长不能超过 4096 像素。": [
    "Image dimensions must not exceed 4096 pixels.",
    "画像の辺の長さは 4096 ピクセル以下にしてください。",
    "Les dimensions ne doivent pas dépasser 4096 pixels."
  ],
  "操作失败": [
    "Operation failed",
    "操作に失敗しました",
    "Échec de l’opération"
  ],
  "公共图标读取失败": [
    "Could not load the library icon",
    "ライブラリのアイコンを読み込めません",
    "Impossible de charger l’icône"
  ],
  "已使用所选图标": [
    "Selected icon applied",
    "選択したアイコンを適用しました",
    "Icône sélectionnée appliquée"
  ],
  "补齐或替换应用图标，保存在本机。": [
    "Complete or replace app icons, stored on this device.",
    "アプリのアイコンを補完・変更し、この端末に保存します。",
    "Complétez ou remplacez les icônes, enregistrées sur cet appareil."
  ],
  "图标来源": [
    "Icon source",
    "アイコンの取得元",
    "Origine de l’icône"
  ],
  "优先使用自定义图标，再从本机程序与公共库自动匹配。替换图标不改变联网方式，随时可以恢复自动选择。": [
    "Custom icons take priority, followed by local extraction and the library. Changing an icon does not change routing; automatic selection can be restored anytime.",
    "カスタム画像、本機からの抽出、ライブラリの順に使います。アイコン変更は接続に影響せず、いつでも自動選択に戻せます。",
    "Les icônes personnalisées sont prioritaires, puis viennent l’extraction locale et la bibliothèque. Le routage reste inchangé ; la sélection automatique peut être rétablie."
  ],
  "已重新扫描并检查本机图标": [
    "Local icons scanned and checked",
    "端末のアイコンを再確認しました",
    "Icônes locales analysées et vérifiées"
  ],
  "检查并补齐": [
    "Check icons",
    "確認して補完",
    "Vérifier les icônes"
  ],
  "本机应用": [
    "Local apps",
    "端末のアプリ",
    "Applications locales"
  ],
  "已有图标": [
    "Icons available",
    "アイコンあり",
    "Icônes disponibles"
  ],
  "待完善": [
    "Needs attention",
    "要確認",
    "À compléter"
  ],
  "公共图标": [
    "Library icons",
    "公開アイコン",
    "Icônes de la bibliothèque"
  ],
  "公共图标库": [
    "Public library",
    "公開ライブラリ",
    "Bibliothèque publique"
  ],
  "搜索图标": [
    "Search icons",
    "アイコンを検索",
    "Rechercher des icônes"
  ],
  "搜索应用名称或进程": [
    "Search app or process",
    "アプリ名・プロセス名で検索",
    "Rechercher un nom ou un processus"
  ],
  "图标来源筛选": [
    "Filter icon sources",
    "取得元で絞り込み",
    "Filtrer par origine"
  ],
  "全部来源": [
    "All sources",
    "すべての取得元",
    "Toutes les origines"
  ],
  "加载失败": [
    "Load failed",
    "読み込み失敗",
    "Échec du chargement"
  ],
  "矢量图标": [
    "Vector icon",
    "ベクターアイコン",
    "Icône vectorielle"
  ],
  "{0} 图标": [
    "Icon for {0}",
    "{0} のアイコン",
    "Icône de {0}"
  ],
  "替换 {0} 图标": [
    "Replace icon for {0}",
    "{0} のアイコンを変更",
    "Remplacer l’icône de {0}"
  ],
  "替换": [
    "Replace",
    "変更",
    "Remplacer"
  ],
  "从图标库选择": [
    "Choose from library",
    "ライブラリから選択",
    "Choisir dans la bibliothèque"
  ],
  "恢复 {0} 自动图标": [
    "Restore automatic icon for {0}",
    "{0} のアイコンを自動選択に戻す",
    "Rétablir l’icône automatique de {0}"
  ],
  "已恢复自动选择": [
    "Automatic selection restored",
    "自動選択に戻しました",
    "Sélection automatique rétablie"
  ],
  "恢复自动": [
    "Restore automatic",
    "自動に戻す",
    "Rétablir l’automatique"
  ],
  "当前列表没有待完善图标": [
    "No icons need attention in this list",
    "この一覧に未補完のアイコンはありません",
    "Aucune icône à compléter dans cette liste"
  ],
  "没有匹配的应用": [
    "No matching apps",
    "該当するアプリがありません",
    "Aucune application correspondante"
  ],
  "个结果 ·": [
    " results · ",
    " 件 · ",
    " résultats · "
  ],
  "自动提取成功不等于已人工核对外观": [
    "Extraction success does not mean visual review is complete",
    "抽出成功は外観の確認済みを意味しません",
    "L’extraction réussie ne remplace pas une vérification visuelle"
  ],
  "素材许可与商标权分别保留": [
    "Asset licenses and trademark rights remain separate",
    "素材ライセンスと商標権はそれぞれ留保されます",
    "Les licences et droits de marque restent distincts"
  ],
  "上一页": [
    "Previous",
    "前へ",
    "Précédent"
  ],
  "下一页": [
    "Next",
    "次へ",
    "Suivant"
  ],
  "选择本机图标文件": [
    "Choose a local icon file",
    "端末のアイコン画像を選択",
    "Choisir une image locale"
  ],
  "请选择不超过 2 MB 的 PNG、JPG 或 WebP 图片。": [
    "Choose a PNG, JPG, or WebP image no larger than 2 MB.",
    "2 MB 以下の PNG・JPG・WebP を選択してください。",
    "Choisissez une image PNG, JPG ou WebP de 2 Mo maximum."
  ],
  "图标已替换": [
    "Icon replaced",
    "アイコンを変更しました",
    "Icône remplacée"
  ],
  "为 {0} 选择图标": [
    "Choose an icon for {0}",
    "{0} のアイコンを選択",
    "Choisir une icône pour {0}"
  ],
  "使用此图标": [
    "Use this icon",
    "このアイコンを使用",
    "Utiliser cette icône"
  ],
  "搜索公共图标": [
    "Search the icon library",
    "公開アイコンを検索",
    "Rechercher dans la bibliothèque"
  ],
  "没有匹配的图标，请尝试其他名称": [
    "No icons found. Try another name.",
    "該当するアイコンがありません。別の名前で検索してください。",
    "Aucune icône trouvée. Essayez un autre nom."
  ],
  "已选择：{0}": [
    "Selected: {0}",
    "選択中：{0}",
    "Sélection : {0}"
  ],
  "先选择图标，再点击“使用此图标”。": [
    "Select an icon, then click Use this icon.",
    "アイコンを選んで「このアイコンを使用」をクリックしてください。",
    "Sélectionnez une icône, puis cliquez sur « Utiliser cette icône »."
  ],
  "设置已在其他操作中变化，请关闭后重新打开，核对最新策略。": [
    "Settings changed elsewhere. Close and reopen to review the latest strategy.",
    "別の操作で設定が変わりました。閉じて開き直し、最新の戦略を確認してください。",
    "Les paramètres ont changé ailleurs. Fermez puis rouvrez pour vérifier la stratégie actuelle."
  ],
  "代理策略已应用，后续新连接按此策略选择节点。": [
    "Strategy applied. New connections will use it to select a node.",
    "戦略を適用しました。以後の新しい接続はこの戦略でノードを選択します。",
    "Stratégie appliquée. Les nouvelles connexions l’utiliseront pour choisir un nœud."
  ],
  "策略应用失败，请检查恢复状态。": [
    "Strategy failed. Check recovery status.",
    "戦略の適用に失敗しました。復旧状態を確認してください。",
    "Échec de la stratégie. Vérifiez l’état de restauration."
  ],
  "代理策略": [
    "Proxy strategy",
    "プロキシ戦略",
    "Stratégie proxy"
  ],
  "应用到所有已设为走代理的应用": [
    "Applies to every app following the proxy group",
    "グループに従うすべてのアプリに適用",
    "Pour toutes les applications suivant le groupe"
  ],
  "应用策略": [
    "Apply strategy",
    "戦略を適用",
    "Appliquer la stratégie"
  ],
  "为所有“跟随代理组”的应用选择出口。": [
    "Choose the outbound strategy for all apps following the proxy group.",
    "「グループに従う」すべてのアプリの出口を選びます。",
    "Choisissez la sortie de toutes les applications suivant le groupe."
  ],
  "请先核对历史规则，当前可查看选项但不能应用策略。": [
    "Review historical rules first. You can inspect options but cannot apply a strategy yet.",
    "先に過去のルールを確認してください。選択肢は閲覧できますが、適用はできません。",
    "Vérifiez d’abord les anciennes règles. Vous pouvez consulter les options, mais pas encore les appliquer."
  ],
  "使用 Clash Party 已有组，继续跟随它的选择。": [
    "Follow the selection of an existing Clash Party group.",
    "Clash Party の既存グループの選択に従います。",
    "Suivre la sélection d’un groupe Clash Party existant."
  ],
  "按优先顺序使用可用节点，当前节点故障时使用备用。": [
    "Use available nodes in priority order; switch to a backup if the current node fails.",
    "優先順位順に使えるノードを選び、障害時は予備に切り替えます。",
    "Utiliser les nœuds disponibles par priorité et basculer vers un secours en cas d’échec."
  ],
  "根据探测延迟选择节点，差距较小时保持当前节点。": [
    "Choose by measured latency; keep the current node when the difference is small.",
    "測定遅延で選択し、差が小さい場合は現在のノードを維持します。",
    "Choisir selon la latence mesurée et conserver le nœud actuel si l’écart est faible."
  ],
  "跟随哪个代理组": [
    "Proxy group to follow",
    "従うプロキシグループ",
    "Groupe à suivre"
  ],
  "沿用的代理组": [
    "Existing proxy group",
    "既存のプロキシグループ",
    "Groupe proxy existant"
  ],
  "选择 Clash Party 已有组": [
    "Choose an existing Clash Party group",
    "Clash Party の既存グループを選択",
    "Choisir un groupe Clash Party existant"
  ],
  "不改变这个组的成员或自动策略。可以在 Clash Party 中继续手动切换。": [
    "This does not change the group members or automatic strategy. You can still switch manually in Clash Party.",
    "メンバーや自動戦略は変更しません。Clash Party での手動切り替えも引き続き可能です。",
    "Les membres et la stratégie du groupe restent inchangés. Le changement manuel dans Clash Party reste possible."
  ],
  "使用 AppRoute 独立代理组": [
    "Uses a dedicated AppRoute group",
    "AppRoute 専用グループを使用",
    "Utilise un groupe AppRoute dédié"
  ],
  "自动策略范围": [
    "Automatic strategy scope",
    "自動戦略の範囲",
    "Portée de la stratégie automatique"
  ],
  "保留 Clash Party 原有组。所有候选不可用时不会自动直连；旧连接可能继续使用原节点。这里只列出配置明确声明的远端节点；动态代理集合请沿用已有组。": [
    "Existing groups are preserved. No automatic direct fallback if all candidates fail. Old connections may keep their node. Only explicitly configured remote nodes are listed; use existing groups for dynamic providers.",
    "既存グループは維持します。全候補が使えなくても自動で直結しません。既存接続はノードを保持する場合があります。候補は明示的な遠隔ノードのみで、動的プロバイダーには既存グループを使ってください。",
    "Les groupes existants sont conservés. Aucun repli direct automatique si tous les candidats échouent. Les anciennes connexions peuvent garder leur nœud. Pour les fournisseurs dynamiques, utilisez un groupe existant."
  ],
  "已选节点 ·": [
    "Selected nodes · ",
    "選択ノード · ",
    "Nœuds sélectionnés · "
  ],
  "拖动调整优先级，也可使用上下按钮": [
    "Drag to reorder, or use the arrow buttons",
    "ドラッグまたは上下ボタンで並べ替え",
    "Glissez ou utilisez les flèches pour trier"
  ],
  "至少选择两个节点": [
    "Select at least two nodes",
    "ノードを 2 つ以上選択",
    "Sélectionnez au moins deux nœuds"
  ],
  "候选节点优先顺序": [
    "Candidate node priority",
    "候補ノードの優先順位",
    "Priorité des nœuds candidats"
  ],
  "从下方勾选候选节点": [
    "Select candidate nodes below",
    "下から候補ノードを選択",
    "Sélectionnez les nœuds ci-dessous"
  ],
  "拖动 {0} 排序": [
    "Drag {0} to reorder",
    "{0} をドラッグして並べ替え",
    "Glisser {0} pour trier"
  ],
  "已消失": [
    "Missing",
    "見つかりません",
    "Introuvable"
  ],
  "上移 {0}": [
    "Move {0} up",
    "{0} を上へ",
    "Monter {0}"
  ],
  "下移 {0}": [
    "Move {0} down",
    "{0} を下へ",
    "Descendre {0}"
  ],
  "搜索候选节点": [
    "Search candidate nodes",
    "候補ノードを検索",
    "Rechercher un nœud candidat"
  ],
  "最近探测失败": [
    "Last probe failed",
    "直近の測定に失敗",
    "Dernier test échoué"
  ],
  "暂无近期探测": [
    "No recent probe",
    "最近の測定なし",
    "Aucun test récent"
  ],
  "没有匹配的节点": [
    "No matching nodes",
    "該当ノードなし",
    "Aucun nœud correspondant"
  ],
  "没有可选节点，可沿用现有策略": [
    "No candidates; use an existing strategy",
    "候補がありません。既存の戦略を利用できます",
    "Aucun candidat ; utilisez une stratégie existante"
  ],
  "延迟仅代表该次探测，不等于下载速度。": [
    "Latency reflects one probe, not download speed.",
    "遅延はその測定時点の値で、ダウンロード速度ではありません。",
    "La latence reflète un test, pas le débit de téléchargement."
  ],
  "节点探测": [
    "Node probes",
    "ノードの測定",
    "Tests des nœuds"
  ],
  "自动策略由 Mihomo 执行，AppRoute 关闭后仍会运行。探测间隔不代表故障一定在该时间内恢复。": [
    "Mihomo runs automatic strategies even after AppRoute closes. The interval is not a guaranteed recovery time.",
    "自動戦略は Mihomo が実行し、AppRoute 終了後も動作します。間隔は復旧時間の保証ではありません。",
    "Mihomo exécute les stratégies même après la fermeture d’AppRoute. L’intervalle ne garantit pas le délai de rétablissement."
  ],
  "高级设置": [
    "Advanced settings",
    "詳細設定",
    "Paramètres avancés"
  ],
  "检查间隔": [
    "Check interval",
    "確認間隔",
    "Intervalle de vérification"
  ],
  "{0} 秒": [
    "{0} seconds",
    "{0} 秒",
    "{0} secondes"
  ],
  "探测超时": [
    "Probe timeout",
    "測定タイムアウト",
    "Délai d’expiration"
  ],
  "切换容差": [
    "Switch tolerance",
    "切り替え許容差",
    "Tolérance de bascule"
  ],
  "使用 HTTPS 204 测试地址。检查间隔不代表故障一定在此时间内恢复。": [
    "Uses an HTTPS 204 test endpoint. The interval is not a guaranteed recovery time.",
    "HTTPS 204 のテスト先を使用します。確認間隔は復旧時間を保証しません。",
    "Utilise une adresse de test HTTPS 204. L’intervalle ne garantit pas le délai de rétablissement."
  ],
  "部分候选节点已消失，请移除后重新选择。": [
    "Some candidates no longer exist. Remove them and select again.",
    "一部の候補がなくなりました。削除して選び直してください。",
    "Certains candidats n’existent plus. Retirez-les et refaites la sélection."
  ],
  "仍保留旧出口，请在代理策略中统一绑定。": [
    "The previous outbound is retained. Bind apps together in Proxy strategy.",
    "以前の出口を維持しています。プロキシ戦略で一括関連付けしてください。",
    "L’ancienne sortie est conservée. Réassociez les applications dans Stratégie proxy."
  ],
  "保留旧出口": [
    "Previous outbound",
    "以前の出口",
    "Ancienne sortie"
  ],
  "等待连接": [
    "Waiting for connection",
    "接続待ち",
    "En attente de connexion"
  ],
  "尚未选择代理组": [
    "No proxy group selected",
    "グループ未選択",
    "Aucun groupe sélectionné"
  ],
  "恢复到 AppRoute 接管前的规则？": [
    "Restore the rules from before AppRoute took over?",
    "AppRoute 管理前のルールに戻しますか？",
    "Rétablir les règles antérieures à AppRoute ?"
  ],
  "停用所有 AppRoute 专属分流和自动策略，应用重新沿用 Clash Party 原有规则。": [
    "Disable all AppRoute-specific routing and automatic strategies. Apps will use the original Clash Party rules again.",
    "AppRoute 専用ルールと自動戦略を無効にし、Clash Party の元のルールに戻します。",
    "Désactive toutes les règles et stratégies AppRoute. Les applications utiliseront à nouveau les règles originales de Clash Party."
  ],
  "保留原有订阅、代理组、系统代理和 TUN 设置。": [
    "Existing subscriptions, proxy groups, system proxy, and TUN settings are preserved.",
    "元のサブスクリプション、グループ、システムプロキシ、TUN 設定は維持します。",
    "Les abonnements, groupes, paramètres proxy système et TUN sont conservés."
  ],
  "恢复原有规则": [
    "Restore original rules",
    "元のルールに戻す",
    "Rétablir les règles d’origine"
  ],
  "代理与网络状态": [
    "Proxy and network status",
    "プロキシとネットワークの状態",
    "État du proxy et du réseau"
  ],
  "当前代理策略": [
    "Current proxy strategy",
    "現在のプロキシ戦略",
    "Stratégie proxy actuelle"
  ],
  "尚未设置代理组": [
    "Proxy group not configured",
    "グループ未設定",
    "Groupe non configuré"
  ],
  "。只影响选择“跟随代理组”的应用。": [
    ". Only affects apps set to Follow group.",
    "。「グループに従う」アプリにのみ適用します。",
    ". Concerne uniquement les applications suivant le groupe."
  ],
  "组当前选择与应用实际使用的节点分别显示。新连接跟随选择，旧连接不会强制断开。": [
    "Group selection and actual app connections are shown separately. New connections follow the selection; existing ones are not forcibly closed.",
    "グループの選択と実際の接続は別々に表示します。新しい接続は選択に従い、既存接続は強制切断しません。",
    "La sélection du groupe et les connexions réelles sont distinctes. Les nouvelles connexions suivent le choix ; les anciennes ne sont pas fermées de force."
  ],
  "当前节点：": [
    "Current node: ",
    "現在のノード：",
    "Nœud actuel : "
  ],
  "连接详情": [
    "Connection details",
    "接続詳細",
    "Détails de connexion"
  ],
  "恢复网络": [
    "Restore network",
    "ネットワークを復旧",
    "Restaurer le réseau"
  ],
  "连接中断，请检查 Clash Party": [
    "Connection lost. Check Clash Party.",
    "接続が切れました。Clash Party を確認してください。",
    "Connexion interrompue. Vérifiez Clash Party."
  ],
  "尚未连接 Clash Party": [
    "Not connected to Clash Party",
    "Clash Party に未接続",
    "Non connecté à Clash Party"
  ],
  "正在连接 Clash Party…": [
    "Connecting to Clash Party…",
    "Clash Party に接続中…",
    "Connexion à Clash Party…"
  ],
  "{0} 条历史规则仍在运行，管理记录缺失": [
    "{0} historical rules are active without management records",
    "管理記録のない過去のルールが {0} 件動作中です",
    "{0} anciennes règles actives sans enregistrements de gestion"
  ],
  "查看详情": [
    "View details",
    "詳細を見る",
    "Voir les détails"
  ],
  "Clash Party 当前不是规则模式，应用分流可能不按预期执行。": [
    "Clash Party is not in Rule mode. App routing may not work as expected.",
    "Clash Party がルールモードではありません。振り分けが意図どおり動かない可能性があります。",
    "Clash Party n’est pas en mode Règles. Le routage peut ne pas fonctionner comme prévu."
  ],
  "部分应用仍使用旧出口，请在代理策略中统一绑定。": [
    "Some apps still use old outbounds. Rebind them in Proxy strategy.",
    "以前の出口を使うアプリがあります。プロキシ戦略で再関連付けしてください。",
    "Certaines applications conservent leur ancienne sortie. Réassociez-les dans Stratégie proxy."
  ],
  "查看原因": [
    "View reason",
    "理由を見る",
    "Voir la raison"
  ],
  "已保存规则与当前运行状态不一致": [
    "Saved rules differ from the current runtime",
    "保存済みルールと動作中のルールが異なります",
    "Les règles enregistrées diffèrent des règles actives"
  ],
  "检查": [
    "Check",
    "確認",
    "Vérifier"
  ],
  "正在自动检查 · 失败将恢复上一版设置": [
    "Checking automatically · Failure restores previous settings",
    "自動確認中 · 失敗時は前の設定に戻します",
    "Vérification automatique · Retour aux réglages précédents en cas d’échec"
  ],
  "连接详情与恢复": [
    "Connection and recovery",
    "接続と復旧",
    "Connexion et restauration"
  ],
  "网络自检": [
    "Network check",
    "ネットワーク診断",
    "Diagnostic réseau"
  ],
  "连接状态来自内核控制接口；不代表所有节点都可用。": [
    "This status reflects the core control connection, not the health of every node.",
    "内核制御への接続状態であり、全ノードの正常性を示すものではありません。",
    "Cet état concerne l’interface de contrôle du moteur, pas la disponibilité de tous les nœuds."
  ],
  "内核版本": [
    "Core version",
    "内核バージョン",
    "Version du moteur"
  ],
  "未读取": [
    "Not read",
    "未取得",
    "Non lu"
  ],
  "最近探测": [
    "Last probe",
    "直近の測定",
    "Dernier test"
  ],
  "失败": [
    "Failed",
    "失敗",
    "Échec"
  ],
  "（记录已过期）": [
    " (outdated record)",
    "（古い記録）",
    " (mesure périmée)"
  ],
  "尚无近期记录，可运行网络自检": [
    "No recent record. Run a network check.",
    "最近の記録がありません。ネットワーク診断を実行できます。",
    "Aucune mesure récente. Lancez un diagnostic réseau."
  ],
  "规则与验证": [
    "Rules and verification",
    "ルールと検証",
    "Règles et vérification"
  ],
  "运行规则": [
    "Runtime rules",
    "動作中のルール",
    "Règles actives"
  ],
  "待连接后确认": [
    "Confirm after connecting",
    "接続後に確認",
    "À confirmer après connexion"
  ],
  " 条历史规则，缺少管理记录": [
    " historical rules without records",
    " 件の過去ルールに管理記録がありません",
    " anciennes règles sans enregistrements"
  ],
  "规则已加载 · ": [
    "Rules loaded · ",
    "ルール読込済み · ",
    "Règles chargées · "
  ],
  " 个应用": [
    " apps",
    " アプリ",
    " applications"
  ],
  "规则未确认加载": [
    "Rule loading not confirmed",
    "ルールの読み込み未確認",
    "Chargement des règles non confirmé"
  ],
  "无专属规则": [
    "No app-specific rules",
    "専用ルールなし",
    "Aucune règle spécifique"
  ],
  "重启后保留": [
    "Persistence after restart",
    "再起動後の保持",
    "Conservation après redémarrage"
  ],
  "记录缺失，无法确认": [
    "Missing records; cannot confirm",
    "記録がなく確認できません",
    "Enregistrements manquants ; impossible à confirmer"
  ],
  "无专属设置，无需验证": [
    "No app-specific settings to verify",
    "専用設定がないため検証不要",
    "Aucun réglage spécifique à vérifier"
  ],
  "已观察到客户端重新生成规则": [
    "Client-generated rules observed",
    "クライアントによるルール再生成を観測済み",
    "Régénération des règles par le client observée"
  ],
  "尚未验证": [
    "Not verified yet",
    "未検証",
    "Pas encore vérifié"
  ],
  "离线恢复": [
    "Offline recovery",
    "オフライン復旧",
    "Restauration hors ligne"
  ],
  "双击桌面的 AppRoute - Restore Network，无需联网即可恢复。": [
    "Double-click AppRoute - Restore Network on the desktop. No internet is required.",
    "デスクトップの AppRoute - Restore Network をダブルクリックしてください。ネット接続は不要です。",
    "Double-cliquez sur AppRoute - Restore Network sur le bureau. Aucune connexion Internet n’est nécessaire."
  ],
  "首次应用前会自动准备独立恢复工具。准备失败时不会修改规则。": [
    "The independent recovery tool is prepared before the first change. If preparation fails, no rules are modified.",
    "初回適用前に独立復旧ツールを準備します。準備失敗時はルールを変更しません。",
    "L’outil de restauration indépendant est préparé avant la première modification. En cas d’échec, aucune règle n’est modifiée."
  ],
  "上次恢复：": [
    "Last recovery: ",
    "前回の復旧：",
    "Dernière restauration : "
  ],
  "网络自检结果": [
    "Network check results",
    "ネットワーク診断結果",
    "Résultats du diagnostic"
  ],
  " 通过": [
    " passed",
    " 件成功",
    " réussis"
  ],
  "通过": [
    "Passed",
    "成功",
    "Réussi"
  ],
  "待处理": [
    "Needs action",
    "要対応",
    "À traiter"
  ],
  "点击底部“网络自检”开始检查": [
    "Click Network check below to begin",
    "下の「ネットワーク診断」で開始",
    "Cliquez sur « Diagnostic réseau » pour commencer"
  ],
  "扫描失败，请重试": [
    "Scan failed. Please retry.",
    "スキャンに失敗しました。再試行してください。",
    "Échec de l’analyse. Réessayez."
  ],
  "扫描本机应用": [
    "Scan local apps",
    "端末のアプリをスキャン",
    "Analyser les applications locales"
  ],
  "添加到草稿": [
    "Add to draft",
    "下書きに追加",
    "Ajouter au brouillon"
  ],
  "读取开始菜单、安装登记、可见进程与可读取的商店应用，同时缓存图标。未识别的软件可以手动添加。": [
    "Read Start menu entries, installed apps, visible processes and accessible Store apps, and cache their icons. You can add unidentified apps manually.",
    "スタートメニュー、インストール情報、可視プロセス、アクセス可能な Store アプリを読み取り、アイコンを保存します。未検出アプリは手動追加できます。",
    "Analyse le menu Démarrer, les installations, les processus visibles et les applications Store accessibles, puis met les icônes en cache. L’ajout manuel reste possible."
  ],
  "搜索扫描结果": [
    "Search scan results",
    "スキャン結果を検索",
    "Rechercher dans les résultats"
  ],
  "重新扫描": [
    "Scan again",
    "再スキャン",
    "Analyser à nouveau"
  ],
  "正在读取本机应用…": [
    "Reading local apps…",
    "端末のアプリを取得中…",
    "Lecture des applications locales…"
  ],
  "选择当前结果": [
    "Select current results",
    "現在の結果を選択",
    "Sélectionner les résultats actuels"
  ],
  "添加 {0}": [
    "Add {0}",
    "{0} を追加",
    "Ajouter {0}"
  ],
  "没有找到应用，可使用手动添加": [
    "No apps found. Try adding one manually.",
    "アプリが見つかりません。手動で追加できます。",
    "Aucune application trouvée. Essayez l’ajout manuel."
  ],
  "查看 AppRoute 已保存的专属设置。": [
    "Review the app-specific settings saved by AppRoute.",
    "AppRoute が保存した専用設定を確認します。",
    "Consultez les réglages spécifiques enregistrés par AppRoute."
  ],
  "导出记录": [
    "Export records",
    "記録をエクスポート",
    "Exporter les enregistrements"
  ],
  "存在历史运行规则，当前列表缺少对应管理记录": [
    "Historical rules are active without corresponding management records",
    "動作中の過去ルールに対応する管理記録がありません",
    "Des anciennes règles sont actives sans enregistrements correspondants"
  ],
  "请在应用管理的连接详情中核对。记录恢复前暂不可导出。": [
    "Review Connection details in Applications. Export is unavailable until records are recovered.",
    "アプリ管理の接続詳細で確認してください。記録が復元されるまでエクスポートできません。",
    "Vérifiez les détails de connexion dans Applications. L’export est indisponible tant que les enregistrements ne sont pas restaurés."
  ],
  "有管理记录": [
    " have management records",
    " は管理記録あり",
    " avec enregistrements"
  ],
  "已设分流": [
    " configured",
    " 設定済み",
    " configurées"
  ],
  "直接联网": [
    "Direct",
    "直接接続",
    "Direct"
  ],
  "跟随代理组": [
    "Follow group",
    "グループに従う",
    "Suivre le groupe"
  ],
  "这里只列出 AppRoute 管理的专属规则；未设置的应用继续沿用 Clash Party 原有规则。": [
    "Only AppRoute-managed rules are listed. Unconfigured apps keep the original Clash Party rules.",
    "AppRoute 管理の専用ルールのみ表示します。未設定アプリは元の Clash Party ルールを使います。",
    "Seules les règles gérées par AppRoute sont listées. Les autres applications conservent les règles originales de Clash Party."
  ],
  "导出的是设置记录，不能直接作为 Clash 配置导入，也不是实际连接已验证的证明。": [
    "The export is a settings record, not an importable Clash configuration or proof of verified connections.",
    "エクスポートは設定の記録です。Clash に直接取り込む設定でも、接続の検証証明でもありません。",
    "L’export est un relevé de paramètres, ni une configuration Clash importable ni une preuve de connexion vérifiée."
  ],
  "管理记录缺失，请先核对历史规则": [
    "Management records missing. Review historical rules first.",
    "管理記録がありません。先に過去のルールを確認してください。",
    "Enregistrements manquants. Vérifiez d’abord les anciennes règles."
  ],
  "暂无专属规则，可在应用管理中设置": [
    "No app-specific rules yet. Configure them in Applications.",
    "専用ルールはまだありません。アプリ管理で設定できます。",
    "Aucune règle spécifique. Configurez-les dans Applications."
  ],
  "个进程": [
    " processes",
    " プロセス",
    " processus"
  ],
  "预期出口": [
    "Expected outbound",
    "予定の出口",
    "Sortie prévue"
  ],
  "显示规则指向的出口，以及代理组当前选择。已有连接可能继续使用旧节点；实际连接证据请打开应用详情查看。": [
    "Shows the rule target and current group selection. Existing connections may keep old nodes; open App details for observed connections.",
    "ルールの出口と現在のグループ選択を表示します。既存接続は以前のノードを使う場合があります。観測結果はアプリ詳細で確認してください。",
    "Affiche la cible et la sélection du groupe. Les connexions existantes peuvent garder leur ancien nœud ; consultez les détails pour les connexions observées."
  ],
  "本地直连": [
    "Local direct connection",
    "ローカル直接接続",
    "Connexion locale directe"
  ],
  "详情": [
    "Details",
    "詳細",
    "Détails"
  ],
  "保持原样，让 Clash Party 的原有规则决定每条连接的出口。": [
    "Keep the existing Clash Party rules to decide each connection’s outbound.",
    "Clash Party の従来のルールで、接続ごとに出口を決めます。",
    "Laissez les règles existantes de Clash Party choisir la sortie de chaque connexion."
  ],
  "适合：不需要单独设置的应用": [
    "For apps that need no special routing",
    "個別設定が不要なアプリ向け",
    "Pour les applications sans besoin particulier"
  ],
  "识别并进入 Clash 的新连接使用本地网络，不经远端代理节点。": [
    "Identified new connections entering Clash use the local network without a remote proxy node.",
    "識別され Clash に入った新しい接続は、遠隔プロキシを経由せず直接接続します。",
    "Les nouvelles connexions identifiées et prises en charge par Clash utilisent le réseau local sans nœud proxy distant."
  ],
  "例如：QQ 音乐、国内网盘": [
    "For example: QQ Music or local cloud storage",
    "例：QQ Music、国内向けクラウドストレージ",
    "Exemples : QQ Music ou stockage cloud local"
  ],
  "新连接交给已绑定的代理组，自动跟随组内选择。": [
    "New connections go to the bound group and follow its selection.",
    "新しい接続を関連付けたグループに送り、その選択に従います。",
    "Les nouvelles connexions sont envoyées au groupe associé et suivent sa sélection."
  ],
  "节点选择方式在“代理策略”中设置": [
    "Choose node selection behavior in Proxy strategy",
    "ノードの選び方は「プロキシ戦略」で設定",
    "Définissez la sélection des nœuds dans Stratégie proxy"
  ],
  "“我的应用”为什么有这些软件？": [
    "Why are these apps in My apps?",
    "なぜマイアプリに表示されるのですか？",
    "Pourquoi ces applications figurent-elles dans Mes applications ?"
  ],
  "你收藏的应用，以及已设置“直接联网”或“跟随代理组”的应用，会显示在这里。它不是使用频率排行。取消收藏且改回“按 Clash 规则”后，该应用只留在全部应用中。": [
    "Favorites and apps set to Direct or Follow group appear here. This is not a usage ranking. Remove the favorite and choose Clash rules to leave it only in All apps.",
    "お気に入りと「直接接続」「グループに従う」のアプリを表示します。使用頻度順ではありません。お気に入りを解除して Clash ルールに戻すと「すべて」にだけ残ります。",
    "Les favoris et les applications en Direct ou suivant un groupe apparaissent ici. Ce n’est pas un classement d’utilisation. Retirez le favori et choisissez Règles Clash pour ne le garder que dans Toutes."
  ],
  "怎么查找新装的软件？": [
    "How do I find newly installed apps?",
    "新しく入れたアプリを見つけるには？",
    "Comment trouver une nouvelle application ?"
  ],
  "搜索框始终查找全部应用，支持应用名称、进程名和路径，不区分大小写与空格。新安装的应用会自动发现；还没出现时点击“扫描应用”，便携软件可通过“添加应用”选择程序文件。分类、联网方式与收藏筛选仍会生效，可点击“清除筛选”。": [
    "Search covers all apps by name, process or path, ignoring case and spaces. New installations are discovered automatically; use Scan apps if needed. Add portable apps by choosing their executable. Category, connection and favorite filters still apply; clear them if necessary.",
    "検索は全アプリの名前・プロセス・パスを対象にし、大文字小文字と空白を区別しません。新規アプリは自動検出され、必要ならスキャンできます。ポータブル版はファイルを選んで追加できます。カテゴリ等の絞り込みは引き続き有効です。",
    "Recherchez par nom, processus ou chemin, sans distinction de casse ni d’espaces. Les nouvelles installations sont détectées automatiquement ; utilisez l’analyse si nécessaire. Ajoutez les logiciels portables via leur exécutable. Les autres filtres restent actifs."
  ],
  "蓝色、绿色和黄色状态有什么区别？": [
    "What do blue, green and yellow statuses mean?",
    "青・緑・黄の状態は何を意味しますか？",
    "Que signifient les états bleu, vert et jaune ?"
  ],
  "规则已加载": [
    "Rules loaded",
    "ルール読込済み",
    "Règles chargées"
  ],
  "设置已写入内核，等待观察新连接。": [
    "Settings are loaded in the core; waiting to observe new connections.",
    "内核に設定が読み込まれ、新しい接続の観測を待っています。",
    "Les réglages sont chargés dans le moteur ; en attente de nouvelles connexions."
  ],
  "已验证新连接": [
    "New connections verified",
    "新規接続を検証済み",
    "Nouvelles connexions vérifiées"
  ],
  "已经观察到符合设置的连接，不代表所有进程与所有流量均已验证。": [
    "Matching connections were observed. This does not verify every process or all traffic.",
    "設定に一致する接続を観測しました。全プロセス・全通信の検証を意味しません。",
    "Des connexions conformes ont été observées. Cela ne valide pas tous les processus ni tout le trafic."
  ],
  "需要检查": [
    "Needs checking",
    "要確認",
    "À vérifier"
  ],
  "如节点不可用、辅助进程待补充等。": [
    "For example, unavailable nodes or helper processes awaiting rules.",
    "ノードが利用不可、補助プロセスのルールが未追加、などです。",
    "Par exemple, un nœud indisponible ou des processus auxiliaires en attente de règles."
  ],
  "异常": [
    "Error",
    "異常",
    "Erreur"
  ],
  "规则不一致或应用失败。点击状态查看原因。": [
    "Rules differ or an operation failed. Click the status for details.",
    "ルールの不一致または適用失敗です。状態をクリックして理由を確認してください。",
    "Règles incohérentes ou échec d’application. Cliquez sur l’état pour connaître la raison."
  ],
  "代理策略怎么选？切换后多久生效？": [
    "Which strategy should I choose, and when does it apply?",
    "戦略の違いと反映のタイミングは？",
    "Quelle stratégie choisir et quand prend-elle effet ?"
  ],
  "沿用现有策略：继续跟随 Clash Party 的已有组。故障备用：按你排列的优先顺序使用可用节点。延迟优先：由 Mihomo 根据探测延迟选择候选节点。": [
    "Existing strategy follows a Clash Party group. Failover uses available nodes in your priority order. Lowest latency lets Mihomo choose among candidates using probe results.",
    "既存の戦略は Clash Party のグループに従います。障害時の予備は優先順位順に利用可能なノードを使います。低遅延優先は測定結果をもとに Mihomo が選びます。",
    "La stratégie existante suit un groupe Clash Party. Le secours utilise les nœuds par priorité. La latence minimale laisse Mihomo choisir selon les mesures."
  ],
  "后两种创建 AppRoute 专用组，不改原有组。所有候选不可用时不会自动直连。延迟不等于下载速度；已有连接可能保留原节点，后续新连接才跟随新选择。": [
    "The last two create a dedicated AppRoute group without changing existing groups. They do not fall back to direct when all candidates fail. Latency is not download speed; existing connections may keep their old node. New choices affect new connections.",
    "後の 2 種類は専用グループを作り、既存グループを変えません。全候補が使えなくても直接接続には戻しません。遅延は速度ではなく、既存接続は以前のノードを保持する場合があります。新しい選択は新規接続に反映されます。",
    "Les deux dernières créent un groupe dédié sans modifier les groupes existants, sans repli direct si tous les candidats échouent. La latence n’est pas le débit. Les changements concernent les nouvelles connexions ; les anciennes peuvent garder leur nœud."
  ],
  "与 Clash Party 的规则模式有什么关系？": [
    "How does this relate to Clash Party’s Rule mode?",
    "Clash Party のルールモードとの関係は？",
    "Quel rapport avec le mode Règles de Clash Party ?"
  ],
  "Clash Party 继续保持规则模式。AppRoute 只为指定应用增加优先规则，不会把整台电脑改成全局代理。": [
    "Clash Party stays in Rule mode. AppRoute adds priority rules only for selected apps, not a global proxy for the entire device.",
    "Clash Party はルールモードを維持します。指定アプリに優先ルールを加えるだけで、端末全体をグローバルプロキシにしません。",
    "Clash Party reste en mode Règles. AppRoute ajoute des règles prioritaires aux applications choisies, sans basculer tout l’appareil en proxy global."
  ],
  "未进入 Clash 或未识别的进程无法保证符合设置；代理组若选择 DIRECT / REJECT，会按真实选择直连或拒绝。": [
    "Traffic outside Clash or from unidentified processes is not guaranteed to follow these settings. Groups choosing DIRECT or REJECT will connect directly or reject accordingly.",
    "Clash を通らない通信や未識別プロセスへの適用は保証できません。グループが DIRECT／REJECT を選ぶと、直接接続／拒否になります。",
    "Le trafic hors Clash ou non identifié n’est pas garanti. Un groupe sélectionnant DIRECT ou REJECT connecte directement ou refuse la connexion."
  ],
  "如果断网，怎么恢复？": [
    "How do I recover if the network stops working?",
    "ネット接続が失われた場合の復旧方法は？",
    "Comment restaurer le réseau en cas de panne ?"
  ],
  "页面可用时点击“恢复网络”，停用 AppRoute 专属规则，保留原有订阅、代理组及系统网络设置。": [
    "Click Restore network to disable AppRoute rules while keeping your original subscriptions, groups and system network settings.",
    "「ネットワークを復旧」で AppRoute のルールを無効にします。元のサブスクリプション・グループ・システム設定は維持します。",
    "Cliquez sur Restaurer le réseau pour désactiver les règles AppRoute tout en conservant les abonnements, groupes et paramètres système."
  ],
  "页面打不开时，双击桌面的 AppRoute - Restore Network，无需网络或 ChatGPT。应用失败会自动回退，意外中断由独立守护兜底。": [
    "If the app cannot open, double-click AppRoute - Restore Network on the desktop. It needs no internet or ChatGPT. Failed changes roll back automatically; an independent watchdog protects interrupted changes.",
    "アプリを開けない場合はデスクトップの AppRoute - Restore Network を起動します。ネットや ChatGPT は不要です。適用失敗時は自動で戻し、中断時は独立監視プロセスが保護します。",
    "Si l’application ne s’ouvre plus, lancez AppRoute - Restore Network depuis le bureau, sans Internet ni ChatGPT. Les échecs déclenchent un retour automatique ; un processus indépendant protège les modifications interrompues."
  ],
  "当前仍为预览版；客户端重启、订阅切换的持久化验收状态见“连接详情”。": [
    "This is still a preview. See Connection details for persistence verification after client restarts or subscription changes.",
    "プレビュー版です。再起動・サブスクリプション変更後の保持の検証状況は接続詳細で確認してください。",
    "Ceci reste une version d’aperçu. Consultez les détails pour la vérification après redémarrage ou changement d’abonnement."
  ],
  "选应用、选联网方式，再看状态。": [
    "Choose an app, choose a connection, then check its status.",
    "アプリと接続方法を選び、状態を確認します。",
    "Choisissez une application, sa connexion, puis vérifiez son état."
  ],
  "找到或收藏应用": [
    "Find or favorite an app",
    "アプリを探す・お気に入りに追加",
    "Trouvez une application ou ajoutez un favori"
  ],
  "点击联网方式": [
    "Choose a connection method",
    "接続方法を選択",
    "Choisissez une connexion"
  ],
  "查看加载与连接状态": [
    "Check rules and connections",
    "ルールと接続を確認",
    "Vérifiez les règles et connexions"
  ],
  "常见问题": [
    "Frequently asked questions",
    "よくある質問",
    "Questions fréquentes"
  ],
  "音乐娱乐": [
    "Music & entertainment",
    "音楽・エンタメ",
    "Musique et divertissement"
  ],
  "社交通讯": [
    "Communication",
    "コミュニケーション",
    "Communication"
  ],
  "浏览器": [
    "Browsers",
    "ブラウザー",
    "Navigateurs"
  ],
  "开发工具": [
    "Developer tools",
    "開発ツール",
    "Outils de développement"
  ],
  "游戏平台": [
    "Gaming",
    "ゲーム",
    "Jeux"
  ],
  "无法建立图标管理会话，请刷新页面。": [
    "Could not create the icon session. Refresh the page.",
    "アイコン管理セッションを作成できません。再読み込みしてください。",
    "Impossible de créer la session des icônes. Rechargez la page."
  ],
  "图标操作失败": [
    "Icon operation failed",
    "アイコン操作に失敗",
    "Échec de l’opération sur l’icône"
  ],
  "图标读取失败": [
    "Could not read icons",
    "アイコンを読み取れません",
    "Impossible de lire les icônes"
  ],
  "图标登记失败": [
    "Could not register icons",
    "アイコンを登録できません",
    "Impossible d’enregistrer les icônes"
  ],
  "本机应用资料无法读取，已保留原文件；本次收藏暂时不能保存。": [
    "Could not read local app records. The original file is preserved; favorites cannot be saved for now.",
    "端末のアプリ情報を読み取れません。元のファイルは保持しています。今はお気に入りを保存できません。",
    "Impossible de lire les données locales. Le fichier original est conservé ; les favoris ne peuvent pas être enregistrés pour le moment."
  ],
  "读取本机应用失败": [
    "Could not read local apps",
    "端末のアプリを読み取れません",
    "Impossible de lire les applications locales"
  ],
  "读取本机应用失败，已保留缓存列表": [
    "Could not read local apps. The cached list is preserved.",
    "端末のアプリを読み取れません。キャッシュ済み一覧を保持しています。",
    "Lecture impossible. La liste en cache est conservée."
  ],
  "暂时无法读取运行中的应用，请稍后重试。": [
    "Running apps are temporarily unavailable. Try again later.",
    "実行中のアプリを取得できません。後でもう一度お試しください。",
    "La liste des applications en cours est indisponible. Réessayez plus tard."
  ],
  "连接失败": [
    "Connection failed",
    "接続失敗",
    "Échec de connexion"
  ],
  "尚未连接或上一轮操作未确认，请检查恢复状态后重试。": [
    "Not connected or the previous operation is unconfirmed. Check recovery status and retry.",
    "未接続または前の操作が未確定です。復旧状態を確認して再試行してください。",
    "Non connecté ou opération précédente non confirmée. Vérifiez la restauration puis réessayez."
  ],
  "请等待当前应用操作结束。": [
    "Wait for the current operation to finish.",
    "現在の処理が終わるまでお待ちください。",
    "Attendez la fin de l’opération en cours."
  ],
  "尚未连接或上一轮操作未确认，请检查恢复状态。": [
    "Not connected or the previous operation is unconfirmed. Check recovery status.",
    "未接続または前の操作が未確定です。復旧状態を確認してください。",
    "Non connecté ou opération précédente non confirmée. Vérifiez la restauration."
  ],
  "设置已经变化，请关闭后重新打开代理策略。": [
    "Settings have changed. Close and reopen Proxy strategy.",
    "設定が変わりました。プロキシ戦略を開き直してください。",
    "Les paramètres ont changé. Fermez puis rouvrez Stratégie proxy."
  ],
  "已管理应用": [
    "Managed apps",
    "管理中のアプリ",
    "Applications gérées"
  ],
  "办公效率": [
    "Productivity",
    "仕事効率化",
    "Productivité"
  ],
  "按 Clash 规则": [
    "Clash rules",
    "Clash ルール",
    "Règles Clash"
  ],
  "继续由 Clash Party 的原有规则决定出口。": [
    "Let the original Clash Party rules choose the outbound.",
    "Clash Party の元のルールに出口を任せます。",
    "Laissez les règles originales de Clash Party choisir la sortie."
  ],
  "进入 Clash 的新连接不经远端代理节点。": [
    "New connections entering Clash bypass remote proxy nodes.",
    "Clash に入る新しい接続は遠隔プロキシを経由しません。",
    "Les nouvelles connexions dans Clash évitent les nœuds proxy distants."
  ],
  "新连接跟随顶部代理策略，已有连接保持原状。": [
    "New connections follow the strategy above. Existing connections are unchanged.",
    "新規接続は上部の戦略に従い、既存接続は維持します。",
    "Les nouvelles connexions suivent la stratégie ci-dessus. Les anciennes restent inchangées."
  ],
  "沿用 Clash Party 当前配置与订阅规则，每条连接按域名、IP 等条件决定直连或使用哪个代理。AppRoute 不为该应用增加专属规则。": [
    "Clash Party uses its existing configuration and subscription rules to route each connection by domain, IP and other conditions. AppRoute adds no app-specific rule.",
    "Clash Party の設定とサブスクリプションのルールが、ドメインや IP などで接続ごとの出口を決めます。AppRoute の専用ルールは追加しません。",
    "Clash Party utilise sa configuration et ses abonnements pour choisir la sortie selon le domaine, l’IP et les autres critères. AppRoute n’ajoute aucune règle spécifique."
  ],
  "该应用被识别并进入 Clash 的新连接优先使用 DIRECT，不经过远端代理节点；仍可能经过本机 Clash 内核，不会关闭其他 VPN 或修改系统网络。": [
    "Identified new connections entering Clash use DIRECT without a remote proxy node. They may still pass through the local core. Other VPNs and system network settings are unchanged.",
    "識別され Clash に入った新規接続は DIRECT を使い、遠隔ノードを経由しません。ローカル内核は経由する場合があります。他の VPN やシステム設定は変えません。",
    "Les nouvelles connexions identifiées dans Clash utilisent DIRECT, sans nœud distant. Elles peuvent passer par le moteur local. Les autres VPN et paramètres système restent inchangés."
  ],
  "该应用被识别并进入 Clash 的新连接交给已保存的代理策略：沿用已有组，或由 Mihomo 执行故障备用、延迟优先。沿用的组选择 DIRECT 时也会直连。已有连接可能继续使用原节点。": [
    "Identified new connections entering Clash use the saved strategy: an existing group, failover or lowest latency managed by Mihomo. A group selecting DIRECT connects directly. Existing connections may keep their previous node.",
    "識別され Clash に入った新規接続は保存済み戦略に従います。既存グループ、または Mihomo の障害時予備・低遅延優先です。DIRECT を選ぶグループは直接接続になり、既存接続は以前のノードを維持する場合があります。",
    "Les nouvelles connexions identifiées suivent la stratégie enregistrée : groupe existant, secours ou latence minimale gérés par Mihomo. DIRECT reste une connexion directe. Les connexions existantes peuvent garder leur ancien nœud."
  ],
  "尚未确认": [
    "Not confirmed",
    "未確認",
    "Non confirmé"
  ],
  "等待连接 Clash Party，未修改联网方式。": [
    "Waiting for Clash Party. Routing has not been changed.",
    "Clash Party への接続待ちです。接続方法は変更していません。",
    "En attente de Clash Party. Le routage n’a pas été modifié."
  ],
  "状态待核对": [
    "Review required",
    "状態の確認が必要",
    "Vérification nécessaire"
  ],
  "内核存在历史 AppRoute 规则，但缺少管理记录，无法确认该应用的当前分流。请查看连接详情。": [
    "The core has historical AppRoute rules without management records. This app’s routing cannot be confirmed. See Connection details.",
    "管理記録のない AppRoute ルールが内核に存在します。現在の振り分けは確認できません。接続詳細をご覧ください。",
    "Le moteur contient d’anciennes règles AppRoute sans enregistrements. Le routage ne peut pas être confirmé. Consultez les détails de connexion."
  ],
  "沿用原有规则": [
    "Using existing rules",
    "元のルールを使用",
    "Règles existantes"
  ],
  "没有 AppRoute 专属规则。": [
    "No AppRoute-specific rules.",
    "AppRoute 専用ルールはありません。",
    "Aucune règle propre à AppRoute."
  ],
  "规则异常": [
    "Rule mismatch",
    "ルール異常",
    "Règles incohérentes"
  ],
  "运行规则与保存的设置不一致，请检查或恢复。": [
    "Runtime rules differ from saved settings. Check or restore.",
    "動作中のルールと保存設定が異なります。確認または復旧してください。",
    "Les règles actives diffèrent des paramètres enregistrés. Vérifiez ou restaurez."
  ],
  "自动检查中": [
    "Checking automatically",
    "自動確認中",
    "Vérification automatique"
  ],
  "独立恢复守护已启动，检查失败会自动恢复。": [
    "The independent recovery watchdog is active. Failed checks trigger automatic rollback.",
    "独立復旧監視が動作中です。確認に失敗すると自動で戻します。",
    "La surveillance de restauration indépendante est active. Un échec déclenche un retour automatique."
  ],
  "发现新的辅助进程": [
    "New helper processes found",
    "新しい補助プロセスを検出",
    "Nouveaux processus auxiliaires"
  ],
  "正在核对进程归属并补充规则；未识别的流量暂时沿用原有规则。": [
    "Checking process ownership and adding rules. Unidentified traffic keeps existing rules for now.",
    "プロセスの帰属を確認しルールを追加中です。未識別の通信は当面元のルールに従います。",
    "Vérification des processus et ajout des règles. Le trafic non identifié conserve provisoirement les règles existantes."
  ],
  "代理组当前直连": [
    "Group currently direct",
    "グループは現在直接接続",
    "Groupe en connexion directe"
  ],
  "跟随组当前选择了 DIRECT，并未经过远端代理节点。": [
    "The group currently selects DIRECT, with no remote proxy node.",
    "グループは現在 DIRECT を選択し、遠隔プロキシを経由していません。",
    "Le groupe sélectionne DIRECT, sans nœud proxy distant."
  ],
  "代理组待检查": [
    "Check proxy group",
    "グループ要確認",
    "Groupe à vérifier"
  ],
  "当前出口不可用或尚未确认，请检查 Clash Party 的组内选择或网络自检。": [
    "The outbound is unavailable or unconfirmed. Check the Clash Party group or run diagnostics.",
    "出口が使えないか未確認です。Clash Party の選択先かネットワーク診断を確認してください。",
    "La sortie est indisponible ou non confirmée. Vérifiez le groupe Clash Party ou lancez un diagnostic."
  ],
  "连接不符合设置": [
    "Connection mismatch",
    "接続が設定と不一致",
    "Connexion non conforme"
  ],
  "已观察到不符合当前规则的新连接，请检查或恢复。": [
    "A new connection did not match the current rules. Check or restore.",
    "現在のルールに一致しない新しい接続を観測しました。確認または復旧してください。",
    "Une nouvelle connexion ne correspond pas aux règles. Vérifiez ou restaurez."
  ],
  "等待新节点连接": [
    "Waiting for new-node connections",
    "新ノードでの接続待ち",
    "En attente du nouveau nœud"
  ],
  "当前观察到的连接仍用其他节点；已有连接不会强制断开，新建连接交给组当前选择。": [
    "Observed connections still use another node. Existing connections are not forcibly closed; new ones follow the current group selection.",
    "観測中の接続は別のノードを使用しています。強制切断はせず、新規接続が現在のグループ選択に従います。",
    "Les connexions observées utilisent encore un autre nœud. Elles ne sont pas fermées de force ; les nouvelles suivent la sélection actuelle."
  ],
  "已验证 {0} 的 {1} 条新连接；其余进程仍待观测。": [
    "Verified {1} new connections from {0}; other processes still await observation.",
    "{0} の新規接続 {1} 件を検証しました。他のプロセスは観測待ちです。",
    "{1} nouvelles connexions de {0} vérifiées ; les autres processus restent à observer."
  ],
  "规则已写入并在内核加载。等待应用建立新连接后再验证实际出口；现有连接不会自动切换。": [
    "Rules are written and loaded in the core. Wait for new app connections to verify the outbound; existing connections do not switch automatically.",
    "内核へのルールの書き込みと読み込みが完了しました。新規接続で出口を検証します。既存接続は自動切り替えされません。",
    "Règles écrites et chargées. Attendez de nouvelles connexions pour vérifier la sortie ; les anciennes ne basculent pas automatiquement."
  ],
  "一次最多管理 100 个应用。": [
    "Manage at most 100 apps at a time.",
    "一度に管理できるのは 100 アプリまでです。",
    "Gérez au maximum 100 applications à la fois."
  ],
  "请先扫描或手动添加真实应用；示例应用不能直接应用到网络。": [
    "Scan or add real apps first. Example apps cannot change network routing.",
    "実在するアプリをスキャンまたは追加してください。サンプルはネットワークに適用できません。",
    "Analysez ou ajoutez des applications réelles. Les exemples ne peuvent pas modifier le routage."
  ],
  "进程名无效。": [
    "Invalid process name.",
    "プロセス名が無効です。",
    "Nom de processus invalide."
  ],
  "为保留修复通道，AppRoute 不改写自身、ChatGPT/Codex、代理内核和恢复工具的分流。": [
    "To preserve recovery access, AppRoute does not reroute itself, ChatGPT/Codex, proxy cores or recovery tools.",
    "修復経路を保つため、AppRoute 自身・ChatGPT/Codex・プロキシ内核・復旧ツールの振り分けは変更しません。",
    "Pour préserver l’accès à la réparation, AppRoute ne modifie pas son propre routage, celui de ChatGPT/Codex, des moteurs proxy ni des outils de restauration."
  ],
  "同一进程不能同时属于多个应用。": [
    "A process cannot belong to multiple apps.",
    "同じプロセスを複数のアプリに登録できません。",
    "Un processus ne peut pas appartenir à plusieurs applications."
  ],
  "进程路径无效。": [
    "Invalid process path.",
    "プロセスのパスが無効です。",
    "Chemin de processus invalide."
  ],
  "进程路径无效或属于受保护程序。": [
    "Invalid path or protected executable.",
    "無効なパス、または保護対象のプログラムです。",
    "Chemin invalide ou exécutable protégé."
  ],
  "请选择有效的代理出口。": [
    "Choose a valid proxy outbound.",
    "有効なプロキシ出口を選択してください。",
    "Choisissez une sortie proxy valide."
  ],
  "这些进程已在其他已生效应用中，请先恢复对应应用。": [
    "These processes already belong to other configured apps. Restore those apps first.",
    "他の設定済みアプリに所属するプロセスです。先に対応アプリの設定を戻してください。",
    "Ces processus appartiennent à d’autres applications configurées. Restaurez-les d’abord."
  ],
  "AppRoute 规则标记与配置不一致，已停止覆盖。请使用离线恢复工具查看诊断。": [
    "AppRoute rule markers do not match the configuration. Overwrite stopped. Use offline recovery diagnostics.",
    "ルールの所有マークと設定が一致しません。上書きを停止しました。オフライン復旧で診断してください。",
    "Les marqueurs AppRoute ne correspondent pas à la configuration. Écriture arrêtée. Utilisez le diagnostic de restauration hors ligne."
  ],
  "无法确认主程序路径，请重新扫描或填写完整 exe 路径。": [
    "Cannot confirm the executable path. Scan again or enter the full exe path.",
    "主プログラムのパスを確認できません。再スキャンか exe のフルパスを入力してください。",
    "Chemin de l’exécutable non confirmé. Relancez l’analyse ou saisissez le chemin complet."
  ],
  "发现目录外的辅助进程，未自动接管共享程序。": [
    "Helper processes outside the app directory were found. Shared programs were not automatically included.",
    "アプリのディレクトリ外に補助プロセスを検出しました。共有プログラムは自動で含めません。",
    "Des processus auxiliaires externes au dossier ont été trouvés. Les programmes partagés ne sont pas inclus automatiquement."
  ],
  "辅助进程数量异常，未修改规则。": [
    "Unexpected number of helper processes. Rules unchanged.",
    "補助プロセス数が異常です。ルールは変更していません。",
    "Nombre inattendu de processus auxiliaires. Règles inchangées."
  ],
  "按父子关系识别运行中的辅助进程；页面开启时检测进入 Clash 的新辅助进程，失败后可手动重新识别。": [
    "Running helpers are identified by parent-child relationships. New helpers entering Clash are monitored while the page is open; identification can be retried manually.",
    "親子関係で実行中の補助プロセスを識別します。画面表示中は Clash に入る新しい補助プロセスを監視し、失敗時は手動で再識別できます。",
    "Les auxiliaires sont identifiés par leurs relations parent-enfant. Les nouveaux processus entrant dans Clash sont surveillés pendant l’ouverture de la page ; une nouvelle identification manuelle reste possible."
  ],
  "未连接，当前节点未知": [
    "Disconnected; current node unknown",
    "未接続・現在のノード不明",
    "Déconnecté ; nœud actuel inconnu"
  ],
  "代理组或成员已消失，请重新绑定": [
    "Group or member missing. Bind a group again.",
    "グループまたはメンバーがありません。再関連付けしてください。",
    "Groupe ou membre introuvable. Réassociez un groupe."
  ],
  "按连接分配，实际节点见连接记录": [
    "Selected per connection; see connection records",
    "接続ごとに選択。接続記録を確認してください",
    "Sélection par connexion ; consultez les enregistrements"
  ],
  "无法确认当前节点": [
    "Current node cannot be confirmed",
    "現在のノードを確認できません",
    "Nœud actuel non confirmé"
  ],
  "{0} · 当前直连": [
    "{0} · Direct now",
    "{0} · 現在は直接接続",
    "{0} · Direct actuellement"
  ],
  "{0} · 当前拒绝连接": [
    "{0} · Rejecting connections",
    "{0} · 現在は接続拒否",
    "{0} · Connexions refusées"
  ],
  " · 最近探测失败": [
    " · Last probe failed",
    " · 直近の測定失敗",
    " · Dernier test échoué"
  ],
  "AppRoute · 自动代理": [
    "AppRoute · Automatic proxy",
    "AppRoute · 自動プロキシ",
    "AppRoute · Proxy automatique"
  ],
  "请选择有效的代理策略。": [
    "Choose a valid proxy strategy.",
    "有効なプロキシ戦略を選択してください。",
    "Choisissez une stratégie proxy valide."
  ],
  "请选择 Clash Party 已有的代理组。": [
    "Choose an existing Clash Party group.",
    "Clash Party の既存グループを選択してください。",
    "Choisissez un groupe Clash Party existant."
  ],
  "请选择 2 至 32 个不同的候选节点。": [
    "Choose 2 to 32 distinct candidate nodes.",
    "異なる候補ノードを 2～32 個選択してください。",
    "Choisissez de 2 à 32 nœuds distincts."
  ],
  "健康检查参数无效，请重新选择。": [
    "Invalid health-check settings. Select them again.",
    "ヘルスチェック設定が無効です。選び直してください。",
    "Paramètres de vérification invalides. Sélectionnez-les à nouveau."
  ],
  "代理组配置格式无效。": [
    "Invalid proxy group configuration format.",
    "グループ設定の形式が無効です。",
    "Format de configuration du groupe invalide."
  ],
  "代理策略所有权标记冲突，已保留配置，请先检查外部修改。": [
    "Strategy ownership conflict. Configuration preserved; review external changes.",
    "戦略の所有マークが競合しています。設定を保持しました。外部変更を確認してください。",
    "Conflit de propriété de la stratégie. Configuration conservée ; vérifiez les modifications externes."
  ],
  "原有配置正在引用 AppRoute 专用组，已停止替换或删除，请先解除该引用。": [
    "Existing configuration references the AppRoute group. Replacement or removal stopped. Remove that reference first.",
    "既存設定が AppRoute グループを参照しているため、置換・削除を停止しました。先に参照を解除してください。",
    "La configuration existante référence le groupe AppRoute. Remplacement ou suppression arrêtés. Retirez d’abord cette référence."
  ],
  "代理策略名称已被其他配置占用，未覆盖原有配置。": [
    "The strategy name is already used elsewhere. Existing configuration preserved.",
    "戦略名が別の設定で使われています。既存設定は保持しました。",
    "Le nom de stratégie est déjà utilisé. Configuration existante conservée."
  ],
  "上一项状态尚未确认，已停止后续操作；请检查恢复状态后重新选择。": [
    "The previous operation is unconfirmed. Further changes stopped; check recovery status before selecting again.",
    "前の操作が未確定のため、後続操作を停止しました。復旧状態を確認して選び直してください。",
    "L’opération précédente n’est pas confirmée. Les changements suivants sont arrêtés ; vérifiez la restauration avant de recommencer."
  ],
  "请求中断，请检查恢复状态后重新选择。": [
    "Request interrupted. Check recovery status before selecting again.",
    "リクエストが中断しました。復旧状態を確認して再選択してください。",
    "Requête interrompue. Vérifiez la restauration avant de recommencer."
  ],
  "本机提取": [
    "Local extraction",
    "端末から抽出",
    "Extraction locale"
  ],
  "用户替换": [
    "Custom image",
    "ユーザー画像",
    "Image personnalisée"
  ],
  "默认图标": [
    "Default icon",
    "既定アイコン",
    "Icône par défaut"
  ],
  "沿用现有策略": [
    "Use existing strategy",
    "既存の戦略を使用",
    "Stratégie existante"
  ],
  "故障备用": [
    "Failover",
    "障害時の予備",
    "Secours"
  ],
  "延迟优先": [
    "Lowest latency",
    "低遅延優先",
    "Latence minimale"
  ],
  "配置格式无效，已停止修改。": [
    "Invalid configuration format. Changes stopped.",
    "設定形式が無効です。変更を停止しました。",
    "Format de configuration invalide. Modifications arrêtées."
  ],
  "配置不是对象。": [
    "Configuration must be an object.",
    "設定がオブジェクト形式ではありません。",
    "La configuration doit être un objet."
  ],
  "目前接入支持 Clash Party 标准模式。请勿在应用过程中切换模式。": [
    "Only Clash Party standard mode is supported. Do not switch modes during an operation.",
    "Clash Party の標準モードに対応しています。適用中にモードを切り替えないでください。",
    "Seul le mode standard de Clash Party est pris en charge. Ne changez pas de mode pendant l’opération."
  ],
  "当前接入仅验证了 Mihomo 稳定内核，请先使用稳定内核。": [
    "Only the stable Mihomo core has been verified. Use the stable core first.",
    "Mihomo の安定版内核のみ検証済みです。安定版を使用してください。",
    "Seul le moteur Mihomo stable a été vérifié. Utilisez cette version."
  ],
  "当前订阅标识无效。": [
    "Invalid subscription identifier.",
    "サブスクリプション識別子が無効です。",
    "Identifiant d’abonnement invalide."
  ],
  "AppRoute 覆写文件名已被占用，已停止覆盖。": [
    "The AppRoute override filename is already in use. Overwrite stopped.",
    "AppRoute の上書きファイル名が使用済みです。上書きを停止しました。",
    "Le nom du fichier de surcharge AppRoute est déjà utilisé. Écriture arrêtée."
  ],
  "覆写登记格式错误。": [
    "Invalid override registration format.",
    "上書き登録の形式が無効です。",
    "Format d’enregistrement des surcharges invalide."
  ],
  "覆写登记格式不受支持。": [
    "Unsupported override registration format.",
    "上書き登録の形式に対応していません。",
    "Format d’enregistrement des surcharges non pris en charge."
  ],
  "AppRoute 覆写登记被更改，请在 Clash Party 中恢复其全局本地脚本设置。": [
    "AppRoute’s override registration changed. Restore its global local-script settings in Clash Party.",
    "AppRoute の上書き登録が変更されています。Clash Party でグローバルなローカルスクリプト設定に戻してください。",
    "L’enregistrement de surcharge AppRoute a changé. Rétablissez ses réglages de script local global dans Clash Party."
  ],
  "AppRoute 应用分流（可独立恢复）": [
    "AppRoute routing (independent recovery)",
    "AppRoute 振り分け（独立復旧可能）",
    "Routage AppRoute (restauration indépendante)"
  ],
  "Clash Party 配置发生变化，请刷新后重新应用。": [
    "Clash Party configuration changed. Refresh and try again.",
    "Clash Party の設定が変わりました。更新して再適用してください。",
    "La configuration Clash Party a changé. Actualisez et réessayez."
  ],
  "无法唯一定位 Clash Party 安装目录。": [
    "Cannot uniquely locate the Clash Party installation.",
    "Clash Party の場所を一意に特定できません。",
    "Impossible d’identifier une installation unique de Clash Party."
  ],
  "Clash Party 安装路径不受支持。": [
    "Unsupported Clash Party installation path.",
    "Clash Party のインストールパスに対応していません。",
    "Chemin d’installation de Clash Party non pris en charge."
  ],
  "Mihomo 未通过候选配置校验，已保留原配置。": [
    "Mihomo rejected the candidate configuration. Original settings preserved.",
    "候補設定が Mihomo の検証に失敗しました。元の設定を保持しています。",
    "Mihomo a rejeté la configuration proposée. Réglages d’origine conservés."
  ],
  "目前真实接入仅支持 Windows。": [
    "Live integration currently supports Windows only.",
    "実環境への接続は現在 Windows のみ対応です。",
    "L’intégration réelle prend actuellement en charge Windows uniquement."
  ],
  "发现多个 Clash Party 实例，请只保留需要接入的实例。": [
    "Multiple Clash Party instances found. Keep only the intended instance.",
    "Clash Party が複数見つかりました。接続するインスタンスのみ残してください。",
    "Plusieurs instances de Clash Party ont été trouvées. Conservez uniquement celle à utiliser."
  ],
  "未找到 Clash Party 内核，请先启动 Clash Party。": [
    "Clash Party core not found. Start Clash Party first.",
    "Clash Party の内核が見つかりません。先に起動してください。",
    "Moteur Clash Party introuvable. Lancez Clash Party d’abord."
  ],
  "内核响应过大": [
    "Core response too large",
    "内核の応答が大きすぎます",
    "Réponse du moteur trop volumineuse"
  ],
  "内核响应中断。": [
    "Core response interrupted.",
    "内核の応答が中断しました。",
    "Réponse du moteur interrompue."
  ],
  "内核请求失败（{0}），配置未确认。": [
    "Core request failed ({0}); configuration unconfirmed.",
    "内核へのリクエスト失敗（{0}）。設定は未確認です。",
    "Échec de la requête au moteur ({0}) ; configuration non confirmée."
  ],
  "内核响应格式错误。": [
    "Invalid core response format.",
    "内核の応答形式が無効です。",
    "Format de réponse du moteur invalide."
  ],
  "无法连接 Clash Party 内核。": [
    "Cannot connect to the Clash Party core.",
    "Clash Party の内核に接続できません。",
    "Impossible de se connecter au moteur Clash Party."
  ],
  "内核请求超时。": [
    "Core request timed out.",
    "内核へのリクエストがタイムアウトしました。",
    "Délai de requête au moteur dépassé."
  ],
  "不支持的后台操作。": [
    "Unsupported backend operation.",
    "対応していないバックエンド操作です。",
    "Opération du service non prise en charge."
  ],
  "本机操作失败，请重试；网络异常时可使用独立恢复入口。": [
    "Local operation failed. Retry; use independent recovery if the network fails.",
    "ローカル操作に失敗しました。再試行してください。ネット異常時は独立復旧を使用できます。",
    "Échec de l’opération locale. Réessayez ; utilisez la restauration indépendante en cas de panne réseau."
  ],
  "不支持的桌面操作。": [
    "Unsupported desktop operation.",
    "対応していないデスクトップ操作です。",
    "Opération de bureau non prise en charge."
  ],
  "请求过大，请分批操作。": [
    "Request too large. Split it into smaller batches.",
    "リクエストが大きすぎます。分割して操作してください。",
    "Requête trop volumineuse. Procédez par lots plus petits."
  ],
  "无效资源地址。": [
    "Invalid resource address.",
    "リソースアドレスが無効です。",
    "Adresse de ressource invalide."
  ],
  "桌面后台已退出，已开始的分流仍有独立恢复保护。请重试。": [
    "The desktop backend exited. Independent recovery still protects started changes. Please retry.",
    "バックエンドが終了しました。開始済みの変更は独立復旧で保護されています。再試行してください。",
    "Le service de bureau s’est arrêté. Les modifications lancées restent protégées par la restauration indépendante. Réessayez."
  ],
  "操作超时，请检查当前状态；不要重复执行恢复中的分流。": [
    "Operation timed out. Check the current status; do not repeat routing changes during recovery.",
    "操作がタイムアウトしました。状態を確認し、復旧中の振り分けを繰り返さないでください。",
    "Opération expirée. Vérifiez l’état ; ne répétez pas les changements pendant une restauration."
  ],
  "无法连接桌面后台。": [
    "Cannot connect to the desktop backend.",
    "デスクトップのバックエンドに接続できません。",
    "Impossible de joindre le service de bureau."
  ],
  "AppRoute 应用分流": [
    "AppRoute · App routing",
    "AppRoute · アプリ振り分け",
    "AppRoute · Routage d’applications"
  ],
  "停用全部 AppRoute 专属分流？": [
    "Disable all AppRoute-specific routing?",
    "AppRoute 専用の振り分けをすべて無効にしますか？",
    "Désactiver tout le routage propre à AppRoute ?"
  ],
  "保留 Clash Party 原有规则和代理配置。收藏与应用列表保留。": [
    "Original Clash Party rules and proxy settings are preserved, along with favorites and the app list.",
    "Clash Party の元のルール・プロキシ設定、お気に入り、アプリ一覧は保持します。",
    "Les règles et paramètres proxy originaux de Clash Party, les favoris et la liste sont conservés."
  ],
  "尚未确认恢复，请使用桌面上的 AppRoute - Restore Network 独立入口。": [
    "Recovery is unconfirmed. Use AppRoute - Restore Network on the desktop.",
    "復旧が未確認です。デスクトップの AppRoute - Restore Network を使用してください。",
    "Restauration non confirmée. Utilisez AppRoute - Restore Network sur le bureau."
  ],
  "桌面请求来源无效。": [
    "Invalid desktop request origin.",
    "デスクトップリクエストの送信元が無効です。",
    "Origine de requête de bureau invalide."
  ],
  "选择应用主程序": [
    "Choose the main executable",
    "主プログラムを選択",
    "Choisir l’exécutable principal"
  ],
  "Windows 应用": [
    "Windows applications",
    "Windows アプリ",
    "Applications Windows"
  ],
  "请选择本机 exe 程序。": [
    "Choose a local exe file.",
    "端末の exe ファイルを選択してください。",
    "Choisissez un fichier exe local."
  ],
  "请通过本机图片地址读取图标。": [
    "Read icons through local image addresses.",
    "ローカルの画像アドレスからアイコンを読み取ってください。",
    "Lisez les icônes via leurs adresses locales."
  ],
  "AppRoute 应用分流 · 双击打开": [
    "AppRoute · Double-click to open",
    "AppRoute · ダブルクリックで開く",
    "AppRoute · Double-cliquez pour ouvrir"
  ],
  "打开 AppRoute": [
    "Open AppRoute",
    "AppRoute を開く",
    "Ouvrir AppRoute"
  ],
  "检查新应用": [
    "Check for new apps",
    "新しいアプリを確認",
    "Rechercher de nouvelles applications"
  ],
  "恢复网络…": [
    "Restore network…",
    "ネットワークを復旧…",
    "Restaurer le réseau…"
  ],
  "打开独立恢复工具目录": [
    "Open offline recovery folder",
    "独立復旧ツールのフォルダーを開く",
    "Ouvrir le dossier de restauration hors ligne"
  ],
  "退出 AppRoute（保留分流规则）": [
    "Quit AppRoute (keep routing rules)",
    "AppRoute を終了（ルールは保持）",
    "Quitter AppRoute (conserver les règles)"
  ],
  "收至托盘": [
    "Minimize to tray",
    "トレイに格納",
    "Réduire dans la zone de notification"
  ],
  "打开托盘菜单": [
    "Open tray menu",
    "トレイメニューを開く",
    "Ouvrir le menu de notification"
  ],
  "退出（保留分流规则）": [
    "Quit (keep routing rules)",
    "終了（ルールは保持）",
    "Quitter (conserver les règles)"
  ],
  "编辑": [
    "Edit",
    "編集",
    "Édition"
  ],
  "撤销": [
    "Undo",
    "元に戻す",
    "Annuler"
  ],
  "复制": [
    "Copy",
    "コピー",
    "Copier"
  ],
  "粘贴": [
    "Paste",
    "貼り付け",
    "Coller"
  ],
  "全选": [
    "Select all",
    "すべて選択",
    "Tout sélectionner"
  ],
  "AppRoute 启动失败": [
    "AppRoute could not start",
    "AppRoute の起動に失敗",
    "Échec du démarrage d’AppRoute"
  ],
  "请保留现有数据并重新打开应用。网络异常时可使用独立恢复入口。": [
    "Preserve existing data and reopen the app. Use independent recovery if the network fails.",
    "データを保持したままアプリを開き直してください。ネット異常時は独立復旧を使えます。",
    "Conservez vos données et rouvrez l’application. Utilisez la restauration indépendante en cas de panne réseau."
  ],
  "无法读取辅助进程，请稍后重试；规则未修改。": [
    "Could not read helper processes. Retry later; rules unchanged.",
    "補助プロセスを読み取れません。後で再試行してください。ルールは変更していません。",
    "Impossible de lire les processus auxiliaires. Réessayez plus tard ; règles inchangées."
  ],
  "自动识别进程目前仅支持 Windows。": [
    "Automatic process detection currently requires Windows.",
    "自動プロセス識別は現在 Windows のみ対応です。",
    "La détection automatique des processus nécessite Windows."
  ],
  "主程序不存在或路径不可读取，请重新扫描。": [
    "Executable missing or unreadable. Scan again.",
    "主プログラムがないか読み取れません。再スキャンしてください。",
    "Exécutable absent ou illisible. Relancez l’analyse."
  ],
  "已按独立安装目录预识别组件，并结合运行中的父子关系核对；只写入各 exe 的精确路径。": [
    "Components were identified in the dedicated installation folder and checked against running parent-child processes. Rules use exact exe paths only.",
    "専用インストール先と実行中の親子関係から識別しました。各 exe の正確なパスのみルールに使います。",
    "Composants identifiés dans le dossier dédié et vérifiés avec les relations parent-enfant. Les règles utilisent uniquement les chemins exe exacts."
  ],
  "扫描应用需要在 Windows 本机运行。": [
    "App scanning must run locally on Windows.",
    "アプリのスキャンは Windows 端末で実行してください。",
    "L’analyse doit être exécutée localement sous Windows."
  ],
  "扫描结果格式错误": [
    "Invalid scan result format",
    "スキャン結果の形式が無効です",
    "Format de résultat d’analyse invalide"
  ],
  "扫描结果包含无效应用": [
    "Scan results contain invalid apps",
    "スキャン結果に無効なアプリがあります",
    "L’analyse contient des applications invalides"
  ],
  "AppRoute 离线恢复：正在停用本工具的专属分流并重新加载原有配置。": [
    "AppRoute offline recovery: disabling AppRoute rules and reloading the original configuration.",
    "AppRoute オフライン復旧：専用ルールを無効化し、元の設定を再読み込みしています。",
    "Restauration hors ligne AppRoute : désactivation des règles AppRoute et rechargement de la configuration originale."
  ],
  "用法：recovery.cjs recover | doctor": [
    "Usage: recovery.cjs recover | doctor",
    "使い方：recovery.cjs recover | doctor",
    "Utilisation : recovery.cjs recover | doctor"
  ],
  "恢复未完成": [
    "Recovery incomplete",
    "復旧未完了",
    "Restauration incomplète"
  ],
  "AppRoute 离线恢复\r\n双击 Restore-Network.cmd：停用 AppRoute 自己的分流规则，重新加载当前 Clash Party 配置。\r\n不需要网络、ChatGPT、项目目录或 npm。\r\n命令行自检：node.exe recovery.cjs doctor\r\n请保留此目录。恢复不会关闭系统代理或重置网卡。\r\n": [
    "AppRoute offline recovery. Run Restore-Network.cmd to disable AppRoute rules and reload the current Clash Party configuration. No internet, ChatGPT, project folder or npm needed. Diagnose with node.exe recovery.cjs doctor. Keep this directory. Recovery does not disable the system proxy or reset adapters.",
    "AppRoute オフライン復旧。Restore-Network.cmd で専用ルールを無効にし、現在の Clash Party 設定を読み込みます。ネット・ChatGPT・プロジェクト・npm は不要です。診断は node.exe recovery.cjs doctor。このフォルダーを保管してください。システムプロキシの無効化やアダプターのリセットは行いません。",
    "Restauration hors ligne AppRoute. Lancez Restore-Network.cmd pour désactiver les règles AppRoute et recharger Clash Party. Aucun Internet, ChatGPT, projet ni npm nécessaire. Diagnostic : node.exe recovery.cjs doctor. Conservez ce dossier. Le proxy système et les adaptateurs ne sont pas réinitialisés."
  ],
  "独立恢复文件未能完整核对，取消应用。": [
    "Independent recovery files could not be fully verified. Apply canceled.",
    "独立復旧ファイルを完全に確認できません。適用を中止しました。",
    "Vérification des fichiers de restauration incomplète. Application annulée."
  ],
  "独立恢复守护进程未就绪，已取消应用。": [
    "Independent recovery watchdog is not ready. Apply canceled.",
    "独立復旧監視が準備できていません。適用を中止しました。",
    "La surveillance de restauration n’est pas prête. Application annulée."
  ],
  "请使用不超过 512 KB 的 PNG 图片。": [
    "Use a PNG no larger than 512 KB.",
    "512 KB 以下の PNG を使ってください。",
    "Utilisez un PNG de 512 Ko maximum."
  ],
  "图片不是有效的 PNG。": [
    "Not a valid PNG image.",
    "有効な PNG 画像ではありません。",
    "Image PNG invalide."
  ],
  "图片尺寸不能超过 512 × 512。": [
    "Image dimensions must not exceed 512 × 512.",
    "画像は 512 × 512 以下にしてください。",
    "Dimensions maximales : 512 × 512."
  ],
  "请使用非交错 PNG，或在页面中重新选择图片。": [
    "Use a non-interlaced PNG or select the image again in the app.",
    "非インターレース PNG を使うか、画面で画像を選び直してください。",
    "Utilisez un PNG non entrelacé ou sélectionnez à nouveau l’image."
  ],
  "PNG 数据结构无效。": [
    "Invalid PNG structure.",
    "PNG 構造が無効です。",
    "Structure PNG invalide."
  ],
  "PNG 数据不完整。": [
    "Incomplete PNG data.",
    "PNG データが不完全です。",
    "Données PNG incomplètes."
  ],
  "图片内容损坏，无法读取。": [
    "Image data is corrupt and cannot be read.",
    "画像が破損して読み取れません。",
    "Image corrompue et illisible."
  ],
  "图片完全透明，请选择有可见内容的图标。": [
    "The image is fully transparent. Choose an icon with visible content.",
    "画像が完全に透明です。見える内容のある画像を選択してください。",
    "L’image est entièrement transparente. Choisissez une icône visible."
  ],
  "应用标识无效。": [
    "Invalid app identifier.",
    "アプリ識別子が無効です。",
    "Identifiant d’application invalide."
  ],
  "图标索引无法读取，请保留本机 icons 目录以便恢复。": [
    "Cannot read the icon index. Preserve the local icons folder for recovery.",
    "アイコン索引を読み取れません。復旧のため icons フォルダーを保持してください。",
    "Index des icônes illisible. Conservez le dossier icons pour la récupération."
  ],
  "无效图标标识。": [
    "Invalid icon identifier.",
    "アイコン識別子が無効です。",
    "Identifiant d’icône invalide."
  ],
  "图标缓存损坏。": [
    "Icon cache is corrupt.",
    "アイコンキャッシュが破損しています。",
    "Cache des icônes corrompu."
  ],
  "优先图标缓存损坏，已回退": [
    "Preferred icon cache was corrupt; fallback used",
    "優先アイコンが破損したため代替を使用",
    "Cache prioritaire corrompu ; icône de remplacement utilisée"
  ],
  "分辨率较低，可手动替换": [
    "Low resolution; you can replace it manually",
    "低解像度です。手動で変更できます",
    "Faible résolution ; remplacement manuel possible"
  ],
  "本次提取失败，保留上次缓存": [
    "Extraction failed; previous cache retained",
    "抽出失敗。以前のキャッシュを保持",
    "Extraction échouée ; cache précédent conservé"
  ],
  "使用你指定的图片": [
    "Using your selected image",
    "指定した画像を使用",
    "Utilise votre image"
  ],
  "浅色图形已补充对比底色": [
    "Contrast background added for a light glyph",
    "淡色図形にコントラスト用の背景を追加",
    "Fond contrasté ajouté au symbole clair"
  ],
  "已解码并检查本机图标": [
    "Local icon decoded and checked",
    "端末のアイコンを読み取り確認済み",
    "Icône locale décodée et vérifiée"
  ],
  "缓存损坏，可重新检查或替换": [
    "Cache corrupt; check again or replace",
    "キャッシュ破損。再確認または変更できます",
    "Cache corrompu ; revérifiez ou remplacez"
  ],
  "使用随软件附带的公共图标": [
    "Using an icon bundled with the app",
    "同梱の公開アイコンを使用",
    "Utilise une icône fournie avec l’application"
  ],
  "尚未找到专属图标，请补充": [
    "No specific icon found yet; choose one",
    "専用アイコン未検出。選択してください",
    "Aucune icône spécifique trouvée ; choisissez-en une"
  ],
  "应用列表无效。": [
    "Invalid app list.",
    "アプリ一覧が無効です。",
    "Liste d’applications invalide."
  ],
  "无效应用标识。": [
    "Invalid app identity.",
    "アプリの識別情報が無効です。",
    "Identité d’application invalide."
  ],
  "应用不存在，请刷新列表。": [
    "App not found. Refresh the list.",
    "アプリがありません。一覧を更新してください。",
    "Application introuvable. Actualisez la liste."
  ],
  "应用列表资料无效。": [
    "Invalid application inventory data.",
    "アプリ一覧のデータが無効です。",
    "Données d’inventaire invalides."
  ],
  "本地状态损坏，请运行离线恢复。": [
    "Local state is corrupt. Run offline recovery.",
    "ローカル状態が破損しています。オフライン復旧を実行してください。",
    "État local corrompu. Lancez la restauration hors ligne."
  ],
  "恢复编号无效。": [
    "Invalid recovery identifier.",
    "復旧識別子が無効です。",
    "Identifiant de restauration invalide."
  ],
  "恢复工具尚未构建，请先运行 npm run recovery:build。": [
    "Recovery tools are not built yet. Run npm run recovery:build first.",
    "復旧ツールが未ビルドです。npm run recovery:build を実行してください。",
    "Outils de restauration non construits. Exécutez npm run recovery:build."
  ],
  "专用代理策略未确认加载，请重新应用或恢复。": [
    "Dedicated proxy strategy loading is unconfirmed. Apply again or restore.",
    "専用戦略の読み込みが未確認です。再適用または復旧してください。",
    "Chargement de la stratégie dédiée non confirmé. Réappliquez ou restaurez."
  ],
  "订阅中有 {0} 个候选节点已消失，请重新选择；全部消失时拒绝连接，不改为直连。": [
    "{0} candidates disappeared from the subscription. Select again. If all disappear, connections are rejected rather than sent directly.",
    "サブスクリプションから候補が {0} 個なくなりました。再選択してください。全候補が消えた場合は直接接続せず拒否します。",
    "{0} candidats ont disparu de l’abonnement. Refaites la sélection. Si tous disparaissent, les connexions sont refusées, sans passage en direct."
  ],
  "所有候选节点最近探测均失败；等待内核重试或更换节点，不自动直连。": [
    "Recent probes failed for every candidate. Wait for a core retry or select other nodes. No automatic direct fallback.",
    "全候補の直近測定が失敗しました。内核の再試行を待つかノードを変更してください。自動で直接接続にはしません。",
    "Les tests récents de tous les candidats ont échoué. Attendez une nouvelle tentative ou changez les nœuds. Aucun repli direct automatique."
  ],
  "未知目标": [
    "Unknown target",
    "不明な対象",
    "Cible inconnue"
  ],
  "当前内核不是规则模式，应用规则不会按预期执行。": [
    "The core is not in Rule mode; app rules will not work as expected.",
    "内核がルールモードではないため、振り分けが意図どおりに動作しません。",
    "Le moteur n’est pas en mode Règles ; le routage ne fonctionnera pas comme prévu."
  ],
  "检测到 {0} 条历史 AppRoute 规则仍在运行，但本机管理记录为空。当前分流无法从列表确认；请核对记录，或使用恢复网络停用历史规则后重新设置。": [
    "{0} historical AppRoute rules are active, but local records are empty. Review the records or disable historical rules with Restore network before configuring again.",
    "過去の AppRoute ルールが {0} 件動作中ですが管理記録がありません。記録を確認するか復旧してから再設定してください。",
    "{0} anciennes règles AppRoute sont actives sans enregistrements locaux. Vérifiez les données ou désactivez ces règles via la restauration avant de reconfigurer."
  ],
  "代理组或成员不存在，跟随尚未确认。订阅重新生成时会跳过失效目标、沿用原有规则；请重新绑定有效组。": [
    "Group or member missing; following is unconfirmed. Regeneration skips invalid targets and uses original rules. Bind a valid group again.",
    "グループかメンバーがなく、追従は未確認です。再生成時は無効な対象をスキップして元のルールを使用します。有効なグループを関連付けてください。",
    "Groupe ou membre absent ; suivi non confirmé. La régénération ignore les cibles invalides et utilise les règles d’origine. Associez un groupe valide."
  ],
  "规则与运行内核不一致，请检查覆写启用状态或恢复后重新应用。": [
    "Rules differ from the running core. Check overrides or restore and apply again.",
    "動作中の内核とルールが異なります。上書きの有効状態を確認するか、復旧して再適用してください。",
    "Les règles diffèrent du moteur actif. Vérifiez les surcharges ou restaurez puis réappliquez."
  ],
  "当前规则已加载，持久化尚未验证。首次登记后请正常退出并重新打开 Clash Party，再检查规则是否仍已加载。": [
    "Rules are loaded; persistence is not verified yet. After first registration, quit and reopen Clash Party normally, then check rule loading again.",
    "ルールは読込済みですが保持は未検証です。初回登録後に Clash Party を正常終了して開き直し、再確認してください。",
    "Règles chargées ; persistance non vérifiée. Après le premier enregistrement, quittez normalement Clash Party puis rouvrez-le et vérifiez les règles."
  ],
  "当前使用系统代理；不遵循系统代理的软件可能不会进入 Clash，需以实际连接检查为准。": [
    "System proxy is in use. Apps that ignore it may not enter Clash; verify actual connections.",
    "システムプロキシを使用中です。従わないアプリは Clash に入らない可能性があります。実際の接続で確認してください。",
    "Le proxy système est utilisé. Les applications qui l’ignorent peuvent contourner Clash ; vérifiez les connexions réelles."
  ],
  "Clash Party 控制连接": [
    "Clash Party control connection",
    "Clash Party 制御接続",
    "Connexion de contrôle Clash Party"
  ],
  "已连接，当前模式 {0}": [
    "Connected; current mode: {0}",
    "接続済み。現在のモード：{0}",
    "Connecté ; mode actuel : {0}"
  ],
  "应用规则与代理策略加载": [
    "App rules and proxy strategy loading",
    "アプリルールと戦略の読み込み",
    "Chargement des règles et de la stratégie"
  ],
  "{0} 条历史规则仍在内核运行，但缺少对应管理记录": [
    "{0} historical rules are active without management records",
    "管理記録のない過去ルールが {0} 件動作中",
    "{0} anciennes règles actives sans enregistrements"
  ],
  "核对专属规则和已保存的代理策略": [
    "Check app-specific rules and the saved strategy",
    "専用ルールと保存済み戦略を照合",
    "Vérifier les règles spécifiques et la stratégie enregistrée"
  ],
  "当前出口 HTTPS 探测": [
    "HTTPS probe through the current outbound",
    "現在の出口で HTTPS 測定",
    "Test HTTPS via la sortie actuelle"
  ],
  "国内直连 HTTPS 探测": [
    "HTTPS probe through a domestic direct connection",
    "国内の直接接続で HTTPS 測定",
    "Test HTTPS en connexion directe locale"
  ],
  "收到目标响应，{0} ms；不等同于所有应用均正常": [
    "Target responded in {0} ms; this does not verify every app",
    "対象が {0} ms で応答。全アプリの正常性は保証しません",
    "Réponse en {0} ms ; cela ne valide pas toutes les applications"
  ],
  "探测失败：可能是网络、目标站点或出口异常": [
    "Probe failed: network, target site or outbound may be unavailable",
    "測定失敗：ネットワーク・対象サイト・出口の問題が考えられます",
    "Test échoué : réseau, site cible ou sortie potentiellement indisponible"
  ],
  "独立离线恢复入口": [
    "Independent offline recovery entry",
    "独立オフライン復旧の入口",
    "Accès de restauration hors ligne indépendant"
  ],
  "一次请选择 1 至 100 个应用。": [
    "Select 1 to 100 apps at a time.",
    "一度に 1～100 アプリを選択してください。",
    "Sélectionnez de 1 à 100 applications à la fois."
  ],
  "请求包含重复应用。": [
    "Request contains duplicate apps.",
    "リクエストに重複アプリがあります。",
    "La requête contient des doublons."
  ],
  "状态已变化或仍有恢复检查，请稍后重试。": [
    "State changed or recovery is still being checked. Retry later.",
    "状態が変化したか復旧確認中です。後で再試行してください。",
    "L’état a changé ou la restauration est en cours de vérification. Réessayez plus tard."
  ],
  "网络基线检查未通过，暂未修改设置。": [
    "Network baseline check failed. No settings changed.",
    "適用前のネットワーク確認に失敗。設定は変更していません。",
    "Échec du contrôle réseau initial. Aucun paramètre modifié."
  ],
  "候选节点探测均未通过，原策略保留。": [
    "All candidate probes failed. Original strategy preserved.",
    "全候補の測定に失敗。元の戦略を保持しました。",
    "Tous les tests candidats ont échoué. Stratégie originale conservée."
  ],
  "当前直连出口不可用，暂未修改设置。": [
    "The direct outbound is unavailable. No settings changed.",
    "直接接続の出口が使えません。設定は変更していません。",
    "Sortie directe indisponible. Aucun paramètre modifié."
  ],
  "所选代理出口不可用，请更换出口。": [
    "Selected proxy outbound is unavailable. Choose another.",
    "選択した出口が使えません。別の出口を選んでください。",
    "Sortie proxy indisponible. Choisissez-en une autre."
  ],
  "未取得恢复事务，不能确认应用。": [
    "No recovery transaction found. Cannot confirm the change.",
    "復旧トランザクションがありません。適用を確定できません。",
    "Transaction de restauration introuvable. Modification non confirmable."
  ],
  "新代理策略的出口检查未通过。": [
    "The new strategy failed its outbound check.",
    "新しい戦略の出口確認に失敗しました。",
    "Échec du contrôle de sortie de la nouvelle stratégie."
  ],
  "应用后网络检查未通过。": [
    "Post-apply network check failed.",
    "適用後のネットワーク確認に失敗しました。",
    "Échec du contrôle réseau après application."
  ],
  "原有代理出口选择发生变化。": [
    "An original proxy selection changed.",
    "元のプロキシ選択が変化しました。",
    "Une sélection proxy d’origine a changé."
  ],
  "发现不符合设置的新连接。": [
    "New connections inconsistent with settings were observed.",
    "設定と一致しない新しい接続を検出しました。",
    "De nouvelles connexions non conformes ont été observées."
  ],
  "规则已加载并通过网络检查；实际分流以新连接证据为准。": [
    "Rules loaded and network checks passed. Actual routing still depends on new-connection evidence.",
    "ルール読み込みとネットワーク確認に成功。実際の振り分けは新規接続の証拠で確認してください。",
    "Règles chargées et contrôles réseau réussis. Le routage réel reste à confirmer par les nouvelles connexions."
  ],
  "自动恢复尚未确认，请使用“恢复网络”或桌面离线恢复入口。": [
    "Automatic recovery is unconfirmed. Use Restore network or the desktop offline recovery tool.",
    "自動復旧が未確認です。画面の復旧かデスクトップの独立復旧を使用してください。",
    "Restauration automatique non confirmée. Utilisez la restauration réseau ou l’outil hors ligne du bureau."
  ],
  "操作失败。": [
    "Operation failed.",
    "操作に失敗しました。",
    "L’opération a échoué."
  ],
  "已自动恢复上一次设置。": [
    "Previous settings restored automatically.",
    "前の設定に自動で戻しました。",
    "Réglages précédents rétablis automatiquement."
  ],
  "原设置保留。": [
    "Original settings preserved.",
    "元の設定を保持しました。",
    "Réglages d’origine conservés."
  ],
  "请检查恢复状态。": [
    "Check recovery status.",
    "復旧状態を確認してください。",
    "Vérifiez l’état de restauration."
  ],
  "代理策略必须同时更新全部代理应用。": [
    "A strategy change must update all proxy apps together.",
    "戦略変更ではすべてのプロキシアプリを同時に更新する必要があります。",
    "Un changement de stratégie doit mettre à jour toutes les applications proxy ensemble."
  ],
  "请先保留或恢复上一轮试运行设置。": [
    "Confirm or restore the previous trial first.",
    "先に前回の試行を確定または復旧してください。",
    "Confirmez ou restaurez d’abord l’essai précédent."
  ],
  "页面状态已过期，请刷新后重试。": [
    "Page state is outdated. Refresh and retry.",
    "画面の状態が古くなりました。更新して再試行してください。",
    "L’état affiché est périmé. Actualisez et réessayez."
  ],
  "请先选择应用。": [
    "Select apps first.",
    "先にアプリを選択してください。",
    "Sélectionnez d’abord des applications."
  ],
  "磁盘与运行中的规则不一致，已停止修改。请先在 Clash Party 重新加载配置，再重试。": [
    "Disk and runtime rules differ. Changes stopped. Reload the configuration in Clash Party before retrying.",
    "ディスクと動作中のルールが異なります。変更を停止しました。Clash Party で設定を再読み込みして再試行してください。",
    "Les règles du disque et du moteur diffèrent. Modifications arrêtées. Rechargez la configuration dans Clash Party puis réessayez."
  ],
  "磁盘与运行中的代理组不一致，已停止修改。请先在 Clash Party 重新加载配置。": [
    "Disk and runtime groups differ. Changes stopped. Reload the configuration in Clash Party.",
    "ディスクと動作中のグループが異なります。変更を停止しました。Clash Party で設定を再読み込みしてください。",
    "Les groupes du disque et du moteur diffèrent. Modifications arrêtées. Rechargez la configuration dans Clash Party."
  ],
  "需要 Clash Party 的规则模式及进程识别；AppRoute 不会自动切换全局网络设置。": [
    "Clash Party Rule mode and process identification are required. AppRoute does not switch global network settings automatically.",
    "Clash Party のルールモードとプロセス識別が必要です。AppRoute はグローバル設定を自動変更しません。",
    "Le mode Règles et l’identification des processus sont nécessaires. AppRoute ne modifie pas automatiquement les paramètres réseau globaux."
  ],
  "磁盘配置与内核模式或代理端口不同，请先在 Clash Party 重新加载配置。": [
    "Disk configuration differs from the core mode or proxy port. Reload the configuration in Clash Party.",
    "ディスク設定と内核のモード・ポートが異なります。Clash Party で再読み込みしてください。",
    "La configuration du disque diffère du mode ou du port du moteur. Rechargez-la dans Clash Party."
  ],
  "候选节点已经变化或不是远端节点，请刷新列表后重选。": [
    "Candidates changed or are not remote nodes. Refresh and select again.",
    "候補が変わったか遠隔ノードではありません。更新して選び直してください。",
    "Les candidats ont changé ou ne sont pas distants. Actualisez et refaites la sélection."
  ],
  "请选择有效代理组，并统一更新已有代理应用。": [
    "Choose a valid group and update all existing proxy apps together.",
    "有効なグループを選び、既存のプロキシアプリを一括更新してください。",
    "Choisissez un groupe valide et mettez à jour toutes les applications proxy ensemble."
  ],
  "代理出口不存在或类型不支持，请重新选择。": [
    "Proxy outbound missing or unsupported. Select again.",
    "出口がないか非対応です。選び直してください。",
    "Sortie proxy absente ou non prise en charge. Refaites la sélection."
  ],
  "内核运行配置发生变化，已取消本次应用。": [
    "Runtime configuration changed. This operation was canceled.",
    "動作中の設定が変わりました。今回の適用を中止しました。",
    "La configuration active a changé. Opération annulée."
  ],
  "内核未加载预期规则或代理策略。": [
    "The core did not load the expected rules or strategy.",
    "内核が期待するルール・戦略を読み込みませんでした。",
    "Le moteur n’a pas chargé les règles ou la stratégie attendues."
  ],
  "原有规则未完整保留，正在恢复。": [
    "Original rules were not fully preserved. Restoring.",
    "元のルールを完全に保持できませんでした。復旧中です。",
    "Les règles d’origine n’ont pas été entièrement conservées. Restauration en cours."
  ],
  "应用失败且内核恢复未确认，请立即运行独立恢复工具。": [
    "Apply failed and core recovery is unconfirmed. Run independent recovery immediately.",
    "適用失敗かつ内核の復旧が未確認です。独立復旧をすぐに実行してください。",
    "Échec de l’application et restauration du moteur non confirmée. Lancez immédiatement la restauration indépendante."
  ],
  "这次试运行已结束。": [
    "This trial has already ended.",
    "この試行は終了しています。",
    "Cet essai est déjà terminé."
  ],
  "试运行已超时，设置已恢复。": [
    "Trial timed out. Settings restored.",
    "試行がタイムアウトしました。設定を戻しました。",
    "Essai expiré. Réglages restaurés."
  ],
  "规则或策略状态异常，不能确认保留。": [
    "Rules or strategy are inconsistent. Cannot confirm retention.",
    "ルールまたは戦略が異常です。保持を確定できません。",
    "Règles ou stratégie incohérentes. Conservation non confirmable."
  ],
  "覆写脚本出现外部修改，已停止覆盖。": [
    "External changes detected in the override script. Overwrite stopped.",
    "上書きスクリプトに外部変更を検出しました。上書きを停止しました。",
    "Modification externe du script détectée. Écriture arrêtée."
  ],
  "旧规则或代理策略未确认": [
    "Previous rules or strategy unconfirmed",
    "以前のルールまたは戦略は未確認",
    "Anciennes règles ou stratégie non confirmées"
  ],
  "持久化规则已恢复；内核未确认，请运行离线恢复或在 Clash Party 重新加载。": [
    "Persistent rules restored; core unconfirmed. Run offline recovery or reload in Clash Party.",
    "永続ルールは戻しましたが内核は未確認です。独立復旧または Clash Party で再読み込みしてください。",
    "Règles persistantes restaurées ; moteur non confirmé. Lancez la restauration hors ligne ou rechargez Clash Party."
  ],
  "持久化规则已恢复，但无法确认内核；请运行离线恢复工具。": [
    "Persistent rules restored, but core state is unconfirmed. Run offline recovery.",
    "永続ルールは復旧しましたが内核を確認できません。オフライン復旧を実行してください。",
    "Règles persistantes restaurées, mais moteur non confirmé. Lancez la restauration hors ligne."
  ],
  "覆写文件不是 AppRoute 所有，未覆盖。": [
    "Override file is not owned by AppRoute. It was not overwritten.",
    "上書きファイルは AppRoute 所有ではないため変更していません。",
    "Le fichier de surcharge n’appartient pas à AppRoute. Il n’a pas été écrasé."
  ],
  "原有规则未完整恢复": [
    "Original rules were not fully restored",
    "元のルールが完全には復旧していません",
    "Les règles d’origine n’ont pas été entièrement restaurées"
  ],
  "已停用 AppRoute 专属规则，并重新加载当前 Clash Party 原有配置。请自检或打开网页确认网络。": [
    "AppRoute rules disabled and the current original Clash Party configuration reloaded. Run diagnostics or open a website to confirm connectivity.",
    "専用ルールを無効にし、現在の Clash Party の元設定を読み込みました。診断や Web 閲覧で接続を確認してください。",
    "Règles AppRoute désactivées et configuration actuelle de Clash Party rechargée. Lancez un diagnostic ou ouvrez un site pour vérifier la connexion."
  ],
  "AppRoute 持久化规则已停用，但内核恢复未确认。请在 Clash Party 重新加载配置或启动内核；原有订阅、系统代理和 TUN 设置未被清空。": [
    "AppRoute persistent rules disabled, but core recovery is unconfirmed. Reload the configuration or start the core in Clash Party. Subscriptions, system proxy and TUN settings were not cleared.",
    "永続ルールは無効にしましたが内核の復旧は未確認です。Clash Party で再読み込みまたは内核を起動してください。サブスクリプション・システムプロキシ・TUN は削除していません。",
    "Règles persistantes AppRoute désactivées, mais restauration du moteur non confirmée. Rechargez la configuration ou démarrez le moteur dans Clash Party. Abonnements, proxy système et TUN conservés."
  ],
  "配置已被其他程序修改，请刷新后重试。": [
    "Another program changed the configuration. Refresh and retry.",
    "別のプログラムが設定を変更しました。更新して再試行してください。",
    "Un autre programme a modifié la configuration. Actualisez et réessayez."
  ],
  "另一个应用或恢复操作仍在运行，请稍后重试。": [
    "Another apply or recovery operation is running. Retry later.",
    "別の適用・復旧処理が動作中です。後で再試行してください。",
    "Une autre application de réglages ou restauration est en cours. Réessayez plus tard."
  ],
  "显示语言": [
    "Display language",
    "表示言語",
    "Langue d’affichage"
  ],
  "跟随系统": [
    "System language",
    "システムに従う",
    "Langue du système"
  ],
  "语言偏好保存失败，当前语言保持不变。": [
    "Could not save the language preference. The current language is unchanged.",
    "言語設定を保存できません。現在の言語を維持します。",
    "Impossible d’enregistrer la langue. La langue actuelle est conservée."
  ],
  "语言设置无法读取，请保留原文件后重试。": [
    "Cannot read language settings. Preserve the original file and retry.",
    "言語設定を読み取れません。元のファイルを保持して再試行してください。",
    "Impossible de lire les paramètres de langue. Conservez le fichier original et réessayez."
  ],
  "不支持的显示语言。": [
    "Unsupported display language.",
    "対応していない表示言語です。",
    "Langue d’affichage non prise en charge."
  ],
  "已选择 {0} 个应用": [
    "Selected apps: {0}",
    "選択済みアプリ：{0} 件",
    "Applications sélectionnées : {0}"
  ],
  "当前视图 {0} 个 · 本机共 {1} 个": [
    "Showing {0} of {1} apps",
    "表示中 {0} 件 · 合計 {1} 件",
    "{0} applications affichées sur {1}"
  ],
  "规则已加载 · {0} 个应用": [
    "Rules loaded · {0} apps",
    "ルール読込済み · {0} アプリ",
    "Règles chargées · {0} applications"
  ],
  "{0} 个进程": [
    "Processes: {0}",
    "プロセス：{0} 件",
    "Processus : {0}"
  ],
  "{0} 个应用已设分流": [
    "Apps with routing: {0}",
    "振り分け設定済み：{0} 件",
    "Applications configurées : {0}"
  ],
  "{0} 个应用有管理记录": [
    "Apps with records: {0}",
    "管理記録あり：{0} 件",
    "Applications avec enregistrements : {0}"
  ],
  "共 {0} 个结果": [
    "Results: {0}",
    "結果：{0} 件",
    "Résultats : {0}"
  ],
  "未知技术错误，原始诊断：{0}": [
    "Unrecognized technical error. Original diagnostic: {0}",
    "未分類の技術エラー。元の診断：{0}",
    "Erreur technique non reconnue. Diagnostic original : {0}"
  ],
  "已设置": [
    "Configured",
    "設定済み",
    "Configurées"
  ],
  "仅显示已设置专属分流的应用": [
    "Apps with dedicated routing only",
    "専用ルールを設定したアプリのみ",
    "Applications avec routage dédié uniquement"
  ],
  "选择直接联网或跟随代理组的应用显示在“已设置”中。收藏仅用于单独筛选，不改变联网方式。": [
    "Configured lists apps using Direct or Follow proxy group. Favorites are a separate filter and do not change routing.",
    "「設定済み」には直接接続またはプロキシグループに従うアプリを表示します。お気に入りは独立した絞り込みで、接続方式は変更しません。",
    "La vue Configurées contient les applications en accès direct ou suivant un groupe proxy. Les favoris servent uniquement de filtre."
  ],
  "从全部应用选择联网方式，设置成功后会出现在这里": [
    "Choose a routing mode in All apps to add an app here.",
    "すべてのアプリで接続方式を設定すると、ここに表示されます。",
    "Choisissez un mode dans Toutes les applications pour ajouter une application ici."
  ],
  "已加入收藏": [
    "Added to favorites",
    "お気に入りに追加しました",
    "Ajouté aux favoris"
  ],
  "列表分类": [
    "List membership",
    "一覧の分類",
    "Classement"
  ],
  "“已设置”包含哪些应用？": [
    "Which apps are in Configured?",
    "「設定済み」には何が表示されますか？",
    "Que contient la vue Configurées ?"
  ],
  "新发现": [
    "New",
    "新しく検出",
    "Nouvelle"
  ],
  "等待应用联网": [
    "Waiting for app traffic",
    "アプリの通信待ち",
    "En attente de trafic"
  ],
  "代理组已失效": [
    "Proxy group unavailable",
    "プロキシグループが無効",
    "Groupe proxy indisponible"
  ],
  "组消失后拒绝匹配的新连接，请重新选择代理组。": [
    "Matching new connections are rejected when the group disappears. Select a valid group.",
    "グループが消えた場合、一致する新規接続を拒否します。グループを選び直してください。",
    "Les nouvelles connexions correspondantes sont refusées si le groupe disparaît. Sélectionnez un groupe valide."
  ],
  "组消失后沿用原有规则，请重新选择代理组。": [
    "Original rules apply when the group disappears. Select a valid group.",
    "グループが消えた場合、元のルールに従います。選び直してください。",
    "Les règles initiales s’appliquent si le groupe disparaît. Sélectionnez un groupe valide."
  ],
  "节点探测失败": [
    "Node check failed",
    "ノードの確認に失敗",
    "Échec du test du nœud"
  ],
  "代理组仍存在；手动组需要换节点，自动组由 Mihomo 继续探测。": [
    "The group still exists. Select another node in a manual group; Mihomo continues checking automatic groups.",
    "グループは存在します。手動グループはノードを変更してください。自動グループは Mihomo が検査を継続します。",
    "Le groupe existe. Changez de nœud pour un groupe manuel ; Mihomo poursuit les tests des groupes automatiques."
  ],
  "代理组消失时": [
    "When the proxy group disappears",
    "グループが消えた場合",
    "Si le groupe proxy disparaît"
  ],
  "停止匹配的新连接": [
    "Block matching new connections",
    "一致する新規接続を拒否",
    "Bloquer les nouvelles connexions correspondantes"
  ],
  "配置重生成后使用 REJECT，重新选择有效代理组后恢复。": [
    "Uses REJECT after configuration regeneration. Select a valid group to restore routing.",
    "設定の再生成後に REJECT を使用します。有効なグループを選ぶと復旧します。",
    "Utilise REJECT après régénération de la configuration. Sélectionnez un groupe valide pour rétablir le routage."
  ],
  "可能直连或使用其他出口，具体由 Clash Party 原规则决定。": [
    "May connect directly or use another outlet, according to the original Clash Party rules.",
    "直接接続または別の出口を使用する場合があります。Clash Party の元のルールに従います。",
    "Peut utiliser un accès direct ou une autre sortie, selon les règles initiales de Clash Party."
  ],
  "仅处理整个代理组消失。单个节点失败仍由组内手动、故障备用或延迟策略处理。": [
    "Applies only when the whole group disappears. Node failures follow the group’s manual, fallback or latency strategy.",
    "グループ全体の消失のみが対象です。ノードの障害はグループの手動・フェイルオーバー・遅延優先設定で処理します。",
    "Concerne uniquement la disparition du groupe entier. Les pannes de nœuds suivent la stratégie manuelle, de secours ou de latence du groupe."
  ],
  "开始使用": [
    "Get started",
    "使い始める",
    "Premiers pas"
  ],
  "① 确认 Clash Party 已连接": [
    "1. Check the Clash Party connection",
    "① Clash Party の接続を確認",
    "1. Vérifier la connexion à Clash Party"
  ],
  "② 需要代理时，先选择代理策略": [
    "2. Choose a strategy if you need a proxy",
    "② プロキシが必要なら戦略を選択",
    "2. Choisir une stratégie si un proxy est nécessaire"
  ],
  "③ 在全部应用中选择联网方式": [
    "3. Choose routing in All apps",
    "③ すべてのアプリで接続方式を選択",
    "3. Choisir le routage dans Toutes les applications"
  ],
  "连接概况": [
    "Overview",
    "接続概要",
    "Vue d’ensemble"
  ],
  "控制接口正常": [
    "Control API connected",
    "制御 API 接続済み",
    "API de contrôle connectée"
  ],
  "当前节点": [
    "Current node",
    "現在のノード",
    "Nœud actuel"
  ],
  "连接参数": [
    "Connection parameters",
    "接続パラメーター",
    "Paramètres de connexion"
  ],
  "应用规则": [
    "App rules",
    "アプリのルール",
    "Règles des applications"
  ],
  "个应用已设置": [
    "apps configured",
    "個のアプリを設定済み",
    "applications configurées"
  ],
  "规则加载与实际连接分别验证。等待应用联网时，可打开该应用并建立新连接。": [
    "Rule loading and live connections are verified separately. Open the app and start a new connection to verify traffic.",
    "ルールの読み込みと実際の接続は別々に検証します。アプリを開いて新しい通信を開始してください。",
    "Le chargement des règles et les connexions sont vérifiés séparément. Ouvrez l’application et démarrez une nouvelle connexion."
  ],
  "验证说明": [
    "Verification details",
    "検証の説明",
    "Détails de vérification"
  ],
  "管理记录需要核对": [
    "Management records need checking",
    "管理記録の確認が必要",
    "Vérification des enregistrements requise"
  ],
  "核对并恢复记录": [
    "Check and restore records",
    "確認して記録を復元",
    "Vérifier et restaurer les enregistrements"
  ],
  "先核对当前规则，再恢复记录；不会重新应用旧缓存。": [
    "Verify current rules before restoring records. Cached routing is never replayed.",
    "現在のルールを確認してから記録を復元します。古いキャッシュは再適用しません。",
    "Vérifiez les règles actuelles avant de restaurer les enregistrements. Le cache ne sera pas réappliqué."
  ],
  "恢复对应管理记录": [
    "Restore matching records",
    "対応する管理記録を復元",
    "Restaurer les enregistrements correspondants"
  ],
  "核对无误，恢复记录": [
    "Confirm and restore records",
    "確認して記録を復元",
    "Confirmer et restaurer"
  ],
  "仅补回下面的管理记录，不重载或改写当前分流。损坏原文保留在本机备份。": [
    "Only restores the records below, without reloading or changing routing. Damaged originals remain in local backups.",
    "下記の記録のみ復元し、現在のルールは再読み込み・変更しません。破損した原文はローカルに保存します。",
    "Restaure uniquement les enregistrements ci-dessous sans modifier le routage. Les originaux endommagés restent sauvegardés localement."
  ],
  "管理记录已恢复": [
    "Management records restored",
    "管理記録を復元しました",
    "Enregistrements restaurés"
  ],
  "恢复与诊断": [
    "Recovery & diagnostics",
    "復旧と診断",
    "Récupération et diagnostic"
  ],
  "已准备": [
    "Ready",
    "準備完了",
    "Prêt"
  ],
  "尚未准备": [
    "Not prepared",
    "未準備",
    "Non préparé"
  ],
  "恢复尚未确认，请运行网络自检或离线恢复。": [
    "Recovery is not confirmed. Run network checks or offline recovery.",
    "復旧を確認できていません。ネットワーク診断またはオフライン復旧を実行してください。",
    "La récupération n’est pas confirmée. Lancez le diagnostic réseau ou la récupération hors ligne."
  ],
  "最近操作耗时": [
    "Recent operation timings",
    "最近の処理時間",
    "Durée des opérations récentes"
  ],
  "阶段": [
    "Phase",
    "段階",
    "Étape"
  ],
  "耗时": [
    "Duration",
    "所要時間",
    "Durée"
  ],
  "恢复位置与数据保留": [
    "Recovery location & retention",
    "復旧先とデータ保持",
    "Emplacement et conservation"
  ],
  "最近 20 份状态备份和 20 个已结束事务保留在本机；待恢复或无法识别的事务不会自动删除。": [
    "Keeps the latest 20 state backups and 20 completed transactions locally. Pending recovery and unknown transactions are not deleted automatically.",
    "最新の状態バックアップ20件と完了した処理20件をローカルに保持します。復旧待ちや不明な処理は自動削除しません。",
    "Conserve localement 20 sauvegardes et 20 transactions terminées. Les transactions en attente ou non reconnues ne sont pas supprimées automatiquement."
  ],
  "导出脱敏诊断": [
    "Export redacted diagnostics",
    "匿名化した診断を出力",
    "Exporter un diagnostic anonymisé"
  ],
  "诊断文件已保存": [
    "Diagnostic file saved",
    "診断ファイルを保存しました",
    "Diagnostic enregistré"
  ],
  "仅包含状态、数量和阶段耗时，不包含应用名、节点名、路径、访问目标或配置。": [
    "Contains only status, counts and phase timings. Excludes app names, node names, paths, destinations and configuration.",
    "状態、件数、処理時間のみを含みます。アプリ名、ノード名、パス、アクセス先、設定は含みません。",
    "Contient uniquement les états, les nombres et les durées. Exclut les noms, chemins, destinations et configurations."
  ],
  "应用扫描": [
    "App scan",
    "アプリ検出",
    "Analyse des applications"
  ],
  "进程识别": [
    "Process discovery",
    "プロセス識別",
    "Identification des processus"
  ],
  "网络基线": [
    "Network baseline",
    "ネットワーク基準確認",
    "État réseau initial"
  ],
  "配置校验": [
    "Configuration validation",
    "設定の検証",
    "Validation de la configuration"
  ],
  "恢复工具": [
    "Recovery tools",
    "復旧ツール",
    "Outils de récupération"
  ],
  "规则写入": [
    "Writing rules",
    "ルールの書き込み",
    "Écriture des règles"
  ],
  "内核重载": [
    "Core reload",
    "コア再読み込み",
    "Rechargement du moteur"
  ],
  "网络复查": [
    "Network recheck",
    "ネットワーク再確認",
    "Nouvelle vérification réseau"
  ],
  "代理组选择或成员已变化，已停止重载。": [
    "Proxy group selection or members changed. Reload was stopped.",
    "プロキシグループの選択またはメンバーが変更されたため、再読み込みを中止しました。",
    "La sélection ou les membres du groupe proxy ont changé. Le rechargement a été arrêté."
  ],
  "代理组选择已变化，已停止重载。": [
    "Proxy group selection changed. Reload was stopped.",
    "プロキシグループの選択が変更されたため、再読み込みを中止しました。",
    "La sélection du groupe proxy a changé. Le rechargement a été arrêté."
  ],
  "本地管理记录需要核对。": [
    "Local management records need checking.",
    "ローカル管理記録の確認が必要です。",
    "Les enregistrements locaux doivent être vérifiés."
  ],
  "代理组已失效，请重新选择代理组；失效时的处理方式可在代理策略中查看。": [
    "The proxy group is unavailable. Select another group; see Proxy strategy for the failure behavior.",
    "プロキシグループが無効です。選び直してください。障害時の動作はプロキシ戦略で確認できます。",
    "Le groupe proxy est indisponible. Sélectionnez un autre groupe ; le comportement en cas de panne est indiqué dans la stratégie proxy."
  ]
}
