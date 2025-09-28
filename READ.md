# 🏫 Recherche d'Établissements Scolaires

Application web interactive pour rechercher et géolocaliser les établissements scolaires français à partir des données officielles du ministère de l'Éducation nationale.

## ✨ Fonctionnalités

- **Recherche par commune et code postal** - Interface simple et intuitive
- **Géolocalisation interactive** - Carte Leaflet avec marqueurs clusterisés
- **Sources de données multiples** - Fusion intelligente de deux datasets officiels
- **Sélection d'établissements** - Cases à cocher pour exporter les coordonnées
- **Détection anti-doublons** - Algorithme avancé de déduplication
- **Interface responsive** - Adaptée desktop et mobile

## 🗂️ Structure du projet

```
.
├── index.html          # Page principale
├── script/
│   └── app.js         # Logique applicative JavaScript
├── css/
│   └── styles.css     # Styles CSS personnalisés
└── README.md          # Documentation
```

## 🚀 Installation et utilisation

### Prérequis
- Serveur web local (ex: Live Server, XAMPP, etc.)
- Navigateur moderne avec support JavaScript ES6+

### Lancement
1. Clonez ou téléchargez le projet
2. Ouvrez `index.html` dans un serveur web local
3. Saisissez une commune et son code postal
4. Cliquez sur "Rechercher" ou appuyez sur Entrée

### Exemple d'utilisation
```
Commune: SAINT-JUNIEN
Code postal: 87200
```

## 🔧 Technologies utilisées

### Frontend
- **HTML5** - Structure sémantique
- **CSS3** - Styles et responsive design
- **JavaScript ES6+** - Logique applicative
- **Leaflet.js** - Cartographie interactive
- **Leaflet.markercluster** - Regroupement de marqueurs
- **FontAwesome** - Icônes (optionnel)

### APIs externes
- **API Data.Education.gouv.fr** - Données officielles des établissements
    - Dataset 1: `fr-en-annuaire-education`
    - Dataset 2: `fr-en-adresse-et-geolocalisation-etablissements-premier-et-second-degre`
- **OpenStreetMap** - Tuiles cartographiques

## 🎯 Sources de données

L'application interroge deux datasets complémentaires :

1. **Annuaire de l'éducation** - Données administratives complètes
2. **Géolocalisation des établissements** - Coordonnées GPS précises

### Champs supportés
- `nom_etablissement`, `appellation_officielle`, `nom_uai`
- `adresse_1`, `adresse`, `adresse_uai`
- `type_etablissement`, `nature_uai_libe`, `type_uai`
- `position`, `coordonnees`, `latitude/longitude`
- `identifiant_de_l_etablissement`, `numero_uai`

## ⚙️ Fonctionnalités avancées

### Algorithme anti-doublons
- Utilise l'identifiant UAI officiel quand disponible
- Normalisation des noms et adresses (accents, casse, espaces)
- Fusion intelligente des données complémentaires
- Filtrage automatique des établissements sans géolocalisation

### Recherche élargie
- Recherche principale par commune + code postal
- Recherche de secours par département si peu de résultats
- Requêtes parallèles pour optimiser les performances

### Interface utilisateur
- Marqueurs colorés (rouge = non sélectionné, bleu = sélectionné)
- Popup informative au clic sur marqueur
- Centrage automatique de la carte
- Export des coordonnées sélectionnées

## 🔍 Exemple de requête API

```javascript
// URL générée pour Saint-Junien (87200)
const url1 = `https://data.education.gouv.fr/api/records/1.0/search/?dataset=fr-en-annuaire-education&q=SAINT-JUNIEN&refine.code_postal=87200&rows=100`;

const url2 = `https://data.education.gouv.fr/api/records/1.0/search/?dataset=fr-en-adresse-et-geolocalisation-etablissements-premier-et-second-degre&q=SAINT-JUNIEN&refine.code_postal=87200&rows=100`;
```

## 🐛 Résolution de problèmes

### Les icônes ne s'affichent pas
- Vérifiez que FontAwesome est bien chargé
- Alternative : le script utilise des icônes CSS/emoji en fallback

### Aucun établissement trouvé
- Vérifiez l'orthographe de la commune
- Essayez sans accents
- Vérifiez la correspondance commune/code postal

### Erreur CORS
- Utilisez un serveur web local (pas `file://`)
- Les APIs education.gouv.fr supportent CORS

### Doublons dans les résultats
- L'algorithme de déduplication devrait les éliminer automatiquement
- Vérifiez les logs console pour le debug

## 📈 Améliorations futures

- [ ] Cache des résultats pour éviter les requêtes répétées
- [ ] Filtres par type d'établissement
- [ ] Export CSV/JSON des résultats
- [ ] Recherche par rayon géographique
- [ ] Mode sombre/clair
- [ ] Sauvegarde des sélections en localStorage
- [ ] API de géocodage pour recherche par adresse

## 📄 Licence

Ce projet utilise des données publiques du gouvernement français sous licence ouverte.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer des améliorations
- Ajouter des fonctionnalités

## 📞 Support

Pour toute question ou problème, consultez :
- [Documentation API Education](https://data.education.gouv.fr/api/docs/)
- [Documentation Leaflet](https://leafletjs.com/reference.html)
- Issues de ce repository

---

Développé avec ❤️ pour faciliter l'accès aux données éducatives françaises.
