// dashboard.js - Version complète avec gestion des incidents

let alertCount = 0;
const STORAGE_KEY_PREFIX = 'operator_validation_';
const STORAGE_ALERT_COUNT = 'alert_count';

// Charger le compteur d'alertes depuis localStorage
function loadAlertCount() {
    const saved = localStorage.getItem(STORAGE_ALERT_COUNT);
    if (saved) {
        alertCount = parseInt(saved, 10);
    }
}

// Sauvegarder le compteur d'alertes
function saveAlertCount() {
    localStorage.setItem(STORAGE_ALERT_COUNT, alertCount.toString());
}

// Charger les validations depuis localStorage
function loadValidations() {
    for (let i = 1; i <= 3; i++) {
        const saved = localStorage.getItem(STORAGE_KEY_PREFIX + i);
        if (saved) {
            const data = JSON.parse(saved);
            const checkbox = document.getElementById('ackCheckbox' + i);
            const commentText = document.getElementById('commentText' + i);
            
            if (checkbox) checkbox.checked = data.acknowledged;
            if (commentText) commentText.value = data.comment;

            if (data.acknowledged) {
                showValidationInfo(i, data);
            }
        }
    }
}

// Afficher les informations de validation
function showValidationInfo(operatorNum, data) {
    const infoDiv = document.getElementById('validationInfo' + operatorNum);
    if (!infoDiv) return;
    
    const date = new Date(data.timestamp);
    infoDiv.innerHTML = `✓ Accusé de réception validé le ${date.toLocaleString('fr-FR')}<br>Commentaire: ${data.comment}`;
    infoDiv.style.display = 'block';
}

// Valider un opérateur
async function validateOperator(operatorNum) {
    const checkbox = document.getElementById('ackCheckbox' + operatorNum);
    const comment = document.getElementById('commentText' + operatorNum).value;

    if (!checkbox || !checkbox.checked) {
        alert('Veuillez cocher l\'accusé de réception avant de valider.');
        return;
    }

    if (!comment.trim()) {
        alert('Veuillez ajouter un commentaire.');
        return;
    }

    const validationData = {
        operator: operatorNum,
        acknowledged: true,
        comment: comment,
        timestamp: new Date().toISOString()
    };

    // Sauvegarder dans localStorage
    localStorage.setItem(STORAGE_KEY_PREFIX + operatorNum, JSON.stringify(validationData));

    // Envoyer au serveur
    try {
        const response = await fetch('/incident/update/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                op: operatorNum,
                ack: true,
                comment: comment
            })
        });

        if (response.ok) {
            showValidationInfo(operatorNum, validationData);
            alert(`Validation de l'Opérateur ${operatorNum} enregistrée avec succès !`);
        } else {
            alert('Erreur lors de l\'enregistrement sur le serveur');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showValidationInfo(operatorNum, validationData);
        alert(`Validation de l'Opérateur ${operatorNum} enregistrée localement`);
    }
}

// Récupérer le token CSRF pour Django
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Calculer le temps écoulé
function getTimeElapsed(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 86400) {
        const hours = Math.floor(diffSec / 3600);
        const minutes = Math.floor((diffSec % 3600) / 60);
        const seconds = diffSec % 60;

        let parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}min`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

        return `Il y a ${parts.join(' ')}`;
    }

    const diffDays = Math.floor(diffSec / 86400);
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = Math.floor((diffDays % 365) % 30);

    let parts = [];
    if (years > 0) parts.push(`${years} an${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} mois`);
    if (days > 0) parts.push(`${days} jour${days > 1 ? 's' : ''}`);

    return `Il y a ${parts.join(', ')}`;
}

// Charger les dernières données
async function loadLatest() {
    try {
        const response = await fetch("/latest/");
        const data = await response.json();

        const t = data.temperature;
        const h = data.humidity;
        const timeElapsed = getTimeElapsed(data.timestamp);

        // Affichage des valeurs
        document.getElementById("tempValue").textContent = t.toFixed(1) + " °C";
        document.getElementById("humValue").textContent = h.toFixed(1) + " %";
        document.getElementById("tempTime").textContent = timeElapsed;
        document.getElementById("humTime").textContent = timeElapsed;

        // Gestion des incidents
        const statusElement = document.getElementById("statusState");
        const bodyElement = document.body;
        const tempCard = document.getElementById("tempCard");
        const humCard = document.getElementById("humCard");
        const incidentContainer = document.getElementById("incidentContainer");

        if (t < 2 || t > 8) {
            // INCIDENT
            if (statusElement) {
                statusElement.textContent = `⚠️ INCIDENT : Température hors plage (2-8°C) ! Température actuelle: ${t.toFixed(1)}°C`;
                statusElement.className = "status-state incident";
            }
            
            if (bodyElement) bodyElement.className = "incident";
            if (tempCard) tempCard.className = "metric-card incident";
            if (humCard) humCard.className = "metric-card incident";
            if (incidentContainer) incidentContainer.className = "incident-container incident";

            alertCount++;
            saveAlertCount();
        } else {
            // NORMAL
            if (statusElement) {
                statusElement.textContent = "✅ Pas d'incident";
                statusElement.className = "status-state ok";
            }
            
            if (bodyElement) bodyElement.className = "normal";
            if (tempCard) tempCard.className = "metric-card normal";
            if (humCard) humCard.className = "metric-card normal";
            if (incidentContainer) incidentContainer.className = "incident-container normal";

            if (alertCount > 0) {
                alertCount = 0;
                saveAlertCount();
                // Effacer les validations
                for (let i = 1; i <= 3; i++) {
                    localStorage.removeItem(STORAGE_KEY_PREFIX + i);
                    const checkbox = document.getElementById('ackCheckbox' + i);
                    const commentText = document.getElementById('commentText' + i);
                    const validationInfo = document.getElementById('validationInfo' + i);
                    
                    if (checkbox) checkbox.checked = false;
                    if (commentText) commentText.value = '';
                    if (validationInfo) validationInfo.style.display = 'none';
                }
            }
        }

        // Mise à jour du compteur
        const alertCounter = document.getElementById("alertCounter");
        if (alertCounter) {
            alertCounter.textContent = "Compteur d'alertes : " + alertCount;
        }

        // Affichage des opérateurs selon le compteur
        const op1 = document.getElementById("op1");
        const op2 = document.getElementById("op2");
        const op3 = document.getElementById("op3");
        
        if (op1) op1.style.display = alertCount > 0 ? "block" : "none";
        if (op2) op2.style.display = alertCount > 3 ? "block" : "none";
        if (op3) op3.style.display = alertCount > 6 ? "block" : "none";

    } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
        const statusElement = document.getElementById("statusState");
        if (statusElement) {
            statusElement.textContent = "❌ Erreur de connexion au serveur";
            statusElement.className = "status-state incident";
        }
        if (document.body) {
            document.body.className = "incident";
        }
    }
}

// Chargement initial
loadAlertCount();
loadValidations();
loadLatest();

// Rafraîchissement automatique toutes les 8 secondes
setInterval(loadLatest, 8000);