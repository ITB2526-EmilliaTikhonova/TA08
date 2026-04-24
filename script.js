let myChart;

// 1. CARGA DE DATOS DESDE data.json
async function loadRealData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error("No se pudo cargar el archivo data.json");
        const data = await response.json();

        // --- Procesamiento de Electricidad ---
        const avgElect = data.electricity_generation.reduce((acc, c) => acc + c.consumption_kWh, 0) / data.electricity_generation.length;

        // --- Procesamiento de Agua (Liters -> m3) ---
        const avgWaterLiters = data.water_consumption_daily.reduce((acc, c) => acc + c.total_liters, 0) / data.water_consumption_daily.length;
        const avgWaterM3 = avgWaterLiters / 1000;

        // --- Procesamiento de Consumibles (Oficina y Limpieza) ---
        const totalOffice = data.office_consumables.reduce((acc, c) => acc + c.total_price, 0);
        const totalClean = data.cleaning_consumables.reduce((acc, c) => acc + c.total_price, 0);

        // Rellenar la interfaz con las medias mensuales calculadas
        document.getElementById('elect_base').value = (avgElect * 30).toFixed(0);
        document.getElementById('agua_base').value = (avgWaterM3 * 30).toFixed(1);
        document.getElementById('office_base').value = (totalOffice / 6).toFixed(2); // Estimación 6 meses de datos
        document.getElementById('clean_base').value = (totalClean / 6).toFixed(2);

        // Una vez cargados los datos, calculamos todo por primera vez
        calculate();
    } catch (e) {
        console.error("Error al cargar los datos:", e);
        // Fallback en caso de error para que la calculadora no esté vacía
        calculate();
    }
}

// 2. LÓGICA DE CÁLCULO MAESTRA
function calculate() {
    // Capturar IPC y factores de unidad
    const ipcValue = parseFloat(document.getElementById('ipc').value) || 0;
    const ipcFactor = 1 + (ipcValue / 100);

    // Obtener valores de entrada multiplicados por sus selectores de unidad
    const vals = {
        energy: (parseFloat(document.getElementById('elect_base').value) || 0) * parseFloat(document.getElementById('unit_elect').value),
        water: (parseFloat(document.getElementById('agua_base').value) || 0) * parseFloat(document.getElementById('unit_water').value),
        office: (parseFloat(document.getElementById('office_base').value) || 0) * parseFloat(document.getElementById('unit_office').value),
        clean: (parseFloat(document.getElementById('clean_base').value) || 0) * parseFloat(document.getElementById('unit_clean').value)
    };

    // Calcular el porcentaje total de reducción basado en los checkboxes (Economía Circular)
    let totalRedPct = 0;
    document.querySelectorAll('.reduce-check:checked').forEach(c => {
        totalRedPct += parseFloat(c.dataset.impact);
    });

    // Consumo Mensual y Anual
    const monthlyTotal = vals.energy + vals.water + vals.office + vals.clean;
    const currentAnnualTotal = monthlyTotal * 12;
    const targetAnnualTotal = currentAnnualTotal * (1 - totalRedPct);

    // Actualizar los cuadros de resultados individuales
    updateResultBoxes(vals);

    // Actualizar el Gráfico y la Tabla con la tendencia IPC
    updateNaturalChart(currentAnnualTotal, targetAnnualTotal, ipcFactor);
    updateTimeline(totalRedPct);
}

function updateResultBoxes(vals) {
    document.getElementById('res_elect').innerHTML = `Mensual: <b>${vals.energy.toFixed(2)}</b>`;
    document.getElementById('res_water').innerHTML = `Mensual: <b>${vals.water.toFixed(2)}</b>`;
    document.getElementById('res_office').innerHTML = `Mensual: <b>${vals.office.toFixed(2)}</b>`;
    document.getElementById('res_clean').innerHTML = `Mensual: <b>${vals.clean.toFixed(2)}</b>`;
}

// 3. GRÁFICO PRECISO Y NATURAL (Con tendencia IPC inicial)
function initChart() {
    const ctx = document.getElementById('reductionChart').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Actual', 'Año 1', 'Año 2', 'Año 3'],
            datasets: [{
                label: 'Proyección de Gastos (€)',
                data: [0, 0, 0, 0],
                borderColor: '#1b4332',
                backgroundColor: 'rgba(45, 106, 79, 0.1)',
                fill: true,
                tension: 0.45, // Crea la curva orgánica
                pointRadius: 6,
                pointBackgroundColor: '#1b4332',
                borderWidth: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: '#f0f0f0' },
                    ticks: { callback: (v) => v.toLocaleString() + '€' }
                }
            }
        }
    });
}

function updateNaturalChart(current, target, ipc) {
    if (!myChart) return;

    // Simulación de curva realista:
    // Año 1: El coste sube por el IPC, pero se mitiga un poco con medidas iniciales (3%).
    const year1Cost = current * ipc * 0.97;
    const totalReductionValue = current - target;

    // Año 2: Las medidas estructurales (placas, reciclaje) ganan a la inflación.
    const year2Cost = current - (totalReductionValue * 0.60);

    myChart.data.datasets[0].data = [
        current,      // Punto 0: Hoy
        year1Cost,    // Punto 1: Subida por IPC vs Ahorro inicial
        year2Cost,    // Punto 2: Descenso marcado
        target        // Punto 3: Objetivo final
    ];
    myChart.update();
}

// 4. TABLA DE CRONOGRAMA A 3 AÑOS
function updateTimeline(pct) {
    const planBody = document.getElementById('plan-body');
    const roadmap = [
        { year: "Año 1", obj: "Auditoría e Inversión", action: "LED y Sensores de flujo", kpi: `-${(pct*30).toFixed(1)}%` },
        { year: "Año 2", obj: "Economía Circular", action: "Reciclaje de aguas y Solar", kpi: `-${(pct*65).toFixed(1)}%` },
        { year: "Año 3", obj: "Optimización Total", action: "Bulk Purchase & Residuo 0", kpi: `-${(pct*100).toFixed(1)}%` }
    ];

    planBody.innerHTML = roadmap.map(r => `
        <tr>
            <td>${r.year}</td>
            <td>${r.obj}</td>
            <td>${r.action}</td>
            <td style="color:#1b4332; font-weight:bold">${r.kpi}</td>
        </tr>
    `).join('');
}

// 5. EVENTOS E INICIALIZACIÓN
window.onload = () => {
    initChart();
    loadRealData();
};

// Escuchar cambios en cualquier input, select o checkbox
document.addEventListener('input', (e) => {
    if (e.target.matches('input, select, .reduce-check')) calculate();
});

document.getElementById('loadDefaults').onclick = loadRealData;