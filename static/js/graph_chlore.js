let chloreChartInstance = null;
let allData = [];

// 1. Chargement initial des données
async function loadChloreHistory() {
    try {
        const res = await fetch("/api/chlore/");
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
        const chloreValues = json.data.map(row => row.chlore);

        drawChart(labels, chloreValues);
    } catch (error) {
        console.error("Erreur:", error);
        alert("Erreur lors du chargement des données");
    }
}

// 2. Fonction pour dessiner/redessiner le graphique
function drawChart(labels, chloreValues) {
    const ctx = document.getElementById('chloreChart').getContext('2d');

    if (chloreChartInstance) {
        chloreChartInstance.destroy();
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(240, 147, 251, 0.8)');
    gradient.addColorStop(1, 'rgba(245, 87, 108, 0.2)');

    chloreChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Chlore (ppm)',
                data: chloreValues,
                backgroundColor: gradient,
                borderColor: function(context) {
                    const value = context.dataset.data[context.dataIndex];
                    if (value < 1.0) return '#f03e3e';
                    if (value >= 1.0 && value <= 3.0) return '#37b24d';
                    return '#ff922b';
                },
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: function(context) {
                    const value = context.dataset.data[context.dataIndex];
                    if (value < 1.0) return '#f03e3e';
                    if (value >= 1.0 && value <= 3.0) return '#37b24d';
                    return '#ff922b';
                },
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                segment: {
                    borderColor: function(context) {
                        const value = context.p1.parsed.y;
                        if (value < 1.0) return '#f03e3e';
                        if (value >= 1.0 && value <= 3.0) return '#37b24d';
                        return '#ff922b';
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
                            const chlore = context.parsed.y;
                            let status = '';
                            if (chlore < 1.0) status = ' ⚠️ (Trop faible)';
                            else if (chlore > 3.0) status = ' ⚠️ (Trop élevé)';
                            else status = ' ✅ (Normal)';
                            return 'Chlore: ' + chlore.toFixed(2) + ' ppm' + status;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + ' ppm';
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
function setLast24h() {
    if (allData.length === 0) return;
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const startInput = document.getElementById("startDate");
    const endInput = document.getElementById("endDate");
    if (startInput) startInput.value = "";
    if (endInput) endInput.value = "";

    filterAndDisplay(start, now);
}

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

function resetFilters() {
    const startInput = document.getElementById("startDate");
    const endInput = document.getElementById("endDate");
    if (startInput) startInput.value = "";
    if (endInput) endInput.value = "";

    const labels = allData.map(row => {
        const date = new Date(row.dt);
        return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    });
    const chloreValues = allData.map(row => row.chlore);

    drawChart(labels, chloreValues);
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
    const chloreValues = filtered.map(row => row.chlore);

    drawChart(labels, chloreValues);
}

// Chargement initial
loadChloreHistory();