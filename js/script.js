// Store chart instances
const charts = {};
let globalChart;

// Color del ahorro (naranja)
const SAVING_COLOR = 'rgba(255, 159, 64, 0.7)';
const SAVING_BORDER = '#f39c12';

const chartConfigs = [
    { id: 'card_elect', canvasId: 'chart_elect', label: 'Electricity', bgColor: 'rgba(255, 206, 86, 0.2)', borderColor: '#d4af37' },
    { id: 'card_water', canvasId: 'chart_water', label: 'Water', bgColor: 'rgba(54, 162, 235, 0.2)', borderColor: '#2980b9' },
    { id: 'card_office', canvasId: 'chart_office', label: 'Supplies', bgColor: 'rgba(255, 99, 132, 0.2)', borderColor: '#c0392b' },
    { id: 'card_clean', canvasId: 'chart_clean', label: 'Cleaning', bgColor: 'rgba(45, 106, 79, 0.2)', borderColor: '#1b4332' }
];

// FACTORES DE ESTACIONALIDAD (0 = Enero, 11 = Diciembre)
// Simula el comportamiento real de un centro educativo a lo largo del año
const seasonalityFactors = {
    'Electricity': [1.2, 1.1, 1.0, 0.9, 0.9, 0.8, 0.2, 0.2, 0.9, 1.0, 1.1, 1.2], // Pico en invierno, cae en verano
    'Water':       [0.9, 0.9, 1.0, 1.0, 1.1, 1.2, 0.4, 0.4, 1.0, 1.0, 0.9, 0.9], // Sube en primavera/verano, cae en vacaciones
    'Supplies':    [0.9, 0.9, 0.9, 0.9, 0.9, 0.6, 0.1, 0.1, 1.6, 1.0, 0.9, 0.9], // Gran pico en septiembre por inicio de curso
    'Cleaning':    [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.6, 0.8, 1.2, 1.0, 1.0, 1.0]  // Limpieza a fondo antes de empezar el curso
};

function initCharts() {
    const currentYear = new Date().getFullYear();
    const dynamicLabels = ['Current', (currentYear + 1).toString(), (currentYear + 2).toString(), (currentYear + 3).toString()];

    // 1. Inicializar los gráficos de barras individuales (Vista a 3 Años)
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
                        backgroundColor: config.bgColor.replace('0.2', '0.6'), // Más opaco para las barras
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

    // 2. Generar etiquetas de los próximos 12 meses para el gráfico de líneas
    const monthNames = ["gen.", "febr.", "març", "abr.", "maig", "juny", "jul.", "ag.", "set.", "oct.", "nov.", "des."];
    const currentMonth = new Date().getMonth();
    let monthlyLabels = [];
    for (let i = 0; i < 12; i++) {
        let m = (currentMonth + i) % 12;
        let y = currentYear + Math.floor((currentMonth + i) / 12);
        monthlyLabels.push(`${monthNames[m]} '${y.toString().slice(-2)}`);
    }

    // 3. INICIALIZAR EL NUEVO GRÁFICO DE LÍNEAS GLOBAL (Vista de 12 Meses)
    const ctxGlobal = document.getElementById('global_projection_chart').getContext('2d');
    globalChart = new Chart(ctxGlobal, {
        type: 'line',
        data: {
            labels: monthlyLabels,
            datasets: chartConfigs.map(config => ({
                label: config.label,
                data: Array(12).fill(0),
                // Asignamos la electricidad al eje principal (y) y el resto al secundario (y1)
                yAxisID: config.id === 'card_elect' ? 'y' : 'y1',
                borderColor: config.borderColor,
                backgroundColor: config.bgColor,
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    title: { display: true, text: 'Electricidad (€)' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    title: { display: true, text: 'Agua, Material y Limpieza (€)' },
                    // Esto evita que las líneas de la cuadrícula se superpongan y hagan un lío
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });

    updateTableYears(currentYear);
}

function calculateAll() {
    const ipcValue = parseFloat(document.getElementById('ipc').value) || 0;
    const ipcFactor = 1 + (ipcValue / 100);
    const ipcMonthlyRate = (ipcValue / 100) / 12;

    let totalReductions = [];
    const currentMonth = new Date().getMonth();

    chartConfigs.forEach((config, index) => {
        const card = document.getElementById(config.id);
        const baseVal = parseFloat(card.querySelector('.base-input').value) || 0;
        const unitMult = parseFloat(card.querySelector('.unit-select').value) || 1;
        const months = parseFloat(card.querySelector('.period-select').value) || 12;

        let remaining = 1;
        card.querySelectorAll('.reduce-check:checked').forEach(chk => {
            remaining *= (1 - parseFloat(chk.dataset.impact));
        });

        let reduction = 1 - remaining;
        totalReductions.push(reduction);

        card.querySelector('.cat-perc').textContent = `-${(reduction * 100).toFixed(1)}%`;

        const monthlyCost = baseVal * unitMult;
        const currentTotal = monthlyCost * months;

        // --- CÁLCULO PARA GRÁFICOS DE BARRAS (3 AÑOS) ---
        const rawY1 = currentTotal * ipcFactor;
        const rawY2 = currentTotal * Math.pow(ipcFactor, 2);
        const rawY3 = currentTotal * Math.pow(ipcFactor, 3);

        const year1 = rawY1 * (1 - (reduction * 0.3));
        const year2 = rawY2 * (1 - (reduction * 0.6));
        const year3 = rawY3 * (1 - reduction);

        const diff1 = rawY1 - year1;
        const diff2 = rawY2 - year2;
        const diff3 = rawY3 - year3;

        card.querySelector('.res-box').innerHTML = `Projected Total: <b>${currentTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</b>`;

        const chart = charts[config.id];
        chart.data.datasets[0].data = [currentTotal, year1, year2, year3];
        chart.data.datasets[1].data = [0, diff1, diff2, diff3];
        chart.update();

        // --- CÁLCULO PARA GRÁFICO DE LÍNEAS GLOBAL (12 MESES CON ESTACIONALIDAD) ---
        if (globalChart) {
            let monthlyDataArray = [];
            for (let m = 0; m < 12; m++) {
                // Obtenemos el mes real del año (0-11) para aplicar su estacionalidad
                let actualMonthIndex = (currentMonth + m) % 12;
                let seasonalMultiplier = seasonalityFactors[config.label][actualMonthIndex];

                let reductionProgress = reduction * (m / 11);
                let inflationFactor = 1 + (ipcMonthlyRate * m);

                // Aplicamos el multiplicador estacional al coste base mensual
                let projectedMonthly = (monthlyCost * seasonalMultiplier * inflationFactor) * (1 - reductionProgress);
                monthlyDataArray.push(projectedMonthly);
            }
            globalChart.data.datasets[index].data = monthlyDataArray;
        }
    });

    if (globalChart) {
        globalChart.update();
    }

    // --- ACTUALIZACIÓN DEL RECUADRO GLOBAL ---
    if (totalReductions.length === 4) {
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
    const badges = document.querySelectorAll('.year-badge');
    if (badges.length >= 3) {
        badges[0].innerText = currentYear + 1;
        badges[1].innerText = currentYear + 2;
        badges[2].innerText = currentYear + 3;
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