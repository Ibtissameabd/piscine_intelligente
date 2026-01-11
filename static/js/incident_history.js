let allIncidents = [];

// Charger les incidents depuis l'API
async function loadIncidents() {
    try {
        console.log('Chargement des incidents...');
        const response = await fetch("/api/incidents/all/");

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('Incidents reçus:', data);

        allIncidents = data;
        renderIncidents(allIncidents);
        updateStats(allIncidents);
    } catch (error) {
        console.error("Erreur lors du chargement des incidents:", error);
        document.getElementById('incidentsList').innerHTML = `
            <div class="no-incidents">
                <div class="no-incidents-icon">⚠️</div>
                <p>Erreur lors du chargement des incidents: ${error.message}</p>
            </div>
        `;
    }
}

// Déterminer le niveau d'incident selon le compteur
function getIncidentLevel(counter) {
    if (counter > 6) return 3;
    if (counter > 3) return 2;
    if (counter > 0) return 1;
    return 0;
}

// Échapper le HTML pour éviter XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Rendre les incidents
function renderIncidents(incidents) {
    const container = document.getElementById('incidentsList');

    if (!incidents || incidents.length === 0) {
        container.innerHTML = `
            <div class="no-incidents">
                <div class="no-incidents-icon">✅</div>
                <p>Aucun incident enregistré</p>
            </div>
        `;
        return;
    }

    container.innerHTML = incidents.map(incident => {
        const level = getIncidentLevel(incident.counter);
        const isOpen = incident.is_open;
        const statusClass = isOpen ? '' : 'resolved';
        const statusText = isOpen ? '⚠️ Actif' : '✓ Résolu';
        const statusBadgeClass = isOpen ? 'badge-level-1' : 'badge-resolved';

        const startDate = new Date(incident.start_at);
        const endDate = incident.end_at ? new Date(incident.end_at) : null;

        // Calculer la durée
        let duration = 'En cours';
        if (endDate) {
            const durationMs = endDate - startDate;
            duration = formatDuration(durationMs);
        }

        // Construire les commentaires
        let commentsHTML = '';
        let hasComments = false;

        if (incident.op1_comment) {
            hasComments = true;
            commentsHTML += `
                <div class="incident-comment">
                    <div class="comment-header">💬 Opérateur 1 ${incident.op1_ack ? '✓' : ''}</div>
                    <div class="comment-text">${escapeHtml(incident.op1_comment)}</div>
                </div>
            `;
        }

        if (incident.op2_comment) {
            hasComments = true;
            commentsHTML += `
                <div class="incident-comment">
                    <div class="comment-header">💬 Opérateur 2 ${incident.op2_ack ? '✓' : ''}</div>
                    <div class="comment-text">${escapeHtml(incident.op2_comment)}</div>
                </div>
            `;
        }

        if (incident.op3_comment) {
            hasComments = true;
            commentsHTML += `
                <div class="incident-comment">
                    <div class="comment-header">💬 Opérateur 3 ${incident.op3_ack ? '✓' : ''}</div>
                    <div class="comment-text">${escapeHtml(incident.op3_comment)}</div>
                </div>
            `;
        }

        // Déterminer qui a résolu l'incident
        let resolvedByText = '';
        if (!isOpen && (incident.op1_ack || incident.op2_ack || incident.op3_ack)) {
            if (incident.op1_ack) {
                resolvedByText = '✓ Résolu par Opérateur 1';
            } else if (incident.op2_ack) {
                resolvedByText = '✓ Résolu par Opérateur 2';
            } else if (incident.op3_ack) {
                resolvedByText = '✓ Résolu par Opérateur 3';
            }
        }
        
        return `
            <div class="incident-card level-${level} ${statusClass}">
                <div class="incident-header">
                    <div class="incident-title">
                        🚨 Incident #${incident.id} - Niveau ${level}
                    </div>
                    <div>
                        <span class="incident-badge badge-level-${level}">Opérateur ${level}</span>
                        <span class="incident-badge ${statusBadgeClass}">${statusText}</span>
                    </div>
                </div>

                <div class="incident-details">
                    <div class="detail-item">
                        <div class="detail-label">📅 Date de début</div>
                        <div class="detail-value">${startDate.toLocaleString('fr-FR')}</div>
                    </div>

                    <div class="detail-item">
                        <div class="detail-label">📅 Date de fin</div>
                        <div class="detail-value">${endDate ? endDate.toLocaleString('fr-FR') : 'En cours'}</div>
                    </div>

                    ${resolvedByText ? `
                    <div class="detail-item">
                        <div class="detail-label">👤 Résolu par</div>
                        <div class="detail-value">${resolvedByText}</div>
                    </div>` : ''}

                    <div class="detail-item">
                        <div class="detail-label">⏱️ Durée</div>
                        <div class="detail-value">${duration}</div>
                    </div>

                    <div class="detail-item">
                        <div class="detail-label">🌡️ Température max</div>
                        <div class="detail-value">${incident.max_temp.toFixed(1)} °C</div>
                    </div>

                    <div class="detail-item">
                        <div class="detail-label">📊 Compteur</div>
                        <div class="detail-value">${incident.counter} alertes</div>
                    </div>
                </div>

                ${hasComments ? commentsHTML : ''}
            </div>
        `;
    }).join('');
}

// Formater la durée
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}j ${hours % 24}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}min`;
    } else if (minutes > 0) {
        return `${minutes}min`;
    } else {
        return `${seconds}s`;
    }
}

// Filtrer les incidents
function filterIncidents() {
    const level = document.getElementById("filterLevel").value;
    const status = document.getElementById("filterStatus").value;
    const dateStart = document.getElementById("filterDateStart").value;
    const dateEnd = document.getElementById("filterDateEnd").value;

    console.log('Filtrage:', { level, status, dateStart, dateEnd });

    let filtered = allIncidents.filter(incident => {
        const incidentLevel = getIncidentLevel(incident.counter);
        const incidentStatus = incident.is_open ? 'active' : 'resolved';

        // Filtre par niveau
        if (level !== "all" && incidentLevel !== parseInt(level)) {
            return false;
        }

        // Filtre par statut
        if (status !== "all" && incidentStatus !== status) {
            return false;
        }

        // Filtre par date
        const incidentDate = new Date(incident.start_at);
        if (dateStart && incidentDate < new Date(dateStart)) {
            return false;
        }
        if (dateEnd) {
            const endDate = new Date(dateEnd);
            endDate.setHours(23, 59, 59, 999);
            if (incidentDate > endDate) {
                return false;
            }
        }

        return true;
    });

    console.log('Incidents filtrés:', filtered.length);
    renderIncidents(filtered);
    updateStats(filtered);
}

// Mettre à jour les statistiques
function updateStats(incidents) {
    const total = incidents.length;
    const active = incidents.filter(i => i.is_open).length;
    const resolved = incidents.filter(i => !i.is_open).length;

    // Calcul du temps moyen de réponse (en minutes)
    const responseTimes = [];

    for (const incident of incidents) {
        const start = new Date(incident.start_at);

        // Trouver la première réponse d'opérateur
        let ackDate = null;
        if (incident.op1_saved_at) {
            ackDate = new Date(incident.op1_saved_at);
        } else if (incident.op2_saved_at) {
            ackDate = new Date(incident.op2_saved_at);
        } else if (incident.op3_saved_at) {
            ackDate = new Date(incident.op3_saved_at);
        }

        if (ackDate && !isNaN(ackDate.getTime())) {
            const responseTime = (ackDate - start) / 1000 / 60; // en minutes
            if (responseTime >= 0) {
                responseTimes.push(responseTime);
            }
        }
    }

    const avgMinutes = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const hours = Math.floor(avgMinutes / 60);
    const minutes = Math.round(avgMinutes % 60);

    // Mettre à jour l'affichage
    const totalEl = document.getElementById("totalIncidents");
    const activeEl = document.getElementById("activeIncidents");
    const resolvedEl = document.getElementById("resolvedIncidents");
    const avgTimeEl = document.getElementById("avgResponseTime");

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (resolvedEl) resolvedEl.textContent = resolved;
    if (avgTimeEl) {
        avgTimeEl.textContent = hours > 0
            ? `${hours}h ${minutes}min`
            : `${minutes}min`;
    }
}

// Chargement initial
console.log('Démarrage du chargement des incidents...');
loadIncidents();

// Rafraîchir toutes les 30 secondes
setInterval(loadIncidents, 30000);