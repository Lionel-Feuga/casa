# Casa : cahier des charges

Version 1.3, 27 octobre 2026. Rédigé à partir des échanges avec Lionel.
Destiné à être placé à la racine du dépôt et lu par Claude Code avant chaque étape.

- Maquettes de référence (tous les écrans) : https://claude.ai/artifact/9jZ26sRdqNxBZKyE18Et7D
  Non maquettés, à dessiner dans le même style : détail d'une catégorie de budget, liste « Mes dépenses perso », gestion des catégories et des plafonds, formulaires de tâche et de facture, feuille « Marquer payé », étiquette « Perso » sur une facture.
- Direction artistique : voir la section 9 et le fichier `DA-retenue-marche-pop.md`

---

## 1. Vision

Casa est une petite application web installable (PWA) pour gérer l'appartement de **Lionel** et **Jaz**. Elle tourne sur Android et iPhone, en **français uniquement**, et se synchronise **en temps réel** entre les deux téléphones.

Ton visuel : beau, chaleureux, coloré, ludique (direction « Marché pop »). Pas minimaliste.

### Modules

| Module | Rôle |
|---|---|
| Courses | Page d'accueil. Liste de courses partagée, suggestions, mode plein écran en magasin |
| Comptes | Dépenses communes, répartition fixe 60/40, solde net après compensation |
| Budgets | Suivi mensuel par catégorie, vue Commun et vue Perso |
| À faire | Tâches de l'appartement |
| À payer | Factures à venir, récurrentes ou ponctuelles |

### Hors périmètre (à ne pas faire)

- Pas de notifications (ni push, ni e-mail).
- Pas de rotation automatique des tâches ménagères.
- Pas de messages de félicitations, d'encouragement ou de gamification.
- Pas de comptes utilisateurs, ni d'e-mail, ni de mot de passe individuel.
- Pas d'autre langue que le français.
- Pas de rayons ni de catégories dans la liste de courses.

---

## 2. Utilisateurs, accès et profils

### 2.1 Code d'accès commun

- Au tout premier lancement sur un téléphone, l'appli demande un **code à 6 chiffres** commun au foyer.
- Le code est **vérifié par le serveur**. Il n'est jamais stocké en clair : le serveur ne connaît que son empreinte (variable d'environnement `ACCESS_CODE_HASH`, bcrypt ou argon2).
- Le code **ne se change pas depuis l'application**. Pour le changer, on modifie la variable d'environnement côté serveur.
- Si le code est bon, le serveur renvoie un **jeton d'appareil** (aléatoire, long, stocké dans la collection `devices`). Le téléphone le garde dans `localStorage` et l'envoie avec chaque requête API.
- Sans jeton valide, toute l'API répond 401 (y compris la route qui délivre l'accès au temps réel) et l'appli revient à l'écran du code.
- Protection contre les essais : 5 codes faux de suite depuis une même adresse IP bloquent les essais pendant 15 minutes. Les essais sont comptés dans la collection `login_attempts` (index TTL), car les fonctions Vercel ne gardent pas de mémoire entre deux appels.
- Pavé numérique dessiné dans l'appli (gros boutons), 6 ronds qui se remplissent.

### 2.2 Choix du profil

- Juste après le code : écran « C'est qui ? » avec deux grandes cartes, **Lionel** (bleu) et **Jaz** (rose).
- Le choix est mémorisé sur le téléphone (`localStorage`) et envoyé au serveur avec chaque action (champ `by`).
- Toucher son avatar (en haut à droite de chaque écran) ouvre un petit menu : changer de profil, thème, gérer les catégories, gérer les budgets.
- À savoir : le profil est une convention, pas une sécurité. Il sert à afficher « qui a ajouté quoi » et à filtrer la vue perso.

### 2.3 Présence

- Quand l'autre personne a l'appli ouverte, on affiche « Jaz est en ligne » (ou « Lionel est en ligne ») avec un point rose qui pulse.
- Basé sur la présence du service temps réel (section 10.6).

---

## 3. Module Courses (page d'accueil)

### 3.1 Liste

- Une **seule liste**, sans catégories ni rayons, dans l'ordre choisi à la main.
- Chaque article affiche : une poignée de déplacement, une case à cocher, le nom, et une pastille de qui l'a ajouté (« L » bleu, « J » rose).
- Pas de quantité séparée : si besoin, on l'écrit dans le nom (« Œufs x12 »).
- En-tête : « N articles · M cochés » et le bouton **Vider le panier** (visible seulement s'il y a des articles cochés).
- **Supprimer un seul article** : glisser l'article vers la gauche fait apparaître un bouton rose « Supprimer ». Pas de confirmation, mais un bandeau « Article supprimé · Annuler » pendant 3 secondes.
- **Renommer** : pas prévu. On supprime et on rajoute.

### 3.2 Ajouter un article

- Champ « Ajouter un article… » en haut. On tape le nom, on valide (bouton « Ajouter » ou touche Entrée), l'article s'ajoute **en bas de la liste**.
- Le champ reste ouvert après l'ajout pour enchaîner.
- Nom vide ou seulement des espaces : rien ne se passe.
- Doublon : si un article au nom normalisé identique est déjà dans la liste et non coché, il n'est pas ajouté une seconde fois. L'article existant clignote brièvement. S'il est coché, il est décoché et reste à sa place.

### 3.3 Suggestions

- Pendant la saisie, une liste de suggestions s'affiche sous le champ (5 maximum).
- Source : l'**historique commun** de tous les articles déjà ajoutés par Lionel ou Jaz (collection `item_history`).
- Filtre : les suggestions dont le nom **commence par** le texte tapé.
- Tri : par **nombre de fois ajouté**, du plus fréquent au moins fréquent, puis par date du dernier ajout. Exemple : « to » avec 25× Tomates et 2× Tortillas affiche Tomates avant Tortillas.
- Comparaison sans accents, sans majuscules, espaces en trop retirés, « œ » traité comme « oe » et « æ » comme « ae ». « oeu » trouve « Œufs ».
- Les articles déjà présents et non cochés dans la liste ne sont pas suggérés.
- Toucher une suggestion ajoute directement l'article.
- Chaque ajout (tapé ou suggéré) incrémente le compteur de l'historique. Le nom affiché retenu est celui du dernier ajout.
- Une suggestion indésirable (faute de frappe par exemple) se retire par un appui long sur la suggestion puis « Retirer des suggestions ».

### 3.4 Réordonner

- **Appui long** sur un article (environ 250 ms) pour le soulever, puis glisser à la nouvelle place. L'article soulevé penche légèrement avec une ombre rose, et un emplacement en pointillés montre où il va tomber.
- La poignée permet aussi de glisser sans appui long.
- Le défilement de la liste doit rester possible au doigt (pas de conflit avec le glisser).
- L'ordre est partagé : il se met à jour en direct sur l'autre téléphone.
- Technique conseillée : `@dnd-kit` avec capteur tactile à délai, et une position stockée en **index fractionnaire** (chaîne triable, par exemple avec `fractional-indexing`) pour ne modifier qu'un seul document par déplacement.

### 3.5 Cocher et vider

- Toucher un article le coche : la case se « tamponne » en rose et un trait de feutre rose barre le nom.
- Toucher à nouveau le décoche.
- Les articles cochés **restent à leur place, barrés**, y compris après le mode magasin.
- **Vider le panier** supprime tous les articles cochés, après une confirmation dessinée dans l'appli (pas de `confirm()` du navigateur). L'historique des suggestions est conservé.

### 3.6 Mode magasin (plein écran)

- Bouton flottant « Mode magasin » sur la liste.
- Fond encre, textes très gros (environ 21 px), cases de 38 px, même ordre que la liste.
- Les articles cochés restent visibles, atténués et barrés.
- En haut : bouton fermer, titre, compteur « N restants », barre de progression.
- L'écran reste allumé (API Wake Lock). Si le téléphone ne la prend pas en charge, on ignore sans message d'erreur.
- Un article ajouté par l'autre pendant les courses apparaît en direct avec l'étiquette « Ajouté par Jaz à l'instant ».
- Bouton « Quitter le mode magasin » en bas.

### 3.7 Ticket en sortie du mode magasin

- En quittant le mode magasin, **si au moins un article a été coché pendant la session**, une feuille s'ouvre : « Enregistrer le ticket ? ».
- Champs : montant (clavier numérique), payé par (Lionel / Jaz, le profil actuel par défaut), pour (Tous les deux par défaut / Juste moi). La catégorie est Courses par défaut et modifiable.
- Avec « Juste moi », « Payé par » est masqué (dépense perso du profil actuel).
- « Enregistrer » crée une dépense (source `ticket`). « Pas maintenant » ferme sans rien créer.
- Rappel affiché : les articles cochés restent barrés jusqu'à « Vider le panier ».

---

## 4. Catégories (communes aux dépenses et aux budgets)

- Une seule liste de catégories pour tout le monde.
- Catégories par défaut : **Courses, Restaurants, Sorties, Divertissements, Maison, Factures, Divers**.
- **+ Autre** dans le formulaire de dépense permet de taper un nom libre : cela **crée une nouvelle catégorie réutilisable**, qui apparaît ensuite partout.
- Une catégorie créée peut être **supprimée** (depuis la gestion des catégories). Ses dépenses passent alors dans **Divers** et ses plafonds de budget sont supprimés.
- Les catégories par défaut ne se suppriment pas. Divers ne peut jamais être supprimée.
- Pas de doublon : une nouvelle catégorie dont le nom normalisé existe déjà réutilise l'existante.
- Icônes : Courses = panier, Restaurants = couverts, Sorties = ticket, Divertissements = manette, Maison = maison, Factures = éclair, Divers = boîte. Une catégorie créée reçoit l'icône étiquette.

---

## 5. Module Comptes

### 5.1 Dépenses

Une dépense a : un montant, un libellé (« Quoi »), une catégorie, une date (aujourd'hui par défaut), qui a payé, et pour qui elle est.

- **Pour « Tous les deux »** (commune) : partagée **60 % Lionel / 40 % Jaz**, de façon fixe.
- **Pour « Juste moi »** (perso) : elle ne concerne que la personne qui l'a payée. Elle n'apparaît pas dans Comptes et ne crée aucune dette.
- Formulaire « Nouvelle dépense » (depuis le bouton « + Dépense » de Comptes) : montant en grand, Quoi, Catégorie (pastilles + Autre), Pour (Tous les deux / Juste moi), Payé par (Lionel / Jaz), Date. En bas, un aperçu : « Commune, 60 / 40 : Lionel 27,48 € · Jaz 18,32 €. Jaz devra 18,32 € à Lionel. »
- On peut modifier ou supprimer une dépense (confirmation dans l'appli). Les deux profils peuvent modifier les dépenses communes. Une dépense perso ne peut être vue et modifiée que par son propriétaire.
- Le bouton « + Dépense » existe aussi sur l'écran Budgets, pour saisir facilement une dépense perso.
- Avec « Juste moi », le champ « Payé par » est masqué : la dépense appartient au profil actuel.
- Montant : clavier numérique, virgule française, 2 décimales maximum, strictement positif, 99 999,99 € maximum. Libellé obligatoire (60 caractères maximum).
- La date peut être dans le passé (la dépense compte alors dans le budget du mois de cette date).

### 5.2 Calcul des dettes

Tous les montants sont stockés en **centimes entiers**.

Pour une dépense commune de montant `A` centimes :
- part de Jaz = `round(A × 0,40)`
- part de Lionel = `A − part de Jaz` (pour que la somme fasse toujours exactement `A`)

Dettes créées :
- payée par **Lionel** : Jaz doit à Lionel sa part (40 %).
- payée par **Jaz** : Lionel doit à Jaz sa part (60 %).
- payée par **les deux** (chacun a payé sa part, cas des factures) : **aucune dette**.

### 5.3 Solde net (compensation)

```
duParJaz    = somme des parts de Jaz sur les dépenses communes payées par Lionel
duParLionel = somme des parts de Lionel sur les dépenses communes payées par Jaz
solde       = duParJaz − duParLionel − (règlements de Jaz vers Lionel) + (règlements de Lionel vers Jaz)
```

- `solde > 0` : « Jaz doit à Lionel X € ». `solde < 0` : « Lionel doit à Jaz X € ». `solde = 0` : « Vous êtes quittes ».
- Le solde est calculé sur **tout l'historique**, pas par mois.
- Sous le montant : le détail « 81,72 € dus par Jaz − 61,19 € dus par Lionel » (depuis le dernier règlement).

### 5.4 Régler

- Le bouton **Régler** enregistre un règlement du montant du solde, de la personne qui doit vers l'autre, à la date du jour. Le solde revient à zéro.
- Confirmation dans l'appli avant d'enregistrer. Un règlement peut être annulé (supprimé).
- Pas de remboursement partiel : on règle toujours le solde entier.
- Les règlements apparaissent dans la liste des Comptes, avec une icône à part (« Jaz a remboursé 20,53 € à Lionel »).

### 5.5 Écran

- Carte du solde, barre de répartition fixe « Lionel 60 % / Jaz 40 % ».
- Liste « Dernières dépenses communes » avec icône de catégorie, libellé, « payé par X · date », montant et la part de l'autre.
- Les dépenses perso n'apparaissent pas ici.
- La liste affiche le mois en cours, avec « Voir les mois précédents » en bas.
- Toucher une dépense ouvre le formulaire en modification.

---

## 6. Module Budgets

### 6.1 Deux vues

- Une bascule en haut : **Commun** | **Mon perso**. Le dernier choix est mémorisé sur le téléphone.
- Chacun voit le Commun et **son propre perso**, jamais le perso de l'autre.
- Mois en cours par défaut (calendrier, fuseau Europe/Paris), avec « encore N jours ». Flèches pour consulter les mois précédents.
- Les budgets repartent de zéro le 1er de chaque mois. Les plafonds sont les mêmes chaque mois tant qu'on ne les change pas.

### 6.2 Calculs (pour un mois donné)

- **Commun**, par catégorie : somme des montants **entiers** des dépenses communes (quel que soit le payeur, y compris « les deux »).
- **Perso de Lionel**, par catégorie : 60 % de chaque dépense commune (sa part, calculée comme en 5.2) + ses dépenses perso.
- **Perso de Jaz**, par catégorie : 40 % de chaque dépense commune + ses dépenses perso.
- La carte du haut du perso affiche le total et le détail « Ma part des dépenses communes (X €) + mes dépenses perso (Y €) ».
- Chaque catégorie du perso affiche une ligne de détail : « 100 % part commune » ou « dont 25 € perso ».

### 6.3 Plafonds

- Chaque catégorie peut avoir un plafond mensuel, **ou aucun** (« sans plafond » : on affiche seulement le montant dépensé, sans barre).
- Les plafonds du Commun et du perso de chacun sont indépendants.
- Avec plafond : barre de progression turquoise. Dépassement : barre rose rayée et « X € au-dessus du budget ». Aucune alerte, aucun message.
- Écran de gestion des plafonds accessible depuis le menu de l'avatar : liste des catégories, champ montant ou « sans plafond », pour la vue choisie.
- Au départ, aucune catégorie n'a de plafond.

### 6.4 Détail d'une catégorie

- Toucher une catégorie ouvre la liste de ses dépenses du mois pour la vue affichée.
- Vue Commun : les dépenses communes, montant entier.
- Vue Mon perso : ma part de chaque dépense commune (avec la mention « part commune ») et mes dépenses perso.

### 6.5 Mes dépenses perso

- Dans la vue **Mon perso**, un bouton « Mes dépenses perso » sous la carte du total ouvre une **liste à part** de toutes mes dépenses perso (toutes catégories), du mois affiché, de la plus récente à la plus ancienne.
- Chaque ligne : icône de catégorie, libellé, catégorie et date, montant. Total du mois en haut.
- Flèches pour changer de mois. Toucher une dépense ouvre le formulaire pour la modifier ou la supprimer.
- On y trouve aussi les dépenses perso créées par un ticket ou une facture perso.
- Visible uniquement par son propriétaire.

---

## 7. Module À faire

- Ajouter une tâche : titre, pour qui (**Lionel, Jaz ou les deux**), date facultative.
- Filtres en pastilles : Tout, Lionel, Jaz, Les deux.
- Sections : « Cette semaine » (tâches avec une date dans les 7 prochains jours ou en retard), « Plus tard » (date au-delà), « Quand on peut » (sans date), « Fait cette semaine ».
- Cocher une tâche : même animation que les courses. On enregistre qui l'a faite et quand.
- Une tâche faite reste visible **7 jours** (« fait hier par Jaz · visible encore 6 j »), puis disparaît. Technique : champ `expireAt = doneAt + 7 jours` avec un index TTL MongoDB. Décocher retire `expireAt`.
- Modifier et supprimer une tâche (confirmation dans l'appli).
- Pas de rotation automatique, pas de félicitations.

---

## 8. Module À payer

### 8.1 Factures

- Une facture a : un libellé, un montant prévu, une catégorie (**Factures** par défaut), une date d'échéance, un type, et une portée.
- Deux types : **récurrente** (chaque mois ou chaque année) et **ponctuelle** (une fois).
- Deux portées :
  - **Commune** (loyer, électricité, internet…) : visible par les deux.
  - **Perso** : visible **uniquement par son propriétaire** (la personne qui l'a créée), comme ses dépenses perso.
- Formulaire : libellé, montant, catégorie, échéance, type (et fréquence), Pour (Tous les deux / Juste moi).
- Carte du haut : « Reste à payer d'ici le 31 octobre » = somme des factures non payées visibles par la personne (communes + ses perso) dont l'échéance est avant la fin du mois en cours, y compris celles en retard.
- Sections : « À venir en [mois] », puis le mois suivant, puis « Payé ce mois ».
- Une facture perso porte une petite étiquette « Perso ».
- Une facture en retard s'affiche avec l'étiquette rose « En retard ».
- Bouton flottant « Ajouter ». On peut modifier ou supprimer une facture.

### 8.2 Marquer payé

- Le bouton **Marquer payé** ouvre une petite feuille : montant (prérempli avec le montant prévu, modifiable car une facture d'électricité varie) et date (aujourd'hui).
- **Facture commune** : la feuille demande aussi **« Qui a payé ? » : Lionel, Jaz ou les deux**. Cela crée automatiquement une **dépense commune** dans la catégorie de la facture (source `bill`, lien vers la facture) :
  - payée par **Lionel** : Jaz doit 40 %.
  - payée par **Jaz** : Lionel doit 60 %.
  - payée par **les deux** : chacun a payé sa part. La dépense entre dans le budget Commun (montant entier) et dans le perso de chacun (60 % et 40 %), **sans créer de dette** dans Comptes.
- **Facture perso** : pas de question. Cela crée une **dépense perso** de son propriétaire. Elle n'apparaît que dans son budget perso, jamais dans le Commun ni dans Comptes.
- Facture **récurrente** : l'échéance avance d'un mois (ou d'un an). Si le jour n'existe pas (31 → février), on prend le dernier jour du mois, et le mois suivant on revient au jour d'origine (on garde le jour d'origine dans `dayOfMonth`). Elle apparaît dans « Payé ce mois » grâce à la dépense créée.
- Facture **ponctuelle** : elle passe dans « Payé ce mois », puis disparaît le mois suivant.
- Supprimer la dépense créée remet la facture dans son état précédent (échéance d'origine).

---

## 9. Direction artistique « Marché pop »

Référence complète : `DA-retenue-marche-pop.md` et les maquettes. Résumé pour l'implémentation :

### Couleurs : six thèmes au choix

Le style Marché pop se décline en **six thèmes de couleurs**. Toutes les couleurs passent par des tokens CSS, et un thème ne fait que redéfinir ces tokens (attribut `data-theme` sur `<html>`). Les formes, typos et animations ne changent jamais.

| Token | Rôle |
|---|---|
| `--y` | Fond principal |
| `--ink` | Textes, contours, ombres, fond du mode magasin |
| `--pk` | Accent : cases cochées, ombre des titres, onglet actif, couleur de **Jaz** |
| `--tl` | Couleur secondaire (bouton « + Dépense », barres de budget) |
| `--bl` | Couleur de **Lionel** |
| `--soft` | Fond d'un élément coché |
| `--on` | Texte posé sur `--pk` |
| `--ontl` | Texte posé sur `--tl` |
| `--wh` | Cartes (toujours `#FFFFFF`) |

| Thème (`data-theme`) | `--y` | `--ink` | `--pk` | `--tl` | `--bl` | `--soft` | `--on` | `--ontl` |
|---|---|---|---|---|---|---|---|---|
| `original` (par défaut) | `#FFE14D` | `#1B1B3A` | `#FF4F8B` | `#00A79F` | `#3D5AFE` | `#FFF6BF` | `#FFFFFF` | `#FFFFFF` |
| `piscine` | `#5CC8FF` | `#0B1E3F` | `#FF5DA2` | `#FFC93C` | `#1B3BD1` | `#E3F5FF` | `#FFFFFF` | `#0B1E3F` |
| `pistache` | `#C6E77A` | `#1D2A10` | `#E8336D` | `#6A4BDB` | `#2546E0` | `#F3FADB` | `#FFFFFF` | `#FFFFFF` |
| `lagon` | `#2EC4B6` | `#0E2233` | `#FF9F1C` | `#FFE14D` | `#2340D9` | `#E2F8F5` | `#0E2233` | `#0E2233` |
| `cerise` | `#FF8FB3` | `#2A0F2A` | `#FFE14D` | `#00A79F` | `#2340D9` | `#FFE8F0` | `#2A0F2A` | `#FFFFFF` |
| `agrume` | `#FFA62B` | `#241300` | `#2E5BFF` | `#2BB673` | `#7A1FA2` | `#FFF0DC` | `#FFFFFF` | `#FFFFFF` |

Noms affichés : Original, Piscine, Pistache & framboise, Lagon & mangue, Bonbon cerise, Agrume.

La couleur de Lionel (`--bl`) et celle de Jaz (`--pk`) suivent le thème (par exemple, dans Agrume, Jaz est bleu roi et Lionel violet).

### Choix du thème

- Menu de l'avatar → **Thème** : une feuille avec les six thèmes en vignettes (mini aperçu du fond et de l'accent, nom, coche sur le thème actif).
- Le changement est **immédiat**, sans recharger, avec un fondu court des couleurs (200 ms, désactivé si `prefers-reduced-motion`).
- Le choix est **mémorisé sur le téléphone** (`localStorage`) : Lionel et Jaz peuvent avoir chacun le leur. Il n'est pas synchronisé.
- Le thème est appliqué avant le premier affichage (petit script en tête de page) pour éviter un flash de l'ancien thème.
- La `theme-color` du navigateur (barre d'état Android) suit `--y`.
- Maquette interactive du sélecteur : https://claude.ai/artifact/WPLbk2LttzzPx9foSUsyp1

### Typographies (Google Fonts)

- Titres : **Bagel Fat One**, avec une ombre rose décalée de 3 px (`text-shadow: 3px 3px 0 var(--pk)`).
- Texte : **Figtree** (600 à 800).
- Montants : chiffres tabulaires.

### Formes

- Contours de 2,5 px couleur encre, rayons de 12 à 14 px.
- Ombres pleines décalées (3 à 6 px, encre ou rose), sans flou.
- Étiquettes de section inclinées (±2°), façon ruban adhésif.
- Trame de points roses en décor en haut à droite des écrans.
- Barre d'onglets blanche en bas, onglet actif rose avec contour.

### Nom et icône de l'appli

Nom affiché « Casa ». Icône : une petite maison encre sur fond jaune, avec l'ombre rose décalée. Couleur du manifeste : `#FFE14D` (thème Original).

### Icônes

Trait épais (2,6), bouts arrondis, sur des pastilles de couleur. Jeu d'icônes cohérent (par exemple Lucide ou Phosphor en style « bold »), jamais d'emoji.

### Micro-animations

- Case cochée : tampon rose avec une petite rotation (-10°) et un rebond.
- Article barré par un trait de feutre rose qui se dessine de gauche à droite.
- Boutons et cartes qui s'enfoncent dans leur ombre à l'appui.
- Point « en ligne » qui pulse.
- Tout est désactivé si `prefers-reduced-motion` est actif.

### Règles d'interface

- Chaque liste garde une **marge en bas** suffisante (environ 150 px) pour qu'un bouton flottant ou la barre d'onglets ne cache jamais le dernier élément.
- Cibles tactiles d'au moins 44 px.
- Respect des zones sûres de l'iPhone (`env(safe-area-inset-*)`).
- Toutes les confirmations sont dessinées dans l'appli (feuille du bas), jamais `alert()` ou `confirm()`.

---

## 10. Architecture technique

### 10.1 Vue d'ensemble

```
Téléphones (PWA Next.js)
   │  HTTPS (routes API Next.js)            │  WebSocket (abonnement)
   ▼                                        ▼
Vercel (fonctions serverless)  ──publie──▶  Service temps réel (Ably, offre gratuite)
   │
   ▼
MongoDB Atlas (offre gratuite M0)
```

- **Tout est gratuit** : Vercel Hobby, MongoDB Atlas M0, offre gratuite du service temps réel. Un usage à deux reste très loin des limites.
- **Next.js (App Router) en un seul projet** pour l'appli et l'API : un seul dépôt, un seul déploiement Vercel, des types partagés naturellement. Pas besoin d'un backend séparé.
- On ne met jamais l'URI MongoDB dans le téléphone : toutes les lectures et écritures passent par les routes API (`app/api/...`), qui tournent côté serveur.

### 10.2 Pourquoi un service temps réel externe

- Les fonctions Vercel sont **éphémères** : elles ne peuvent pas garder des WebSockets ouverts. Socket.IO ou un serveur Node permanent ne fonctionnent donc pas sur Vercel.
- Solution : après chaque écriture dans MongoDB, la route API **publie un petit message** sur un service temps réel hébergé. Les téléphones y sont abonnés et rechargent ce qui a changé.
- Choix proposé : **Ably** (offre gratuite, gère aussi la **présence** « Jaz est en ligne » nativement). Alternative équivalente : **Pusher Channels** (offre gratuite « Sandbox »). Vérifier les limites gratuites actuelles au moment de créer le compte.
- Sécurité : le téléphone ne reçoit jamais la clé secrète Ably. Il obtient un **jeton Ably temporaire** via la route `/api/realtime/token`, qui n'en délivre qu'aux appareils ayant un jeton d'accès Casa valide. Le jeton n'autorise que l'abonnement et la présence sur le canal `casa` (la publication reste réservée au serveur).
- Repli : si le service temps réel est indisponible, l'appli recharge les données de l'écran toutes les 15 secondes tant qu'elle est au premier plan.

### 10.3 Pile proposée

| Partie | Choix |
|---|---|
| Langage | TypeScript partout |
| Framework | Next.js (App Router), déployé sur Vercel |
| PWA | `@serwist/next` (service worker, cache de l'appli) + `app/manifest.ts` |
| Glisser-déposer | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Ordre de la liste | `fractional-indexing` |
| Base | pilote officiel `mongodb` |
| Temps réel | `ably` (SDK serveur pour publier, SDK client pour s'abonner) |
| Validation | `zod` |
| Données côté client | TanStack Query (cache, mises à jour optimistes, rechargement à la reconnexion) |
| Tests | Vitest (au minimum pour tous les calculs d'argent) |

Organisation du dépôt :

```
/app            pages et routes API (app/api/...)
/components     composants d'interface
/lib/db         connexion MongoDB (client mis en cache), accès aux collections
/lib/domain     fonctions de calcul pures : dettes, solde, budgets, normalisation, récurrence
/lib/realtime   publication et abonnement Ably
/lib/auth       vérification du code, jetons d'appareil
/styles         tokens de la DA
```

Les fonctions de `/lib/domain` (sections 3.3, 5.2, 5.3, 6.2, 8.2) sont pures et couvertes par des tests unitaires.

### 10.4 Points d'attention Vercel et MongoDB

- **Connexion MongoDB** : créer le `MongoClient` une seule fois et le garder dans une variable globale réutilisée entre les appels (modèle officiel « MongoDB + Next.js »). Sinon chaque appel ouvre une connexion et on atteint vite la limite de l'offre M0.
- **Accès réseau Atlas** : les adresses IP de Vercel changent, il faut autoriser `0.0.0.0/0` dans Atlas. La protection repose alors sur un utilisateur de base dédié avec un mot de passe long.
- **Démarrage à froid** : le premier appel après une pause peut prendre une à deux secondes. Pour que la liste s'affiche quand même tout de suite, elle est gardée en cache sur le téléphone et affichée immédiatement, puis rafraîchie.
- **Région** : choisir la même région européenne pour Atlas et pour les fonctions Vercel (par exemple Paris ou Francfort).
- **Usage** : Vercel Hobby est réservé à un usage personnel non commercial, ce qui correspond.
- **Pas de tâche planifiée nécessaire** : les récurrences avancent au moment du paiement et l'expiration des tâches passe par un index TTL MongoDB.

### 10.5 Variables d'environnement (Vercel)

```
MONGODB_URI=           # chaîne de connexion Atlas
MONGODB_DB=casa
ACCESS_CODE_HASH=      # empreinte bcrypt du code à 6 chiffres
ABLY_API_KEY=          # clé serveur Ably (jamais exposée au client)
```

Ajouter un script `scripts/hash-code.ts` qui prend un code et affiche son empreinte, et un script `scripts/seed.ts` qui crée les index et les catégories par défaut.

### 10.6 Temps réel

- Un seul canal `casa`. Après chaque écriture, la route API publie un message court : `{ type: "shopping" | "history" | "expenses" | "settlements" | "categories" | "budgets" | "tasks" | "bills", by: Profile }`.
- Le téléphone qui reçoit le message invalide les requêtes concernées (TanStack Query) et recharge. Le message ne contient aucune donnée privée, donc une dépense perso ne fuit pas vers l'autre téléphone.
- Les changements faits sur son propre téléphone sont appliqués **de façon optimiste** (affichage immédiat), puis confirmés par la réponse de l'API.
- Présence : chaque téléphone entre dans la présence du canal avec son profil. « Jaz est en ligne » s'affiche si Jaz est présente.
- À la reconnexion (téléphone sorti de veille, réseau revenu), l'appli recharge les données de l'écran affiché.
- Objectif : un changement visible sur l'autre téléphone en moins de 2 secondes.

### 10.7 Hors ligne

- L'appli s'ouvre même sans réseau (cache de l'appli par le service worker) et affiche les dernières données connues.
- **Recommandé pour les Courses** : cocher, décocher et ajouter un article sans réseau, avec une file d'attente locale (IndexedDB) rejouée au retour du réseau. Le réseau est souvent mauvais dans les magasins.
- Pour les autres modules : les boutons d'écriture sont désactivés hors ligne, avec un petit bandeau « Hors ligne ».

### 10.8 iPhone

- Installation : Safari → Partager → « Sur l'écran d'accueil ». Prévoir un petit encart d'aide la première fois, sur iPhone uniquement, quand l'appli n'est pas encore installée.
- Le `localStorage` d'une PWA installée est séparé de celui de Safari : il faudra entrer le code une fois dans l'appli installée.
- Wake Lock : récent sur iOS, toujours prévoir le cas où il n'est pas disponible.

### 10.9 Ordinateur

- L'appli est pensée pour le téléphone. Sur un écran large, elle s'affiche centrée dans une colonne de 480 px maximum.

---

## 11. Modèle de données MongoDB

Tous les montants en **centimes entiers** (`amountCents`). Une seule base `casa`. Toutes les dates en UTC, affichées en heure de Paris. Les profils valent `"lionel"` ou `"jaz"`.

### `devices`
```ts
{ _id, tokenHash: string /* empreinte SHA-256 du jeton, index unique */, createdAt: Date, lastSeenAt: Date }
```

### `login_attempts`
```ts
{ _id, ip: string /* index */, failures: number, lockedUntil?: Date,
  expireAt: Date /* index TTL */ }
```

### `shopping_items`
```ts
{ _id, name: string, position: string /* index fractionnaire, index */,
  checked: boolean, checkedAt?: Date, checkedBy?: Profile,
  addedBy: Profile, createdAt: Date }
```

### `item_history` (suggestions)
```ts
{ _id, key: string /* nom normalisé, index unique */, label: string,
  count: number, lastAddedAt: Date, hidden: boolean /* retiré des suggestions */ }
```

### `categories`
```ts
{ _id, name: string, key: string /* nom normalisé, index unique */,
  isDefault: boolean, createdAt: Date }
```

### `expenses`
```ts
{ _id, label: string, amountCents: number, categoryId: ObjectId,
  scope: "shared" | "personal",
  paidBy: "lionel" | "jaz" | "both",   // "both" seulement si scope = "shared"
  owner?: Profile,                      // pour scope = "personal" : la personne concernée
  date: Date,
  source: "manual" | "ticket" | "bill", billId?: ObjectId,
  createdBy: Profile, createdAt: Date, updatedAt: Date }
```
Index : `{ date: -1 }`, `{ categoryId: 1, date: -1 }`, `{ scope: 1, date: -1 }`.

### `settlements` (règlements)
```ts
{ _id, from: Profile, to: Profile, amountCents: number, date: Date, createdBy: Profile }
```

### `budgets` (plafonds)
```ts
{ _id, categoryId: ObjectId, view: "shared" | "lionel" | "jaz",
  monthlyLimitCents: number | null }
```
Index unique : `{ categoryId: 1, view: 1 }`.

### `tasks`
```ts
{ _id, title: string, assignee: "lionel" | "jaz" | "both", dueDate?: Date,
  done: boolean, doneAt?: Date, doneBy?: Profile,
  expireAt?: Date /* index TTL, expireAfterSeconds: 0 */,
  createdBy: Profile, createdAt: Date }
```

### `bills`
```ts
{ _id, label: string, amountCents: number, categoryId: ObjectId,
  scope: "shared" | "personal", owner?: Profile /* pour scope = "personal" */,
  kind: "recurring" | "once", every?: "month" | "year",
  dueDate: Date, dayOfMonth: number /* jour d'origine, pour la récurrence */,
  paid: boolean /* pour les ponctuelles */,
  createdBy: Profile, createdAt: Date }
```

---

## 12. API REST (indicative)

Routes API Next.js (`app/api/.../route.ts`). Toutes sont sous `/api`, demandent l'en-tête `Authorization: Bearer <jeton>` (sauf `/api/auth/code`) et l'en-tête `X-Profile: lionel|jaz` pour les écritures.

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/auth/code` | Vérifie le code, renvoie un jeton |
| GET | `/realtime/token` | Délivre un jeton Ably temporaire (abonnement + présence) |
| GET | `/shopping` | Liste triée par `position` |
| POST | `/shopping` | Ajoute un article (en bas) et met à jour l'historique |
| PATCH | `/shopping/:id` | Coche, décoche, renomme ou déplace (`position`) |
| DELETE | `/shopping/:id` | Supprime un article |
| DELETE | `/shopping/checked` | Vide le panier |
| GET | `/shopping/suggestions?q=` | Suggestions (3.3) |
| PATCH | `/shopping/suggestions/:key` | Retire une suggestion (`hidden`) |
| GET/POST/DELETE | `/categories` | Liste, création, suppression (réaffectation vers Divers) |
| GET/POST/PATCH/DELETE | `/expenses` | Dépenses (filtres `month`, `scope`) |
| GET | `/balance` | Solde net et détail (5.3) |
| POST/DELETE | `/settlements` | Régler, annuler un règlement |
| GET | `/budgets?month=&view=shared|me` | Totaux par catégorie et plafonds (6.2) |
| PUT | `/budgets` | Modifie les plafonds |
| GET/POST/PATCH/DELETE | `/tasks` | Tâches |
| GET/POST/PATCH/DELETE | `/bills` | Factures |
| POST | `/bills/:id/pay` | Marque payé, crée la dépense (8.2) |

La vue `view=me` du budget renvoie le perso du profil envoyé dans `X-Profile`. De même, les dépenses et factures perso ne sont renvoyées qu'au profil propriétaire.

Après chaque écriture réussie, la route publie le message temps réel correspondant (10.6).

---

## 13. Écrans et navigation

| Route | Écran |
|---|---|
| `/code` | Code d'accès (si aucun jeton) |
| `/profil` | C'est qui ? (si aucun profil) |
| `/` | Courses (accueil) |
| `/magasin` | Mode magasin plein écran (sans barre d'onglets) |
| `/comptes` | Comptes |
| `/comptes/nouvelle` | Nouvelle dépense (aussi réutilisée pour modifier) |
| `/budgets` | Budgets (bascule Commun / Mon perso) |
| `/budgets/[categorie]` | Détail des dépenses d'une catégorie |
| `/budgets/perso/depenses` | Mes dépenses perso (liste à part) |
| `/a-faire` | À faire |
| `/a-payer` | À payer |
| `/reglages/categories` | Gestion des catégories |
| `/reglages/budgets` | Gestion des plafonds |

Barre d'onglets en bas sur les écrans principaux : Courses, Comptes, Budgets, À faire, À payer.

---

## 14. Découpage en étapes pour Claude Code

Chaque étape doit être terminée, testée sur un vrai téléphone et validée avant de passer à la suivante.

1. **Socle** : projet Next.js, tokens et six thèmes avec sélecteur, déployé sur Vercel, connexion MongoDB, script de seed, code d'accès et jeton, choix du profil, coquille PWA installable, tokens de la DA, polices, barre d'onglets, temps réel Ably et présence.
2. **Courses** : liste, ajout, doublons, suggestions, cocher, supprimer, vider le panier, glisser-déposer, temps réel.
3. **Mode magasin** : plein écran, Wake Lock, ajouts en direct. Le ticket de sortie viendra à l'étape 4.
4. **Catégories, dépenses et Comptes** : catégories (défaut, Autre, suppression), formulaire de dépense, calcul des dettes et du solde, règlements, ticket de sortie du mode magasin.
5. **Budgets** : vues Commun et Perso, calculs, plafonds, navigation par mois, détail d'une catégorie, liste « Mes dépenses perso ».
6. **À payer** : factures communes et perso, récurrence, marquer payé avec création de la dépense.
7. **À faire** : tâches, filtres, expiration à 7 jours.
8. **Finitions** : hors ligne pour les Courses, animations, icônes de l'appli, aide à l'installation sur iPhone, déploiement.

---

## 15. Critères de validation (exemples à tester)

**Accès**
- Un code faux affiche une erreur. Cinq erreurs de suite bloquent les essais 15 minutes.
- Après un bon code et le choix du profil, rouvrir l'appli mène directement aux Courses.

**Courses**
- Lionel ajoute « Tomates » : l'article apparaît en moins d'une seconde chez Jaz, en bas de la liste, avec la pastille « L ».
- Avec 25 ajouts de « Tomates » et 2 de « Tortillas », taper « to » affiche Tomates en premier. Taper « oeu » propose « Œufs ».
- Déplacer un article change l'ordre sur les deux téléphones.
- Ajouter « tomates » alors que « Tomates » est déjà dans la liste non coché ne crée pas de doublon.
- Un article coché reste barré après le mode magasin, et disparaît seulement avec « Vider le panier ».

**Comptes** (cas de référence, à mettre en tests unitaires)
- Dépense commune de 86,40 € payée par Lionel : Jaz doit 34,56 €.
- Dépense commune de 72,00 € payée par Jaz : Lionel doit 43,20 €.
- Dépense commune de 29,99 € payée par Jaz : part de Jaz 12,00 €, Lionel doit 17,99 € (somme exacte 29,99 €).
- Avec 86,40 € (L), 63,90 € (L), 54,00 € (L), 72,00 € (J), 29,99 € (J) : Jaz doit 81,72 €, Lionel doit 61,19 €, **solde : Jaz doit 20,53 € à Lionel**.
- Après « Régler », le solde vaut 0.
- Une dépense perso n'apparaît pas dans Comptes et ne change pas le solde.

**Budgets**
- Dépense commune de 100 € en Restaurants : Commun +100 €, perso de Lionel +60 €, perso de Jaz +40 €.
- Dépense perso de Jaz de 30 € en Sorties : seulement le perso de Jaz +30 €. Lionel ne la voit nulle part.
- Une catégorie sans plafond affiche seulement le montant, sans barre.

**À payer**
- Facture d'électricité de 72 €, payée par « les deux » : Commun Factures +72 €, perso de Lionel +43,20 €, perso de Jaz +28,80 €, solde des Comptes inchangé.
- La même facture payée par Lionel seul : Jaz doit 28,80 € en plus.
- Facture perso de Jaz (abonnement téléphone 15 €) : Lionel ne la voit pas dans À payer. Marquée payée, elle ajoute 15 € au perso de Jaz seulement, sans rien changer au Commun ni aux Comptes.
- Une facture mensuelle due le 31 janvier et payée passe au 28 (ou 29) février, puis au 31 mars.

**À faire**
- Une tâche cochée lundi est encore visible le dimanche suivant et disparaît le lundi d'après.

**Catégories**
- Créer « Cadeaux » via Autre, l'utiliser, puis la supprimer : les dépenses concernées passent dans Divers.

---

## 16. Décisions prises (journal)

| Date | Décision |
|---|---|
| 25/10 | Direction artistique Marché pop |
| 25/10 | Base MongoDB Atlas (compte de Lionel). Code écrit par Lionel avec Claude Code |
| 26/10 | Code commun à 6 chiffres, non modifiable dans l'appli |
| 26/10 | Courses sans catégories, ajout en bas, glisser-déposer, suggestions par début de mot et fréquence |
| 26/10 | Articles cochés barrés jusqu'à « Vider le panier » ; ticket proposé en sortie du mode magasin |
| 26/10 | Répartition fixe 60 % Lionel / 40 % Jaz |
| 26/10 | Catégories : Courses, Restaurants, Sorties, Divertissements, Maison, Factures, Divers + Autre (réutilisable, supprimable, dépenses vers Divers) |
| 26/10 | Dépense commune ou perso ; budgets Commun et Mon perso séparés ; chacun ne voit que son perso |
| 26/10 | Tâches faites visibles 7 jours |
| 26/10 | Marquer payé crée la dépense ; « qui a payé ? » Lionel, Jaz ou les deux (chacun sa part, sans dette) |
| 26/10 | Hébergement gratuit : Next.js sur Vercel + MongoDB Atlas M0 + temps réel via un service externe gratuit (Ably) |
| 27/10 | Six thèmes de couleurs au choix dans l'appli (Original, Piscine, Pistache & framboise, Lagon & mangue, Bonbon cerise, Agrume), mémorisés par téléphone |
| 26/10 | Factures perso possibles : visibles seulement par leur propriétaire, comptées seulement dans son perso |

### Choix validés le 26/10

- Pas de quantité séparée dans les courses (on l'écrit dans le nom).
- Le solde des Comptes porte sur tout l'historique, pas par mois.
- Toute personne peut modifier ou supprimer les éléments communs (dépenses, tâches, factures).
- Le ticket de sortie n'est proposé que si au moins un article a été coché pendant la session du mode magasin.

### Choix faits à la relecture (v1.1, validés le 26/10)

- Supprimer un seul article de courses : glisser vers la gauche, avec « Annuler » pendant 3 secondes (3.1).
- Pas de doublon dans la liste de courses (3.2).
- Retirer une suggestion par appui long (3.3).
- Pas de remboursement partiel : « Régler » solde toujours tout (5.4).
- Les dépenses perso se retrouvent dans une liste à part « Mes dépenses perso », depuis Budgets › Mon perso (6.5).
- Une facture perso n'est visible que par son propriétaire, y compris dans le total « Reste à payer » (8.1).
- Au départ, aucun plafond de budget (6.3).
