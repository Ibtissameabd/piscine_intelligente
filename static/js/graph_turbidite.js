// graph_turbidite.js - Graphique pour l'historique de la turbidité

// Fonction pour charger et afficher le graphique de la turbidité
function loadTurbidityChart() {
    fetch('/api/')
        .then(response => response.json())
        .then(data => {
            const allData = data.data;

            // Filtrer les données pour ne garder que celles avec la turbidité
            const turbidityData = allData.filter(item => item.turbidity !== null && item.turbidity !== undefined);
            
            if (turbidityData.length === 0) {
                console.log("Aucune donnée de turbidité disponible");
                return;
            }

            // Trier les données par date
            turbidityData.sort((a, b) => new Date(a.dt) - new Date(b.dt));

            // Extraire les dates et les valeurs de turbidité
            const dates = turbidityData.map(item => new Date(item.dt).toLocaleDateString());
            const turbidityValues = turbidityData.map(item => item.turbidity);

            // Créer le graphique avec Chart.js
            const ctx = document.getElementById('turbidityChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Turbidité (NTU)',
                        data: turbidityValues,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Historique de la Turbidité'
                        },
                        legend: {
                            display: true
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            title: {
                                display: true,
                                text: 'Turbidité (NTU)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error('Erreur lors du chargement des données de turbidité:', error);
        });
}

// Charger le graphique quand la page est prête
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('turbidityChart')) {
        loadTurbidityChart();
    }
});