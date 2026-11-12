# Téléchargement et installation

Choisissez le fichier adapté à votre ordinateur. Node.js, Git et la compilation ne sont pas nécessaires pour utiliser l’application.

<!-- downloads:fr:start -->
**Préversion actuelle: [0.2.0-preview.2](https://github.com/Yueyuyu/app-route/releases/tag/v0.2.0-preview.2)**

| Votre ordinateur | Téléchargement | Taille | Vérification |
| --- | --- | --- | --- |
| Windows · Intel / AMD 64 bits | [Programme d’installation EXE](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-setup-x64.exe) | 140.8 MiB | [SHA-256](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-setup-x64.exe.sha256) |
| Mac · puce Apple (expérimental) | [DMG](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-arm64.dmg) | 155.0 MiB | [SHA-256](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-arm64.dmg.sha256) |
| Mac · Intel (expérimental) | [DMG](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-x64.dmg) | 161.6 MiB | [SHA-256](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-x64.dmg.sha256) |

Autres fichiers: [arm64 ZIP](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-arm64.zip) · [x64 ZIP](https://github.com/Yueyuyu/app-route/releases/download/v0.2.0-preview.2/AppRoute-0.2.0-preview.2-mac-x64.zip). Les ZIP Mac sont des archives de l’application ; Source code n’est pas un programme d’installation.

SHA-256 vérifie l’intégrité du fichier et ne remplace pas la signature de l’éditeur.
<!-- downloads:fr:end -->

<a id="support"></a>

## Périmètre vérifié

| Environnement | Validation |
| --- | --- |
| Windows x64 | Tests réels sous Windows 11 avec Clash Party 2.0.4 / Mihomo 1.19.32, mode Règles et TUN désactivé |
| Mac Apple silicon / Intel | Compilation native en CI et démarrage des paquets ; routage et restauration sur un vrai Mac non vérifiés |
| Autres clients, Windows ARM, Linux | Pas de prise en charge officielle |

Les redémarrages du client, l’aller-retour entre deux abonnements et la veille normale ont été contrôlés sous Windows. Coupure d’alimentation, transactions en attente pendant la veille, ensemble des permissions et régénération après actualisation distante réussie restent non vérifiés.

## Windows

1. Téléchargez l’installateur EXE ci-dessus et quittez complètement AppRoute.
2. Lancez l’installation pour l’utilisateur courant.
3. Ouvrez AppRoute depuis le Bureau ou le menu Démarrer, puis suivez les [premiers pas](quickstart.md).

Une fenêtre indépendante et une icône de zone de notification apparaissent. Fermer la fenêtre la masque ; le menu de cette icône permet de quitter.

## Mac (expérimental)

1. Consultez « À propos de ce Mac » : puce Apple M = arm64 ; Intel = x64.
2. Ouvrez le DMG correspondant, faites glisser AppRoute dans Applications et lancez-le depuis ce dossier.
3. Le ZIP est une archive de la même application. Conservez tout le paquet AppRoute.app après extraction.

Windows ne possède pas de signature d’éditeur. Mac utilise uniquement une signature ad-hoc, sans notarisation Developer ID. Si le système bloque le lancement, vérifiez la provenance et le message exact. Ne désactivez pas l’antivirus ni les protections globales. Une menace nommée exige une investigation ; [signalez-la](https://github.com/Yueyuyu/app-route/issues/new/choose).

## Vérifier le fichier

Téléchargez uniquement depuis les Releases de ce dépôt et comparez le résultat au fichier .sha256 correspondant.

Windows :

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath '.\AppRoute-VERSION-setup-x64.exe'
```

Mac :

```sh
shasum -a 256 AppRoute-VERSION-mac-arm64.dmg
```

Remplacez le nom par celui du téléchargement. Le résultat doit être identique. SHA-256 vérifie l’intégrité, pas l’identité de l’éditeur ni l’innocuité du logiciel. Les archives Source code ne sont pas des installateurs.

En cas de problème, consultez la [FAQ](faq.md). Pour une installation existante, lisez la [maintenance](maintenance.md).
