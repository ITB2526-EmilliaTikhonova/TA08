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

// Precios estimados para convertir consumo físico a Euros (puedes ajustarlos)
const PRICE_KWH = 0.16; // 0.16 € por kWh
const PRICE_M3 = 2.10;  // 2.10 € por m³

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

    let totalReductions = [];
    let globalCostEuros = 0;
    let totalKwhForKPI = 0;
    let totalLitersForKPI = 0;

    chartConfigs.forEach(config => {
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

        const currentTotal = baseVal * unitMult * months;
        let costInEuros = 0;
        let unitLabel = "€";

        // Ajuste según categoría para separar físicas de monetarias
        if (config.id === 'card_elect') {
            totalKwhForKPI = currentTotal;
            costInEuros = currentTotal * PRICE_KWH;
            unitLabel = "kWh";
        } else if (config.id === 'card_water') {
            totalLitersForKPI = currentTotal * 1000;
            costInEuros = currentTotal * PRICE_M3;
            unitLabel = "m³";
        } else {
            costInEuros = currentTotal;
            unitLabel = "€";
        }

        globalCostEuros += costInEuros;

        const rawY1 = currentTotal * ipcFactor;
        const rawY2 = currentTotal * Math.pow(ipcFactor, 2);
        const rawY3 = currentTotal * Math.pow(ipcFactor, 3);

        const year1 = rawY1 * (1 - (reduction * 0.3));
        const year2 = rawY2 * (1 - (reduction * 0.6));
        const year3 = rawY3 * (1 - reduction);

        const diff1 = rawY1 - year1;
        const diff2 = rawY2 - year2;
        const diff3 = rawY3 - year3;

        // Mostrar valores y actualizar el "Waiting for data..."
        card.querySelector('.res-box').innerHTML = `Projected Total: <b>${currentTotal.toLocaleString(undefined, {maximumFractionDigits: 2})} ${unitLabel}</b> <br><span style="font-size:0.8rem; font-weight:normal;">(Approx: ${costInEuros.toFixed(2)} €/year)</span>`;

        // Actualizar gráficos
        const chart = charts[config.id];
        chart.data.datasets[0].data = [currentTotal, year1, year2, year3];
        chart.data.datasets[1].data = [0, diff1, diff2, diff3];
        chart.update();
    });

    updateGlobalSummary(totalReductions);
    updateKPIs(totalKwhForKPI, totalLitersForKPI);
    updateGlobalCostProjection(globalCostEuros, ipcValue, totalReductions);
}

function updateGlobalSummary(totalReductions) {
    if (totalReductions.length !== 4) return;
    let globalReduction = (totalReductions.reduce((a, b) => a + b, 0) / 4) * 100;
    const displayTotal = document.getElementById('total-reduction-value');
    const progressFill = document.getElementById('progress-fill');
    const message = document.getElementById('reduction-message');

    if (displayTotal && progressFill && message) {
        displayTotal.textContent = `-${globalReduction.toFixed(1)}%`;
        let progressPercent = Math.min((globalReduction / 30) * 100, 100);
        progressFill.style.width = `${progressPercent}%`;

        if (globalReduction >= 30) {
            displayTotal.classList.add('goal-reached-text');
            progressFill.classList.add('goal-reached-bg');
            message.innerHTML = "✅ <b>Goal Achieved!</b> You have surpassed the 30% reduction using Circular Economy.";
            message.style.color = "#10b981";
        } else {
            displayTotal.classList.remove('goal-reached-text');
            progressFill.classList.remove('goal-reached-bg');
            message.textContent = "Select more measures above to reach the -30% goal in 3 years.";
            message.style.color = "#4b5563";
        }
    }
}

function updateKPIs(totalKwh, totalLiters) {
    let students = parseFloat(document.getElementById('students-input').value) || 1;
    let area = parseFloat(document.getElementById('area-input').value) || 1;

    let kpiElec = totalKwh / students;
    let kpiWater = totalLiters / area;

    const kpiContainer = document.getElementById('kpi-results');
    if (kpiContainer) {
        kpiContainer.innerHTML = `
            <div>⚡ <strong>Energy Efficiency:</strong> ${kpiElec.toFixed(2)} kWh/student</div>
            <div>💧 <strong>Water Efficiency:</strong> ${kpiWater.toFixed(2)} L/m²</div>
        `;
    }
}

function updateGlobalCostProjection(baseEuros, ipcValue, reductionsArray) {
    const tbody = document.getElementById('cost-projection-body');
    if (!tbody) return;

    let avgReduction = reductionsArray.reduce((a, b) => a + b, 0) / reductionsArray.length;
    let tasa = ipcValue / 100;
    let currentCost = baseEuros;

    const phaseIn = [0.33, 0.66, 1.0];

    let html = '';
    for (let i = 0; i < 3; i++) {
        currentCost = currentCost * (1 + tasa);
        let currentSavingPercent = avgReduction * phaseIn[i];
        let savingEuros = currentCost * currentSavingPercent;
        let finalCost = currentCost - savingEuros;

        html += `
            <tr>
                <td><strong>Year ${i + 1}</strong></td>
                <td>${currentCost.toFixed(2)} €</td>
                <td style="color: #d35400; font-weight: bold;">-${savingEuros.toFixed(2)} €</td>
                <td style="font-weight: bold; color: var(--text-main);">${finalCost.toFixed(2)} €</td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
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

        // Ejecutamos calculateAll después de inyectar los datos reales
        calculateAll();
    } catch (e) {
        console.error("Could not load data.json", e);
        // Si falla (por ejemplo si no usas un servidor local), ejecuta con los valores por defecto
        calculateAll();
    }
}

window.onload = () => {
    initCharts();
    loadRealData();
};

document.addEventListener('input', (e) => {
    // Escucha todos los inputs importantes para recalcular automáticamente
    if (e.target.matches('.base-input, .unit-select, .period-select, .reduce-check, #ipc, #students-input, #area-input')) {
        calculateAll();
    }
});
