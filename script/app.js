// Initialisation de la carte Leaflet
const map = L.map('map').setView([46.8, 2.5], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// Cluster group pour regrouper les marqueurs
const markersLayer = L.markerClusterGroup();
map.addLayer(markersLayer);

// Récupération des éléments DOM
const resultsDiv = document.getElementById('results');
const statusDiv = document.getElementById('status');
const coordsBox = document.getElementById('coords');
let selected = [];

/**
 * Affiche un message de statut avec couleur
 * @param {string} msg - Message à afficher
 * @param {string} type - Type de message (error, success, ou vide)
 */
function showStatus(msg, type = "") {
    statusDiv.textContent = msg;
    statusDiv.style.color = type === "error" ? "red" : type === "success" ? "green" : "black";
}

/**
 * Combine les résultats de plusieurs datasets en évitant les doublons
 * @param {Array} records1 - Premier dataset
 * @param {Array} records2 - Deuxième dataset
 * @returns {Array} - Résultats combinés sans doublons
 */
function combineResults(records1, records2) {
    const combined = [];
    const seenEstablishments = new Map();

    // Fonction pour créer une clé unique d'établissement
    function createUniqueKey(etab) {
        // Normaliser le nom (supprimer espaces, accents, casse)
        const nom = (etab.nom_etablissement || etab.appellation_officielle || etab.nom_uai || '')
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, '');

        // Normaliser l'adresse
        const adresse = (etab.adresse_1 || etab.adresse || etab.adresse_uai || '')
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, '');

        // Utiliser l'identifiant UAI si disponible, sinon nom + adresse + code postal
        return etab.identifiant_de_l_etablissement ||
            etab.numero_uai ||
            etab.code_etablissement ||
            `${nom}_${adresse}_${etab.code_postal || ''}`;
    }

    // Fonction pour fusionner les données de deux établissements identiques
    function mergeEstablishmentData(existing, newRecord) {
        const merged = { ...existing };
        const newFields = newRecord.fields;

        // Compléter les champs manquants avec les données du nouveau record
        Object.keys(newFields).forEach(key => {
            if (!merged.fields[key] && newFields[key]) {
                merged.fields[key] = newFields[key];
            }
        });

        return merged;
    }

    // Traiter tous les records
    [...records1, ...records2].forEach(record => {
        const key = createUniqueKey(record.fields);

        if (seenEstablishments.has(key)) {
            // Fusionner avec l'existant
            const existing = seenEstablishments.get(key);
            const merged = mergeEstablishmentData(existing, record);
            seenEstablishments.set(key, merged);
        } else {
            // Nouvel établissement
            seenEstablishments.set(key, record);
        }
    });

    // Convertir la Map en Array et filtrer les établissements sans coordonnées
    return Array.from(seenEstablishments.values()).filter(record => {
        const etab = record.fields;
        return etab.position || etab.coordonnees || (etab.latitude && etab.longitude);
    });
}

/**
 * Traite et affiche les établissements sur la carte
 * @param {Array} records - Liste des établissements
 */
function processEstablishments(records) {
    // Nettoyage
    markersLayer.clearLayers();
    resultsDiv.innerHTML = '';
    coordsBox.value = '';
    selected = [];

    if (!records.length) {
        showStatus("Aucun établissement trouvé.", "error");
        return;
    }

    // Icônes pour les établissements (rouge par défaut, bleu quand sélectionné)
    const schoolRed = L.divIcon({
        html: '<div style="background:red;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);">🏫</div>',
        className: "custom-school-icon",
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const schoolBlue = L.divIcon({
        html: '<div style="background:blue;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);">🏫</div>',
        className: "custom-school-icon",
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const coordsList = [];

    records.forEach((rec, idx) => {
        const etab = rec.fields;

        // Vérifier la position (peut être dans position ou coordonnees)
        let lat, lon;
        if (etab.position) {
            [lat, lon] = etab.position;
        } else if (etab.coordonnees) {
            [lat, lon] = etab.coordonnees;
        } else if (etab.latitude && etab.longitude) {
            lat = etab.latitude;
            lon = etab.longitude;
        } else {
            return; // Pas de coordonnées, on passe au suivant
        }

        // Créer le marqueur
        const marker = L.marker([lat, lon], { icon: schoolRed });

        // Popup avec informations
        const nomEtabPopup = etab.nom_etablissement ||
            etab.appellation_officielle ||
            etab.nom_uai ||
            'Établissement';

        const adressePopup = etab.adresse_1 ||
            etab.adresse ||
            etab.adresse_uai ||
            '';

        const communePopup = etab.nom_commune ||
            etab.commune ||
            etab.libelle_commune ||
            '';

        const typePopup = etab.type_etablissement ||
            etab.nature_uai_libe ||
            etab.type_uai ||
            'Non spécifié';

        const popupContent = `
            <b>${nomEtabPopup}</b><br>
            ${adressePopup}<br>
            ${etab.code_postal || ''} ${communePopup}<br>
            <small>Type: ${typePopup}</small>
        `;
        marker.bindPopup(popupContent);
        markersLayer.addLayer(marker);

        // Ajouter dans le panneau latéral
        const div = document.createElement('div');
        div.className = 'etab';

        // Récupérer le nom de l'établissement depuis différents champs possibles
        const nomEtab = etab.nom_etablissement ||
            etab.appellation_officielle ||
            etab.nom_uai ||
            'Établissement non nommé';

        // Récupérer l'adresse depuis différents champs possibles
        const adresse = etab.adresse_1 ||
            etab.adresse ||
            etab.adresse_uai ||
            'Adresse non spécifiée';

        // Récupérer le type depuis différents champs possibles
        const typeEtab = etab.type_etablissement ||
            etab.nature_uai_libe ||
            etab.type_uai ||
            'Type non spécifié';

        div.innerHTML = `
            <label>
                <input type="checkbox" data-idx="${idx}">
                <strong style="color:#2c3e50;">${nomEtab}</strong><br>
                <span style="font-size:12px;color:#555;">${adresse}</span><br>
                <span style="font-size:11px;color:#e67e22;font-weight:bold;">${typeEtab}</span>
            </label>
        `;
        resultsDiv.appendChild(div);

        // Gestion de la sélection
        const checkbox = div.querySelector('input');
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                marker.setIcon(schoolBlue);
                coordsList.push(`${lat}, ${lon}`);
            } else {
                marker.setIcon(schoolRed);
                const coordString = `${lat}, ${lon}`;
                const index = coordsList.indexOf(coordString);
                if (index > -1) coordsList.splice(index, 1);
            }
            coordsBox.value = coordsList.join("\n");
        });

        // Clic sur l'établissement pour centrer la carte
        div.onclick = (e) => {
            if (e.target.tagName !== 'INPUT') {
                marker.openPopup();
                map.setView([lat, lon], 16);
            }
        };
    });

    // Centrage automatique de la carte
    if (markersLayer.getLayers().length === 1) {
        map.setView(markersLayer.getLayers()[0].getLatLng(), 15);
    } else if (markersLayer.getLayers().length > 1) {
        map.fitBounds(markersLayer.getBounds());
    }

    showStatus(`${records.length} établissement(s) trouvé(s).`, "success");
}

/**
 * Génère les codes postaux associés pour inclure les boîtes postales
 * @param {string} cp - Code postal principal
 * @returns {Array} - Liste des codes postaux à rechercher
 */
function getRelatedPostalCodes(cp) {
    const baseCodes = [cp];
    const baseNumber = parseInt(cp.substring(0, 3));

    // Ajouter les codes postaux de boîtes postales courrants
    // Format: 87200 -> aussi chercher 87201, 87202, 87203, 87204, 87205
    for (let i = 1; i <= 9; i++) {
        const bpCode = `${baseNumber}0${i}`;
        if (bpCode !== cp) {
            baseCodes.push(bpCode);
        }
    }

    return baseCodes;
}

/**
* @param {string} commune - Nom de la commune
* @param {string} cp - Code postal
* @returns {Object|false} - Données de la commune validée ou false si invalide
*/
async function validateCommune(commune, cp) {
    try {
        showStatus("🔍 Validation de la commune...");
        const response = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(commune)}&codePostal=${cp}&fields=nom,code,codesPostaux`);
        const data = await response.json();

        if (data.length === 0) {
            showStatus("⚠️ Commune non trouvée pour ce code postal", "error");
            return false;
        }

        if (data.length > 1) {
            showStatus(`⚠️ ${data.length} communes trouvées avec ce nom/code postal`, "error");
            console.warn("Plusieurs communes correspondent:", data);
            // Pour l'instant, on prend la première, mais on pourrait ajouter un sélecteur
            return data[0];
        }

        // Une seule commune trouvée - parfait !
        const validatedCommune = data[0];
        showStatus(`✅ Commune validée: ${validatedCommune.nom} (${cp})`, "success");
        return validatedCommune;

    } catch (e) {
        console.warn("Erreur lors de la validation de commune:", e);
        showStatus("⚠️ Impossible de valider la commune, recherche directe", "error");
        // En cas d'erreur API, on continue quand même
        return { nom: commune, code: null };
    }
}

/**
 * Lance la recherche complète d'établissements avec validation préalable
 */
async function doSearch() {
    const commune = document.getElementById('commune').value.trim();
    const cp = document.getElementById('cp').value.trim();

    if (!commune || !cp) {
        alert("⚠️ Entrez commune et code postal");
        return;
    }

    // ÉTAPE 1: Validation de la commune avec l'API Geo
    const validatedCommune = await validateCommune(commune, cp);
    if (!validatedCommune) {
        return; // Arrêt si commune invalide
    }

    // ÉTAPE 2: Recherche des établissements avec la commune validée
    showStatus("🔍 Recherche des établissements...");

    // Utiliser le nom officiel de la commune validée
    const officialName = validatedCommune.nom;

    // Générer les codes postaux associés (inclut les boîtes postales)
    const relatedPostalCodes = getRelatedPostalCodes(cp);
    console.log(`🔍 Recherche avec codes postaux: ${relatedPostalCodes.join(', ')}`);

    try {
        // Recherches parallèles pour tous les codes postaux associés
        const searchPromises = [];

        relatedPostalCodes.forEach(postalCode => {
            // Dataset principal
            const url1 = `https://data.education.gouv.fr/api/records/1.0/search/?dataset=fr-en-annuaire-education&refine.nom_commune=${encodeURIComponent(officialName)}&refine.code_postal=${encodeURIComponent(postalCode)}&rows=100`;

            // Dataset géolocalisation
            const url2 = `https://data.education.gouv.fr/api/records/1.0/search/?dataset=fr-en-adresse-et-geolocalisation-etablissements-premier-et-second-degre&refine.commune=${encodeURIComponent(officialName)}&refine.code_postal=${encodeURIComponent(postalCode)}&rows=100`;

            searchPromises.push(
                fetch(url1).catch(() => ({ ok: false, json: () => ({records: []}) })),
                fetch(url2).catch(() => ({ ok: false, json: () => ({records: []}) }))
            );
        });

        // Attendre toutes les requêtes
        const allResponses = await Promise.all(searchPromises);

        // Traiter toutes les réponses
        let allRecords = [];
        for (let i = 0; i < allResponses.length; i += 2) {
            const res1 = allResponses[i];
            const res2 = allResponses[i + 1];

            const data1 = res1.ok ? await res1.json() : { records: [] };
            const data2 = res2.ok ? await res2.json() : { records: [] };

            allRecords = combineResults(allRecords, [...(data1.records || []), ...(data2.records || [])]);
        }

        // Si peu de résultats, faire une recherche élargie avec filtrage exact par commune validée
        if (allRecords.length < 10) {
            showStatus("🔍 Recherche élargie en cours...");

            const departement = cp.substring(0, 2); // Extraire le département du code postal
            // Recherche élargie mais toujours avec filtrage exact sur la commune validée
            const url3 = `https://data.education.gouv.fr/api/records/1.0/search/?dataset=fr-en-annuaire-education&refine.nom_commune=${encodeURIComponent(officialName)}&refine.code_departement=${departement}&rows=100`;

            try {
                const res3 = await fetch(url3);
                if (res3.ok) {
                    const data3 = await res3.json();
                    allRecords = combineResults(allRecords, data3.records || []);
                }
            } catch (e) {
                console.warn("Recherche élargie échouée:", e);
            }
        }

        // ÉTAPE 3: Validation finale des résultats (accepter tous les codes postaux associés)
        const finalResults = validateSearchResults(allRecords, officialName, relatedPostalCodes);

        // Traiter tous les établissements trouvés et validés
        processEstablishments(finalResults);

    } catch (e) {
        console.error("Erreur lors de la recherche:", e);
        showStatus("❌ Erreur lors du chargement des données", "error");
    }
}

/**
 * Valide les résultats de recherche pour s'assurer qu'ils correspondent à la commune attendue
 * @param {Array} records - Résultats de la recherche
 * @param {string} expectedCommune - Nom officiel de la commune attendue
 * @param {Array} expectedCPs - Codes postaux acceptés (incluant boîtes postales)
 * @returns {Array} - Résultats filtrés et validés
 */
function validateSearchResults(records, expectedCommune, expectedCPs) {
    const validRecords = records.filter(record => {
        const etab = record.fields;

        // Vérification du code postal (accepter tous les codes associés)
        const cpMatch = expectedCPs.includes(etab.code_postal);

        // Vérification de la commune (flexible)
        const communeName = (etab.nom_commune || etab.commune || etab.libelle_commune || '').toLowerCase();
        const expectedName = expectedCommune.toLowerCase();
        const communeMatch = communeName === expectedName ||
            communeName.includes(expectedName) ||
            expectedName.includes(communeName);

        return cpMatch && communeMatch;
    });

    // Log des résultats filtrés pour debugging
    const filteredOut = records.length - validRecords.length;
    if (filteredOut > 0) {
        console.log(`🧹 ${filteredOut} établissement(s) filtré(s) (commune/CP incohérent)`);
    }

    // Afficher les codes postaux trouvés
    const foundCPs = [...new Set(validRecords.map(r => r.fields.code_postal))].sort();
    if (foundCPs.length > 1) {
        showStatus(`✅ ${validRecords.length} établissement(s) trouvé(s) (CP: ${foundCPs.join(', ')})`, "success");
    } else {
        showStatus(`✅ ${validRecords.length} établissement(s) trouvé(s)`, "success");
    }

    return validRecords;
}

// Permettre la recherche avec la touche Entrée et le bouton
document.addEventListener('DOMContentLoaded', function() {
    const communeInput = document.getElementById('commune');
    const cpInput = document.getElementById('cp');
    const searchButton = document.querySelector('button');

    // Event listener pour le bouton (remplace onclick)
    searchButton.addEventListener('click', doSearch);

    // Event listener pour la touche Entrée
    [communeInput, cpInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                doSearch();
            }
        });
    });
});