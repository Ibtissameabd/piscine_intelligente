let tempChartInstance = null;
let allData = [];

// 1. Chargement initial des données
async function loadTempHistory() {
    try {
        const res = await fetch("/api/");
        const json = await res.json();

        if (!json.data || json.data.length === 0) {
            alert("⚠️ Aucune donnée disponible");
            return;
        }

        allData = json.data;

        const labels = json.data.map(row => {
            const date = new Date(row.dt);
            return date.toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        });
        const temps = json.data.map(row => row.temp);

        drawChart(labels, temps);
    } catch (error) {
        console.error("Erreur:", error);
        alert("Erreur lors du chargement des données");
    }
}

// 2. Fonction pour dessiner/redessiner le graphique avec gradient
function drawChart(labels, temps) {
    const ctx = document.getElementById('tempChart').getContext('2d');

    // Détruire l'ancien graphique s'il existe
    if (tempChartInstance) {
        tempChartInstance.destroy();
    }

    // Créer gradient dynamique
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);

    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const tempRange = maxTemp - minTemp || 1;

    const lowerLimit = 5;
    const upperLimit = 25;

    // Configuration du gradient selon les températures
    if (maxTemp <= lowerLimit) {
        gradient.addColorStop(0, 'rgba(79, 172, 254, 0.8)');
        gradient.addColorStop(1, 'rgba(79, 172, 254, 0.2)');
    } else if (minTemp >= upperLimit) {
        gradient.addColorStop(0, 'rgba(255, 107, 107, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 107, 107, 0.2)');
    } else {
        if (minTemp < lowerLimit) {
            const blueStop = (lowerLimit - minTemp) / tempRange;
            gradient.addColorStop(0, 'rgba(79, 172, 254, 0.2)');
            gradient.addColorStop(Math.min(blueStop, 1), 'rgba(79, 172, 254, 0.8)');
        }

        if (minTemp <= upperLimit && maxTemp >= lowerLimit) {
            const greenStart = Math.max(0, (lowerLimit - minTemp) / tempRange);
            const greenEnd = Math.min(1, (upperLimit - minTemp) / tempRange);
            gradient.addColorStop(greenStart, 'rgba(81, 207, 102, 0.8)');
            gradient.addColorStop(greenEnd, 'rgba(81, 207, 102, 0.6)');
        }

        if (maxTemp > upperLimit) {
            const redStop = (upperLimit - minTemp) / tempRange;
            gradient.addColorStop(Math.max(redStop, 0), 'rgba(255, 107, 107, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 107, 107, 0.8)');
        }
    }

    tempChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Température (°C)',
                data: temps,
                backgroundColor: gradient,
                borderColor: function(context) {
                    const value = context.dataset.data[context.dataIndex];
                    if (value < lowerLimit) return '#4facfe';
                    if (value >= lowerLimit && value <= upperLimit) return '#37b24d';
                    return '#f03e3e';
                },
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: function(context) {
                    const value = context.dataset.data[context.dataIndex];
                    if (value < lowerLimit) return '#4facfe';
                    if (value >= lowerLimit && value <= upperLimit) return '#37b24d';
                    return '#f03e3e';
                },
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                segment: {
                    borderColor: function(context) {
                        const value = context.p1.parsed.y;
                        if (value < lowerLimit) return '#4facfe';
                        if (value >= lowerLimit && value <= upperLimit) return '#37b24d';
                        return '#f03e3e';
                    }
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 14, weight: 'bold' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const temp = context.parsed.y;
                            let status = '';
                            if (temp < lowerLimit) status = ' ❄️ (Trop froid)';
                            else if (temp > upperLimit) status = ' 🔥 (Trop chaud)';
                            else status = ' ✅ (Normal)';
                            return 'Température: ' + temp.toFixed(1) + ' °C' + status;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return value + ' °C';
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// 3. Filtres par période

// Bouton "Dernières 24h"
function setLast24h() {
    if (allData.length === 0) return;

    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Réinitialiser les inputs
    const startInput = document.getElementById("startDate");
    const endInput = document.getElementById("endDate");
    if (startInput) startInput.value = "";
    if (endInput) endInput.value = "";

    filterAndDisplay(start, now);
}

// Bouton "Dernière semaine"
function setLastWeek() {
    if (allData.length === 0) return;

    const now = new Date();
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const startInput = document.getElementById("startDate");
    const endInput = document.getElementById("endDate");
    if (startInput) startInput.value = "";
    if (endInput) endInput.value = "";

    filterAndDisplay(start, now);
}

// Bouton "Dernier mois"
function setLastMonth() {
    if (allData.length === 0) return;

    const now = new Date();
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startInput = document.getElementById("startDate");
    const endInput = document.getElementById("endDate");
    if (startInput) startInput.value = "";
    if (endInput) endInput.value = "";

    filterAndDisplay(start, now);
}

// Bouton "Appliquer" (période personnalisée)
function applyCustomPeriod() {
    const startInput = document.getElementById("startDate").value;
    const endInput = document.getElementById("endDate").value;

    if (!startInput || !endInput) {
        alert("Veuillez sélectionner une date de début et de fin");
        return;
    }

    const start = new Date(startInput);
    const end = new Date(endInput);

    if (start >= end) {
        alert("La date de début doit être antérieure à la date de fin");
        return;
    }

    filterAndDisplay(start, end);
}

// Bouton "Réinitialiser"
function resetFilters() {
    const startInput = document.getElementById("startDate");
    const endInput = document.getElementById("endDate");
    if (startInput) startInput.value = "";
    if (endInput) endInput.value = "";

    // Afficher toutes les données
    const labels = allData.map(row => {
        const date = new Date(row.dt);
        return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    });
    const temps = allData.map(row => row.temp);

    drawChart(labels, temps);
}

// 4. Fonction de filtrage
function filterAndDisplay(startDate, endDate) {
    const filtered = allData.filter(row => {
        const rowDate = new Date(row.dt);
        return rowDate >= startDate && rowDate <= endDate;
    });

    if (filtered.length === 0) {
        alert("Aucune donnée pour cette période");
        return;
    }

    const labels = filtered.map(row => {
        const date = new Date(row.dt);
        return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    });
    const temps = filtered.map(row => row.temp);

    drawChart(labels, temps);
}

// Chargement initial
loadTempHistory();