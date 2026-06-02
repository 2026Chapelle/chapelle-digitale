# assets-plan — Plan d'images du Tunnel Royal

Ce dossier décrit **toutes les images** nécessaires aux nouvelles pages du
tunnel, avec pour chacune : nom de fichier, emplacement, prompt premium prêt à
coller dans ChatGPT Images, et dimensions recommandées.

## Où déposer les images générées
Toutes les images héros vont dans :
```
public/images/tunnel/
```
Les pages les chargent déjà via un calque de fond (`background-image`) **par-dessus
un dégradé** : tant que l'image n'existe pas, le dégradé « Charbon & Lumière »
s'affiche — aucune image cassée. Dès que vous déposez le fichier au bon nom,
il apparaît automatiquement.

## Format & optimisation
- Exporter en **WebP** (qualité ~82), ou JPG en repli.
- Garder un poids < 400 Ko par héro (les pages servent les images telles quelles,
  `images.unoptimized = true` pour la portabilité PlanetHoster).
- Les héros sont assombris à ~22 % d'opacité + overlay : privilégier des images
  **contrastées, sombres, à lumière dorée centrale**.

## Charte visuelle commune (à rappeler dans chaque prompt)
> Style royal, luxe discret, lumière dorée, ambiance Royaume, très réaliste,
> qualité cinématographique Netflix / Apple, format web moderne, fond charbon
> profond (#050308), accents or royal (#D4AF37) et violet royal (#4B0082),
> grain photographique subtil, profondeur de champ, aucune croix ni texte
> incrusté, espace négatif à gauche/centre pour superposer le titre.

Voir `PROMPTS-IMAGES.md` pour les prompts détaillés.
