# Direction artistique retenue : Marché pop

Choisie par Lionel le 25/10/2026. Maquettes de tous les écrans : https://claude.ai/artifact/9jZ26sRdqNxBZKyE18Et7D (`casa-ecrans.html` dans ce dossier). Pistes comparées au départ : https://claude.ai/artifact/CRQtrx6wxWWDRpWH9MfBP7.

## Esprit
Affiche de marché imprimée en risographie, étiquettes collées à la main. Énergique, graphique, colorée.

## Palette
- Jaune soleil `#FFE14D` (fond principal)
- Encre `#1B1B3A` (texte, contours, fond du mode magasin)
- Rose fluo `#FF4F8B` (accent, ombres décalées, cases cochées)
- Turquoise `#00A79F`
- Bleu `#3D5AFE`
- Blanc `#FFFFFF` (cartes)

## Typographies
- Titres : Bagel Fat One (avec ombre rose décalée 3 px, effet impression mal calée)
- Texte : Figtree (600 à 800)

## Formes
- Contours 2,5 px couleur encre, rayons 12 à 14 px
- Ombres pleines décalées (3 à 6 px, encre ou rose)
- Étiquettes de rayon inclinées (±2°), couleur par rayon : Fruits & légumes turquoise, Frais bleu, Épicerie rose, Maison encre
- Trame de points roses en décor

## Icônes
Trait épais (2,6) et arrondi, posées sur des pastilles de couleur.

## Micro-animations
- Case cochée : se tamponne en rose avec une rotation de -10°
- Article barré par un trait de feutre rose
- Boutons et cartes s'enfoncent dans leur ombre à l'appui
- Point « en ligne » qui pulse (présence de l'autre en temps réel)
- Respect de prefers-reduced-motion

## Mode magasin
Fond encre, texte blanc et jaune, grosses lignes (21 px), cases de 38 px, compteur « N restants » en étiquette rose, bouton « Quitter le mode magasin » jaune.

## Cadrage du projet (notes)
- Utilisateurs : Lionel et Jaz (sa copine). Profil choisi sur l'appareil, sans compte.
- Base de données : MongoDB (compte Atlas existant de Lionel).
- Le code sera écrit par Lionel avec Claude Code ; ce fil sert à cadrer le projet.

## Règles fonctionnelles validées (26/10/2026)
- Accès : code commun demandé une fois par téléphone (vérifié côté serveur), puis choix du profil Lionel / Jaz mémorisé.
- Courses : pas de catégories ni de rayons. On tape le nom, on valide, l'article s'ajoute. Réordonnancement par glisser-déposer, ordre partagé.
- Suggestions : articles déjà ajoutés, filtrés par début du texte tapé, triés par fréquence d'ajout (25× tomates avant 2× tortilla).
- Articles cochés : restent barrés (aussi après le mode magasin) jusqu'à « Vider le panier ».
- En quittant le mode magasin : proposition d'enregistrer le ticket comme dépense.
- Comptes : répartition fixe 60 % Lionel / 40 % Jaz, compensation des dettes croisées.
- Catégories de dépense : Courses, Restaurants, Sorties, Divertissements, Maison, Divers, + « Autre » (saisie libre). Pas de Santé ni de Bricolage.
- Dépense « Tous les deux » ou « Perso ». Commune : montant total dans Budgets commun, et 60/40 dans le budget perso de chacun. Perso : uniquement dans le perso, hors comptes.
- Budgets : deux vues séparées (Commun / Mon perso) avec bascule facile. Plafond facultatif par catégorie.
- À faire : tâches faites visibles une semaine.
- Restes à payer : « Marquer payé » crée automatiquement la dépense, dans la bonne catégorie.

## Points encore ouverts
- Catégorie « Autre » réutilisable ? Catégorie « Factures » ?
- Chacun ne voit que son propre perso ?
- Marquer payé : qui a payé / commun ou perso, demandé au clic ou fixé par facture ?
- Nouvel article ajouté en bas ? Code à 4 ou 6 chiffres, modifiable ?

## Réponses du 26/10/2026 (suite)
- Catégories : une seule liste commune dépenses/budgets, avec « Factures » en plus. « Autre » crée une catégorie réutilisable, supprimable.
- Budgets : chacun voit le commun et son propre perso, jamais le perso de l'autre.
- Marquer payé : l'appli demande qui a payé (Lionel, Jaz ou les deux).
- Liste de courses : nouvel article ajouté en bas.
- Maquettes : toujours garder une marge en bas des listes pour qu'un bouton flottant ne cache pas le dernier élément.
- Ouverts : sens de « les deux » (compte joint, sans dette ?) ; sort des dépenses d'une catégorie supprimée (proposé : Divers) ; code 4 ou 6 chiffres, modifiable ?

## Tranché le 26/10/2026 (fin)
- Pas de compte joint. Facture payée par « les deux » = chacun a payé sa part 60/40 : budgets commun + perso, aucune dette dans Comptes.
- Catégorie supprimée : ses dépenses passent dans « Divers ».
- Code d'accès : 6 chiffres, non modifiable depuis l'appli (configuré côté serveur).
- Plus aucun point ouvert sur les maquettes.

## Thèmes de couleurs (27/10/2026)
Six thèmes au choix dans l'appli, mémorisés par téléphone : Original, Piscine, Pistache & framboise, Lagon & mangue, Bonbon cerise, Agrume. Valeurs exactes dans la section 9 du cahier des charges. Maquette : https://claude.ai/artifact/WPLbk2LttzzPx9foSUsyp1
