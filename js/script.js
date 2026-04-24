// Store chart instances
const charts = {};

// Color del ahorro (naranja)
const SAVING_COLOR = 'rgba(255, 159, 64, 0.7)';
const SAVING_BORDER = '#f39c12';

const chartConfigs = [
    { id: 'card_elect', canvasId: 'chart_elect', label: 'Electricity', bgColor: 'rgba(255, 206, 86, 0.6)', borderColor: '#d4af37' },
    { id: 'card_water', canvasId: 'chart_water', label: 'Water', bgColor: 'rgba(54, 162, 235, 0.6)', borderColor: '#2980b9' },
    { id: 'card_office', canvasId: 'chart_office', label: 'Supplies', bgColor: 'rgba(255, 99, 132, 0.6)', borderColor: '#c0392b' },
    { id: 'card_clean', canvasId: 'chart_clean', label: 'Cleaning', bgColor: 'rgba(45, 106, 79, 0.6)', borderColor: '#1b4332' }
];

function initCharts() {
    const currentYear = new Date().getFullYear();
    const dynamicLabels = ['Current', (currentYear + 1).toString(), (currentYear + 2).toString(), (currentYear + 3).toString()];

    chartConfigs.forEach(config => {
        const ctx = document.getElementById(config.canvasId).getContext('2d');
        charts[config.id] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dynamicLabels,
                datasets: [
                    {
                        label: 'Projected Consumption',
                        data: [0, 0, 0, 0],
                        backgroundColor: config.bgColor,
                        borderColor: config.borderColor,
                        borderWidth: 2,
                        borderRadius: 4
                    },
                    {
                        label: 'Potential Savings',
                        data: [0, 0, 0, 0],
                        backgroundColor: SAVING_COLOR,
                        borderColor: SAVING_BORDER,
                        borderWidth: 2,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true }
                }
            }
        });
    });
    updateTableYears(currentYear);
}

function calculateAll() {
    const ipcValue = parseFloat(document.getElementById('ipc').value) || 0;
    const ipcFactor = 1 + (ipcValue / 100);

    let totalReductions = []; // Para calcular la media global después

    chartConfigs.forEach(config => {
        const card = document.getElementById(config.id);
        const baseVal = parseFloat(card.querySelector('.base-input').value) || 0;
        const unitMult = parseFloat(card.querySelector('.unit-select').value) || 1;
        const months = parseFloat(card.querySelector('.period-select').value) || 12;

        // CÁLCULO MULTIPLICATIVO REALISTA
        let remaining = 1;
        card.querySelectorAll('.reduce-check:checked').forEach(chk => {
            remaining *= (1 - parseFloat(chk.dataset.impact));
        });

        // El % final real que se reduce en esta tarjeta
        let reduction = 1 - remaining;
        totalReductions.push(reduction); // Guardamos para la media global

        const currentTotal = baseVal * unitMult * months;

        // Calculamos qué pasaría SIN ahorros (solo inflación)
        const rawY1 = currentTotal * ipcFactor;
        const rawY2 = currentTotal * Math.pow(ipcFactor, 2);
        const rawY3 = currentTotal * Math.pow(ipcFactor, 3);

        // Calculamos el valor real CON ahorros aplicados (el progreso del ahorro en 3 años)
        const year1 = rawY1 * (1 - (reduction * 0.3));
        const year2 = rawY2 * (1 - (reduction * 0.6));
        const year3 = rawY3 * (1 - reduction);

        // La diferencia (lo que se "pinta" de naranja)
        const diff1 = rawY1 - year1;
        const diff2 = rawY2 - year2;
        const diff3 = rawY3 - year3;

        card.querySelector('.res-box').innerHTML = `Projected Total: <b>${currentTotal.toLocaleString()} €</b>`;

        const chart = charts[config.id];
        chart.data.datasets[0].data = [currentTotal, year1, year2, year3];
        chart.data.datasets[1].data = [0, diff1, diff2, diff3];
        chart.update();
    });

    // --- ACTUALIZACIÓN DEL RECUADRO GLOBAL ---
    if (totalReductions.length === 4) {
        // Media global (en porcentaje real)
        let globalReduction = (totalReductions.reduce((a, b) => a + b, 0) / 4) * 100;

        const displayTotal = document.getElementById('total-reduction-value');
        const progressFill = document.getElementById('progress-fill');
        const message = document.getElementById('reduction-message');

        if (displayTotal && progressFill && message) {
            displayTotal.textContent = `-${globalReduction.toFixed(1)}%`;

            let progressPercent = (globalReduction / 30) * 100;
            if (progressPercent > 100) progressPercent = 100;
            progressFill.style.width = `${progressPercent}%`;

            if (globalReduction >= 30) {
                displayTotal.classList.add('goal-reached-text');
                progressFill.classList.add('goal-reached-bg');
                message.textContent = "✅ Goal Achieved! You have surpassed the 30% reduction using Circular Economy.";
                message.style.color = "#10b981";
            } else {
                displayTotal.classList.remove('goal-reached-text');
                progressFill.classList.remove('goal-reached-bg');
                message.textContent = "Select more measures above to reach the -30% goal in 3 years.";
                message.style.color = "#4b5563";
            }
        }
    }
}

function updateTableYears(currentYear) {
    const tableRows = document.querySelectorAll('#plan-body tr');
    if (tableRows.length >= 3) {
        tableRows[0].cells[0].innerText = currentYear + 1;
        tableRows[1].cells[0].innerText = currentYear + 2;
        tableRows[2].cells[0].innerText = currentYear + 3;
    }
}

async function loadRealData() {
    try {
        const response = await fetch('data/data.json');
        if (!response.ok) throw new Error("Error loading JSON");
        const data = await response.json();
        const electDaily = data.electricity_generation.reduce((acc, c) => acc + c.consumption_kWh, 0) / data.electricity_generation.length;
        const waterDaily = data.water_consumption_daily.reduce((acc, c) => acc + c.total_liters, 0) / data.water_consumption_daily.length;
        const totalOffice = data.office_consumables.reduce((acc, c) => acc + c.total_price, 0);
        const totalClean = data.cleaning_consumables.reduce((acc, c) => acc + c.total_price, 0);
        document.querySelector('#card_elect .base-input').value = (electDaily * 30).toFixed(0);
        document.querySelector('#card_water .base-input').value = ((waterDaily * 30) / 1000).toFixed(1);
        document.querySelector('#card_office .base-input').value = (totalOffice / 6).toFixed(2);
        document.querySelector('#card_clean .base-input').value = (totalClean / 6).toFixed(2);
        calculateAll();
    } catch (e) {
        console.error("Could not load data.json", e);
        calculateAll();
    }
}

window.onload = () => {
    initCharts();
    loadRealData();
};

document.addEventListener('input', (e) => {
    if (e.target.matches('.base-input, .unit-select, .period-select, .reduce-check, #ipc')) {
        calculateAll();
    }
});