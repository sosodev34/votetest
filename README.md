Réalisation des tests unitaires

Projet de système de vote développé en Solidity et testé avec Truffle + OpenZeppelin.

---

Objectif :

Développer un contrat intelligent de vote conforme au cahier des charges :

- Gestion des étapes (workflow)
- Whitelist de votants
- Ajout de propositions
- Phase de vote
- Détermination du gagnant

- Le projet est centré sur la couverture par tests unitaires.

---

Les TESTS :
1 : Ajout et récupération de votant.
2 : Un non-votant ne peut pas accéder aux fonctions réservées.
3 : Phase d’enregistrement des propositions.
4 : Refuser les propositions vides.
5 : Vote d’un votant.
6 : Empêcher de voter deux fois.
7 : Tallier les votes correctement.
8 : Ne pas pouvoir voter hors période.
