/** Données FAQ partagées /rejoindre — module pur (sans 'use client')
 *  pour être consommé à la fois par la page serveur (JSON-LD) et le
 *  composant client (accordéon). */
export const FAQ_ITEMS = [
  { q: 'Est-ce vraiment gratuit pour commencer ?', r: "Oui. Le niveau Visiteur est totalement gratuit et donne accès aux cultes en direct, au mur de prière public et aux ressources de base. Aucune carte bancaire requise." },
  { q: 'Dois-je me déplacer ou être présent physiquement ?', r: "Non. La Chapelle est une église digitale accessible partout dans le monde, à toute heure. Vous vivez les cultes, les formations et la communion depuis chez vous." },
  { q: 'Que se passe-t-il après mon premier contact ?', r: "Vous recevez un mot de bienvenue personnel, puis nous vous guidons pas à pas : intégration, rattachement à une communauté, premiers parcours. Vous n'êtes jamais seul." },
  { q: 'La plateforme est-elle disponible dans mon pays ?', r: "Oui. Notre contenu est principalement en français et disponible partout dans le monde, à toute heure." },
  { q: 'Comment accéder aux formations ?', r: "Les Visiteurs accèdent à des formations gratuites de base. Des parcours avancés et certifiants sont proposés pour aller plus loin dans votre croissance." },
] as const
