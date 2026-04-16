let data = null;

fetch("data.json")
  .then(response => response.json())
  .then(json => {
      data = json;
      console.log("Data loaded");
  })
  .catch(err => console.error("Error loading data.json", err));

function isIPCEnabled() {
    return document.getElementById("applyIPC")?.checked;
}

function isSeasonalEnabled() {
    return document.getElementById("applySeasonal")?.checked;
}

// Simple seasonal factors by month (0 = January, 11 = December)
const seasonalFactors = {
    electricity: [1.15, 1.10, 1.05, 0.95, 0.90, 0.90, 0.88, 0.90, 0.95, 1.00, 1.05, 1.10],
    water:       [0.85, 0.85, 0.90, 0.95, 1.00, 1.10, 1.20, 1.20, 1.05, 0.95, 0.90, 0.85],
    office:      [1.10, 1.05, 1.00, 1.00, 1.10, 1.15, 0.80, 0.80, 1.15, 1.10, 1.05, 0.90],
    cleaning:    [1.00, 1.00, 1.05, 1.05, 1.10, 1.10, 1.05, 1.05, 1.00, 1.00, 1.00, 1.00]
};

function averageFactor(key) {
    const arr = seasonalFactors[key];
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function applyIPCToAmount(amount, years = 1) {
    if (!isIPCEnabled()) return amount;
    return amount * Math.pow(1.03, years);
}


function parseDate(str) {
    return new Date(str);
}

// ---------- ELECTRICITY ----------

// 1) Projected electricity consumption for next year
function calculateElectricityYear() {
    if (!data) return;

    const arr = data.electricity_generation;
    const days = arr.length;

    const total = arr.reduce((sum, d) => sum + d.consumption_kWh, 0);
    const avgDaily = total / days;

    let projectedYear = avgDaily * 365;

    if (isSeasonalEnabled()) {
        const factor = averageFactor("electricity");
        projectedYear *= factor;
    }

    document.getElementById("electricityResult").innerHTML =
        `<p><strong>Projected yearly electricity consumption:</strong> ${projectedYear.toFixed(2)} kWh</p>
         <p>Based on an average of ${avgDaily.toFixed(2)} kWh/day.</p>`;
}

// 2) Electricity consumption in a selected period
function calculateElectricityPeriod() {
    if (!data) return;

    const startStr = document.getElementById("elecStart").value;
    const endStr = document.getElementById("elecEnd").value;
    const start = parseDate(startStr);
    const end = parseDate(endStr);

    const filtered = data.electricity_generation.filter(d => {
        const date = parseDate(d.date);
        return date >= start && date <= end;
    });

    if (filtered.length === 0) {
        document.getElementById("electricityResult").innerHTML =
            `<p>No electricity data in this period.</p>`;
        return;
    }

    const total = filtered.reduce((sum, d) => sum + d.consumption_kWh, 0);
    const avgDaily = total / filtered.length;

    document.getElementById("electricityResult").innerHTML =
        `<p><strong>Electricity consumption in selected period:</strong> ${total.toFixed(2)} kWh</p>
         <p>Average daily consumption: ${avgDaily.toFixed(2)} kWh/day.</p>`;
}

// ---------- WATER ----------

// 3) Projected water consumption for next year
function calculateWaterYear() {
    if (!data) return;

    const arr = data.water_consumption_daily;
    const days = arr.length;

    const total = arr.reduce((sum, d) => sum + d.total_liters, 0);
    const avgDaily = total / days;

    let projectedYear = avgDaily * 365;

    if (isSeasonalEnabled()) {
        const factor = averageFactor("water");
        projectedYear *= factor;
    }

    document.getElementById("waterResult").innerHTML =
        `<p><strong>Projected yearly water consumption:</strong> ${projectedYear.toFixed(0)} L</p>
         <p>Based on an average of ${avgDaily.toFixed(0)} L/day.</p>`;
}

// 4) Water consumption in a selected period
function calculateWaterPeriod() {
    if (!data) return;

    const startStr = document.getElementById("waterStart").value;
    const endStr = document.getElementById("waterEnd").value;
    const start = parseDate(startStr);
    const end = parseDate(endStr);

    const filtered = data.water_consumption_daily.filter(d => {
        const date = parseDate(d.date);
        return date >= start && date <= end;
    });

    if (filtered.length === 0) {
        document.getElementById("waterResult").innerHTML =
            `<p>No water data in this period.</p>`;
        return;
    }

    const total = filtered.reduce((sum, d) => sum + d.total_liters, 0);
    const avgDaily = total / filtered.length;

    document.getElementById("waterResult").innerHTML =
        `<p><strong>Water consumption in selected period:</strong> ${total.toFixed(0)} L</p>
         <p>Average daily consumption: ${avgDaily.toFixed(0)} L/day.</p>`;
}

// ---------- OFFICE CONSUMABLES ----------

// 5) Projected office consumables for next year (cost + units)
function calculateOfficeYear() {
    if (!data) return;

    const arr = data.office_consumables;

    const totalCost = arr.reduce((sum, d) => sum + d.total_price, 0);
    const totalUnits = arr.reduce((sum, d) => sum + d.quantity, 0);

    const factorSeasonal = isSeasonalEnabled() ? averageFactor("office") : 1;
    const baseProjectionCost = totalCost * factorSeasonal * (365 / 180);
    const projectedCost = applyIPCToAmount(baseProjectionCost, 1);

    const projectedUnits = totalUnits * factorSeasonal * (365 / 180);

    document.getElementById("officeResult").innerHTML =
        `<p><strong>Projected yearly office consumables cost:</strong> ${projectedCost.toFixed(2)} €</p>
         <p><strong>Projected yearly office consumables units:</strong> ${projectedUnits.toFixed(0)} units</p>`;
}


// 6) Office consumables in a selected period
function calculateOfficePeriod() {
    if (!data) return;

    const startStr = document.getElementById("officeStart").value;
    const endStr = document.getElementById("officeEnd").value;
    const start = parseDate(startStr);
    const end = parseDate(endStr);

    const filtered = data.office_consumables.filter(d => {
        const date = parseDate(d.date);
        return date >= start && date <= end;
    });

    if (filtered.length === 0) {
        document.getElementById("officeResult").innerHTML =
            `<p>No office consumables in this period.</p>`;
        return;
    }

    const totalCost = filtered.reduce((sum, d) => sum + d.total_price, 0);
    const totalUnits = filtered.reduce((sum, d) => sum + d.quantity, 0);

    document.getElementById("officeResult").innerHTML =
        `<p><strong>Office consumables cost in selected period:</strong> ${totalCost.toFixed(2)} €</p>
         <p><strong>Office consumables units in selected period:</strong> ${totalUnits.toFixed(0)} units</p>`;
}

// ---------- CLEANING CONSUMABLES ----------

// 7) Projected cleaning consumables for next year
function calculateCleaningYear() {
    if (!data) return;

    const arr = data.cleaning_consumables;

    const totalCost = arr.reduce((sum, d) => sum + d.total_price, 0);
    const totalUnits = arr.reduce((sum, d) => sum + d.quantity, 0);

    const factorSeasonal = isSeasonalEnabled() ? averageFactor("cleaning") : 1;
    const baseProjectionCost = totalCost * factorSeasonal * (365 / 180);
    const projectedCost = applyIPCToAmount(baseProjectionCost, 1);

    const projectedUnits = totalUnits * factorSeasonal * (365 / 180);

    document.getElementById("cleaningResult").innerHTML =
        `<p><strong>Projected yearly cleaning consumables cost:</strong> ${projectedCost.toFixed(2)} €</p>
         <p><strong>Projected yearly cleaning consumables units:</strong> ${projectedUnits.toFixed(0)} units</p>`;
}


// 8) Cleaning consumables in a selected period
function calculateCleaningPeriod() {
    if (!data) return;

    const startStr = document.getElementById("cleaningStart").value;
    const endStr = document.getElementById("cleaningEnd").value;
    const start = parseDate(startStr);
    const end = parseDate(endStr);

    const filtered = data.cleaning_consumables.filter(d => {
        const date = parseDate(d.date);
        return date >= start && date <= end;
    });

    if (filtered.length === 0) {
        document.getElementById("cleaningResult").innerHTML =
            `<p>No cleaning consumables in this period.</p>`;
        return;
    }

    const totalCost = filtered.reduce((sum, d) => sum + d.total_price, 0);
    const totalUnits = filtered.reduce((sum, d) => sum + d.quantity, 0);

    document.getElementById("cleaningResult").innerHTML =
        `<p><strong>Cleaning consumables cost in selected period:</strong> ${totalCost.toFixed(2)} €</p>
         <p><strong>Cleaning consumables units in selected period:</strong> ${totalUnits.toFixed(0)} units</p>`;
}

// ---------- SERVICES ----------

// 9) Projected services cost for next year
function calculateServicesYear() {
    if (!data) return;

    const arr = data.services;
    const totalCost = arr.reduce((sum, d) => sum + d.total_price, 0);

    const projectedCost = applyIPCToAmount(totalCost, 1);

    document.getElementById("servicesResult").innerHTML =
        `<p><strong>Projected yearly services cost:</strong> ${projectedCost.toFixed(2)} €</p>`;
}


// 10) Services cost in a selected period
function calculateServicesPeriod() {
    if (!data) return;

    const startStr = document.getElementById("servicesStart").value;
    const endStr = document.getElementById("servicesEnd").value;
    const start = parseDate(startStr);
    const end = parseDate(endStr);

    const filtered = data.services.filter(d => {
        const date = parseDate(d.date);
        return date >= start && date <= end;
    });

    if (filtered.length === 0) {
        document.getElementById("servicesResult").innerHTML =
            `<p>No services in this period.</p>`;
        return;
    }

    const totalCost = filtered.reduce((sum, d) => sum + d.total_price, 0);

    document.getElementById("servicesResult").innerHTML =
        `<p><strong>Services cost in selected period:</strong> ${totalCost.toFixed(2)} €</p>`;
}

// ---------- CO2 FROM ELECTRICITY ----------

// 11) CO₂ estimation from yearly electricity consumption
function calculateCO2() {
    if (!data) return;

    const arr = data.electricity_generation;
    const total = arr.reduce((sum, d) => sum + d.consumption_kWh, 0);
    const avgDaily = total / arr.length;
    const projectedYear = avgDaily * 365;

    const emissionFactor = 0.231; // kg CO2 per kWh (example)
    const co2 = projectedYear * emissionFactor;

    document.getElementById("co2Result").innerHTML =
        `<p><strong>Estimated yearly CO₂ from electricity:</strong> ${co2.toFixed(2)} kg CO₂</p>
         <p>Based on projected yearly electricity consumption of ${projectedYear.toFixed(2)} kWh.</p>`;
}
