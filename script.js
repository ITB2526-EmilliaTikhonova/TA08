// Almacenar las instancias de los gráficos
const charts = {};

// Configuración inicial de los 4 gráficos
const chartConfigs = [
    { id: 'card_elect', canvasId: 'chart_elect', label: 'Proyección Eléctrica' },
    { id: 'card_water', canvasId: 'chart_water', label: 'Proyección de Agua' },
    { id: 'card_office', canvasId: 'chart_office', label: 'Proyección Consumibles' },
    { id: 'card_clean', canvasId: 'chart_clean', label: 'Proyección Limpieza' }
];

function initCharts() {
    // 1. Obtener el año actual dinámicamente
    const currentYear = new Date().getFullYear();

    // 2. Crear los textos para el eje X de los gráficos
    const dynamicLabels = [
        'Actual',
        (currentYear + 1).toString(),
        (currentYear + 2).toString(),
        (currentYear + 3).toString()
    ];

    chartConfigs.forEach(config => {
        const ctx = document.getElementById(config.canvasId).getContext('2d');
        charts[config.id] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dynamicLabels, // Aplicamos las etiquetas dinámicas aquí
                datasets: [{
                    label: config.label,
                    data: [0, 0, 0, 0],
                    backgroundColor: 'rgba(45, 106, 79, 0.6)',
                    borderColor: '#1b4332',
                    borderWidth: 2,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    });

    // 3. (Extra) Actualizar también la tabla de HTML para que coincida con los gráficos
    updateTableYears(currentYear);
}

// Función auxiliar para que la tabla del roadmap muestre también los años reales
function updateTableYears(currentYear) {
    const tableRows = document.querySelectorAll('#plan-body tr');
    // Verificamos que las filas existan antes de cambiarlas
    if (tableRows.length >= 3) {
        tableRows[0].cells[0].innerText = currentYear + 1;
        tableRows[1].cells[0].innerText = currentYear + 2;
        tableRows[2].cells[0].innerText = currentYear + 3;
    }
}

// Cargar datos reales del JSON
async function loadRealData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error("Error cargando JSON");
        const data = await response.json();

        // Calcular promedios mensuales
        const electDaily = data.electricity_generation.reduce((acc, c) => acc + c.consumption_kWh, 0) / data.electricity_generation.length;
        const waterDaily = data.water_consumption_daily.reduce((acc, c) => acc + c.total_liters, 0) / data.water_consumption_daily.length;

        const totalOffice = data.office_consumables.reduce((acc, c) => acc + c.total_price, 0);
        const totalClean = data.cleaning_consumables.reduce((acc, c) => acc + c.total_price, 0);

        // Asignar al HTML (multiplicado por 30 para hacer un mes)
        document.querySelector('#card_elect .base-input').value = (electDaily * 30).toFixed(0);
        document.querySelector('#card_water .base-input').value = ((waterDaily * 30) / 1000).toFixed(1); // a m3
        document.querySelector('#card_office .base-input').value = (totalOffice / 6).toFixed(2); // asumiendo 6 meses
        document.querySelector('#card_clean .base-input').value = (totalClean / 6).toFixed(2);

        calculateAll();
    } catch (e) {
        console.error("No se pudo cargar data.json", e);
        calculateAll(); // Recalcular con lo que haya escrito a mano
    }
}

// Lógica principal de cálculo
function calculateAll() {
    const ipcValue = parseFloat(document.getElementById('ipc').value) || 0;
    const ipcFactor = 1 + (ipcValue / 100);

    chartConfigs.forEach(config => {
        const card = document.getElementById(config.id);

        // 1. Obtener valores
        const baseVal = parseFloat(card.querySelector('.base-input').value) || 0;
        const unitMult = parseFloat(card.querySelector('.unit-select').value) || 1;
        const months = parseFloat(card.querySelector('.period-select').value) || 12;

        // 2. Porcentaje de reducción seleccionado en esta tarjeta
        let reduction = 0;
        card.querySelectorAll('.reduce-check:checked').forEach(chk => {
            reduction += parseFloat(chk.dataset.impact);
        });

        // 3. Cálculos
        const baseMonthly = baseVal * unitMult;
        const currentTotal = baseMonthly * months; // Año (x12) o Periodo Escolar (x10)

        // Proyección a 3 años aplicando IPC y Reducciones
        // Año 1: Sufre IPC, se aplica un 30% de las medidas planificadas
        const year1 = (currentTotal * ipcFactor) * (1 - (reduction * 0.3));
        // Año 2: Sufre IPC acumulado, se aplica el 60% de las medidas
        const year2 = (currentTotal * Math.pow(ipcFactor, 2)) * (1 - (reduction * 0.6));
        // Año 3: Sufre IPC acumulado, se aplica el 100% de las medidas
        const year3 = (currentTotal * Math.pow(ipcFactor, 3)) * (1 - reduction);

        // 4. Actualizar interfaz
        card.querySelector('.res-box').innerHTML = `Total Proyectado: <b>${currentTotal.toLocaleString()} €</b>`;

        // 5. Actualizar gráfico específico
        const chart = charts[config.id];
        chart.data.datasets[0].data = [currentTotal, year1, year2, year3];
        chart.update();
    });
}

// Inicialización y Event Listeners
window.onload = () => {
    initCharts();
    loadRealData();
};

document.addEventListener('input', (e) => {
    if (e.target.matches('.base-input, .unit-select, .period-select, .reduce-check, #ipc')) {
        calculateAll();
    }
});

document.getElementById('loadDefaults').onclick = loadRealData;