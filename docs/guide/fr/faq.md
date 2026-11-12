# Questions fréquentes

## Pourquoi la règle est-elle prête mais non vérifiée ?

Chargement et observation sont distincts. Créez une nouvelle connexion et consultez les détails. Cache, anciennes connexions et trafic extérieur à Clash ne constituent pas une nouvelle vérification. Voir les [premiers pas](quickstart.md).

## Que signifient Configurées, En cours et Toutes ?

Configurées rassemble les applications avec un routage dédié ; En cours repose sur les processus détectés ; Toutes correspond à l’inventaire analysé. Les favoris sont un filtre indépendant, pas une preuve de configuration. La recherche couvre tout l’inventaire, avec les autres filtres de catégorie et de mode.

## Comment apparaît une nouvelle application ?

AppRoute vérifie périodiquement les changements. Relancez l’analyse pour accélérer la découverte ou ajoutez manuellement une application non reconnue. Les applications portables, du magasin et les composants partagés ne sont pas tous garantis.

## Pourquoi l’indicateur est-il vert alors qu’un site échoue ?

Il confirme l’accès à l’API de contrôle, pas la disponibilité du nœud ou du site. Vérifiez le nœud sélectionné, la route observée et l’heure du dernier diagnostic.

## Que se passe-t-il si Clash Party est fermé ?

AppRoute ne remplace pas un moteur arrêté. Un proxy système dirigé vers un port arrêté peut bloquer le réseau. Rouvrez Clash Party normalement et vérifiez son état de proxy système. La restauration AppRoute se limite à ses propres règles.

## Pourquoi un raccourci ouvre-t-il ses propriétés ?

C’est généralement distinct du routage : Windows utilise Alt + double-clic pour les propriétés. Appuyez puis relâchez chaque touche Alt et réessayez. Si cela revient, fournissez des étapes reproductibles sans présumer de la cause.

## Installation bloquée ou fenêtre absente ?

Windows n’est pas signé et Mac n’est pas notarisé. Vérifiez la [provenance et le hash](install.md), notez l’avertissement exact et faites examiner les détections nommées. Ne désactivez pas la protection et ne supposez pas un faux positif. Sans avertissement, vérifiez si le démarrage se poursuit, puis [signalez version et symptômes](https://github.com/Yueyuyu/app-route/issues/new/choose).

## Autres clients, mise à jour automatique ou version portable ?

Clash Party est la cible actuelle. Les autres clients ne sont pas validés ; il n’y a ni mise à jour automatique ni version portable Windows vérifiée. Le ZIP Mac est simplement une archive de l’application.

## Comment retrouver mes règles initiales ?

Pour une application, revenez aux règles Clash. Pour toutes les règles AppRoute, utilisez la [restauration](maintenance.md#recovery). Les règles originales sont conservées.
