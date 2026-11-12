<p align="center"><img src="public/brand/app-route-lockup.png" width="400" alt="AppRoute" /></p>
<p align="center"><strong>Choisissez la connexion de chaque application, sans écrire de règles proxy.</strong></p>
<p align="center"><a href="README.md">简体中文</a> · <a href="README.en.md">English</a> · <a href="README.ja.md">日本語</a> · Français</p>
<p align="center"><a href="https://github.com/Yueyuyu/app-route/actions/workflows/ci.yml"><img src="https://github.com/Yueyuyu/app-route/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a> <img src="https://img.shields.io/badge/status-preview-orange" alt="Preview" /> <a href="LICENSE">MIT</a></p>

[Téléchargement](#téléchargement) · [Premiers pas](docs/guide/fr/quickstart.md) · [Documentation](https://yueyuyu.github.io/app-route/fr/) · [FAQ](docs/guide/fr/faq.md) · [Signaler un problème](https://github.com/Yueyuyu/app-route/issues/new/choose)

AppRoute détecte les applications et permet de choisir **Règles Clash, Connexion directe ou Suivre le groupe**, en distinguant les règles chargées des nouvelles connexions vérifiées. Il utilise votre installation existante de **Clash Party / Mihomo** et ne fournit ni nœuds ni abonnements.

> **Préversion Windows · version macOS expérimentale.** Sans signature d’éditeur, notarisation Apple ni mise à jour automatique. Le routage et la restauration sur un vrai Mac restent à vérifier. [Compatibilité et limites](docs/guide/fr/install.md#support)

## Téléchargement

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

L’environnement d’exécution est inclus. **Aucun Node.js, navigateur ou commande de compilation n’est nécessaire.** [Installation et vérification](docs/guide/fr/install.md)

## Découvrir l’interface

![Choisir la connexion des applications](docs/images/fr-applications.png)

Les captures utilisent l’interface Electron réelle et des données de démonstration isolées. Elles illustrent les interactions, pas une validation du trafic réel.

<details><summary>Stratégie, détails de connexion et autres pages</summary>

![Stratégie proxy](docs/images/fr-strategy.png)
![Détails de connexion](docs/images/fr-connection.png)
![Règles de routage](docs/images/fr-rules.png)
![Bibliothèque d’icônes](docs/images/fr-icons.png)
![À propos](docs/images/fr-about.png)

</details>

## Fonctions principales

- **Choisir par application** : détection réelle, recherche globale et filtres des applications configurées, en cours d’exécution ou favorites.
- **Appliquer en un clic** : les changements successifs sont mis en file et regroupés lorsque possible ; un contrôle échoué déclenche un retour arrière.
- **Suivre le groupe habituel** : les nouvelles connexions suivent les changements de nœud dans Clash Party.
- **Choisir une stratégie automatique** : groupe existant, secours par priorité ou latence, exécutés par Mihomo.
- **Restaurer hors ligne** : accès dans l’application et entrée indépendante, en conservant les abonnements et règles d’origine.
- **Utiliser une application de bureau** : zone de notification, icônes et quatre langues. Au premier lancement, la langue suit le système.

## Modes de connexion

| Option | Effet sur les nouvelles connexions identifiées et prises en charge |
| --- | --- |
| Règles Clash | Les règles existantes de Clash Party décident entre accès direct et proxy. |
| Connexion directe | Utilise DIRECT, sans nœud proxy distant. |
| Suivre le groupe | Utilise le choix ou la stratégie du groupe lié. DIRECT / REJECT signifient toujours accès direct / refus. |

Les connexions existantes ne sont pas forcées à changer. Le trafic hors de Clash n’est pas garanti par ces règles. AppRoute n’active pas TUN, ne modifie pas le proxy système et ne ferme pas d’autres VPN automatiquement.

## Première utilisation

1. Installez AppRoute et laissez votre Clash Party configuré fonctionner en mode Règles.
2. Ouvrez AppRoute et vérifiez l’indicateur de connexion en bas à gauche.
3. Recherchez une application et choisissez **Connexion directe**. Pour le proxy, liez d’abord votre groupe dans **Stratégie proxy**, puis choisissez **Suivre le groupe**.
4. Créez une nouvelle connexion dans l’application cible et consultez son état. Le statut bleu de règles prêtes ne valide pas tout le trafic.

Après le premier enregistrement de la surcharge, quittez et rouvrez Clash Party normalement, puis vérifiez que les règles sont conservées. [Guide détaillé](docs/guide/fr/quickstart.md)

## Guides par tâche

[QQ Music en accès direct](docs/guide/fr/direct.md) · [Suivre un groupe](docs/guide/fr/follow-group.md) · [Secours et latence](docs/guide/fr/strategies.md) · [Mettre à jour, désinstaller, restaurer](docs/guide/fr/maintenance.md)

En cas de problème réseau, utilisez **Restaurer le réseau**, ou **AppRoute - Restore Network** sur le bureau si l’application ne s’ouvre pas. Cette entrée est créée avant la première modification de règles. Elle désactive le routage propre à AppRoute ; elle ne réinitialise pas le réseau système et ne garantit pas la réparation d’autres logiciels. [Procédure](docs/guide/fr/maintenance.md#recovery)

## Développement et contribution

Les utilisateurs peuvent télécharger les programmes ci-dessus. La compilation depuis `main` est décrite dans le [guide de contribution](CONTRIBUTING.md), en chinois.

[Architecture](docs/ARCHITECTURE.md) · [Feuille de route](docs/ROADMAP.md) · [Vérification](docs/VERIFICATION.md) · [Traduction](docs/LOCALIZATION.md) · [Identité visuelle](docs/design/brand-lockup.md) · [Licences tierces](THIRD_PARTY_NOTICES.md). Les documents techniques sont en chinois.

L’inventaire, les icônes et les données de gestion restent sur votre appareil. Retirez abonnements, secrets, chemins personnels et journaux bruts avant de signaler un problème. Le code original est sous licence [MIT](LICENSE).
