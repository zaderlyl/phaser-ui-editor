# Phaser UI Editor

Un équivalent de Figma pensé pour Phaser : un éditeur web pour construire visuellement des écrans d'UI (menus, HUD, popups) et générer le code Phaser correspondant, sans écrire de code.

## Contexte

Ce projet est né d'un besoin identifié pendant une SAE (BUT MMI) : coder une UI à la main dans Phaser demande des allers-retours constants entre créa et dev. Cet outil vise à éliminer ce frottement en laissant la créa construire l'écran directement à la souris, avec un aperçu pixel-perfect (un vrai rendu Phaser, pas une imitation CSS), puis exporter un fichier de code prêt à intégrer.

## Principe

1. La créa construit un écran en glissant-déposant des composants (Panel, Texte, Image, Bouton, Barre de progression) sur un canvas Phaser à la résolution du jeu.
2. Elle règle chaque élément (position, taille, ancrage, couleur, police, texture) via un panneau de propriétés.
3. Elle exporte : l'outil génère une classe `Phaser.GameObjects.Container` avec une API minimale (`open()` / `close()`).
4. Le dev colle le fichier dans son projet, instancie la classe, et déclenche l'ouverture/fermeture depuis sa propre logique de jeu.

## Stack

- React + Vite
- Phaser (moteur de rendu du canvas d'édition)

## Statut

En cours de développement — voir les issues/branches pour le découpage en tâches.
