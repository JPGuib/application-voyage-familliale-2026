---
name: Application de voyage familiale 2026
description: Companion mobile-first familial pour organiser et vivre un voyage en Turquie
colors:
  surface-base: '#FFFBF5'
  surface-raised: '#FFFFFF'
  ink-primary: '#1A1A2E'
  ink-secondary: '#8B7355'
  border-hairline: '#E9E1D5'
  primary: '#FF6B3D'
  primary-ink: '#FFFFFF'
  secondary: '#FFD93D'
  secondary-ink: '#1A1A2E'
  accent: '#00C4A7'
  accent-ink: '#FFFFFF'
  warning: '#F59E0B'
  danger: '#D4183D'
  success: '#16A34A'
  surface-base-dark: '#1A1A2E'
  surface-raised-dark: '#202035'
  ink-primary-dark: '#F8F6F2'
  ink-secondary-dark: '#C5B9A8'
  border-hairline-dark: '#36364F'
  primary-dark: '#FF8A66'
  primary-ink-dark: '#1A1A2E'
  secondary-dark: '#FFD93D'
  secondary-ink-dark: '#1A1A2E'
  accent-dark: '#2AD8C0'
  accent-ink-dark: '#1A1A2E'
typography:
  hero:
    fontFamily: 'Nunito, sans-serif'
    fontSize: 40px
    fontWeight: 900
    lineHeight: 1.1
  title:
    fontFamily: 'Nunito, sans-serif'
    fontSize: 28px
    fontWeight: 800
    lineHeight: 1.2
  section:
    fontFamily: 'Nunito, sans-serif'
    fontSize: 18px
    fontWeight: 800
    lineHeight: 1.3
  body:
    fontFamily: 'Nunito, sans-serif'
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.5
  caption:
    fontFamily: 'Nunito, sans-serif'
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.4
rounded:
  sm: 10px
  md: 16px
  lg: 24px
  xl: 32px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '7': 32px
  '8': 40px
  gutter-mobile: 16px
  gutter-desktop: 24px
components:
  app-shell:
    background: '{colors.surface-base}'
    cardBackground: '{colors.surface-raised}'
    borderColor: '{colors.border-hairline}'
    radius: '{rounded.lg}'
  header-hero:
    background: '{colors.primary}'
    text: '{colors.primary-ink}'
    accentDot: '{colors.secondary}'
    radius: '{rounded.xl}'
  button-primary:
    background: '{colors.primary}'
    text: '{colors.primary-ink}'
    radius: '{rounded.md}'
    paddingInline: '{spacing.6}'
    paddingBlock: '{spacing.4}'
  button-secondary:
    background: '{colors.secondary}'
    text: '{colors.secondary-ink}'
    radius: '{rounded.md}'
  chip-tab:
    activeBg: '{colors.accent}'
    activeText: '{colors.accent-ink}'
    idleBg: '{colors.surface-raised}'
    idleText: '{colors.ink-secondary}'
    radius: '{rounded.full}'
  card-content:
    background: '{colors.surface-raised}'
    borderColor: '{colors.border-hairline}'
    radius: '{rounded.md}'
  bottom-nav-item:
    activeBg: '{colors.primary}'
    activeText: '{colors.primary-ink}'
    idleText: '{colors.ink-secondary}'
    radius: '{rounded.md}'
---

## Brand & Style

Le produit doit inspirer la confiance, la chaleur et l enthousiasme familial. L interface est ludique sans etre infantile: couleurs vives mais structure propre, textes courts et clairs, et gestes evidents. Le style visuel assume un esprit voyage vacance: solaire, simple, energique.

## Colors

La palette suit un axe Memphis chaleureux:
- Corail (`{colors.primary}`) pour les actions principales et les en-tetes d ecrans.
- Jaune soleil (`{colors.secondary}`) pour les marqueurs de progression et actions secondaires.
- Teal (`{colors.accent}`) pour les etats actifs utiles (onglets, confirmations contextuelles).
- Fond creme (`{colors.surface-base}`) pour garder un confort de lecture long sur mobile.

Regles:
- Une seule couleur dominante par ecran pour eviter le bruit visuel.
- Les etats d erreur utilisent `{colors.danger}` avec texte explicite, jamais uniquement la couleur.

## Typography

La police principale est Nunito, deja adoptee dans l application.

Regles:
- Titres de section en `section`, toujours courts.
- Corps de texte en `body` avec phrases courtes et vocabulaire concret.
- Meta et labels discrets en `caption`, sans surcharge d informations.

## Layout & Spacing

Mobile-first.
- Marges laterales: `{spacing.gutter-mobile}`.
- Les cartes sont separees par `{spacing.4}` ou `{spacing.5}`.
- Un seul axe principal de scroll par ecran.

Desktop:
- Coque mobile centree, marge externe `{spacing.gutter-desktop}`.
- Le comportement visuel reste identique a mobile, seulement encapsule.

## Elevation & Depth

Peu d ombres. La hierarchie se lit surtout via couleur, taille typographique et espacement.

Regles:
- Ombre legere uniquement sur CTA majeur et cartes hero.
- Pas d empilement de couches opaques inutiles.

## Shapes

Le langage de formes repose sur des coins arrondis larges pour une sensation amicale.

Regles:
- Cartes et boutons majeurs: `{rounded.md}` ou `{rounded.lg}`.
- Pastilles et onglets: `{rounded.full}`.
- Eviter les angles droits sur les surfaces interactives.

## Components

- **Header hero**: utilise `{components.header-hero.background}` avec texte fort et progression visible.
- **Bouton primaire**: utilise `{components.button-primary.*}` et doit rester visuellement dominant.
- **Carte contenu**: utilise `{components.card-content.*}` pour Guide, Conseils, Resultats.
- **Navigation basse**: item actif avec fond plein, item inactif en texte discret.
- **Onglets conseils**: chips arrondies actives/inactives, lisibles en un coup d oeil.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Prioriser des actions larges et tactiles | Empiler des micro-boutons denses |
| Garder un seul message principal par bloc | Afficher des paragraphes longs sur mobile |
| Utiliser les tokens definis dans ce fichier | Coder des couleurs inline par ecran |
| Assurer contraste texte/fond suffisant | Utiliser la couleur seule pour signifier une erreur |