# 📊 Dashboard de Proyección de Costos y Economía Circular

## 📝 Descripción
Este proyecto es un panel web interactivo diseñado para simular y visualizar la proyección de gastos operativos (Electricidad, Agua, Material de Oficina y Limpieza) a lo largo del tiempo. Permite evaluar el impacto financiero de implementar medidas de ahorro y estrategias de economía circular durante un periodo de 3 años, mostrando proyecciones mensuales y anuales ajustadas a la inflación (IPC) y a la estacionalidad del centro.

## ✨ Características Principales
* **Simulación en Tiempo Real:** Los gráficos se actualizan automáticamente al modificar parámetros como el consumo base, las medidas de ahorro o el IPC.
* **Proyección Anual (3 Años):** Gráficos de barras que comparan el gasto proyectado frente al ahorro potencial año tras año.
* **Proyección Mensual Dinámica:** Un gráfico de líneas con doble eje (Dual Axis) que visualiza la evolución del gasto en los próximos 12 meses, aplicando factores de estacionalidad reales (vacaciones, picos de inicio de curso, etc.).
* **Sistema de Metas:** Indicador de progreso global para alcanzar un objetivo de reducción de costes del 30%.
* **Carga de Datos Reales:** Integración con un archivo `data.json` para inicializar el panel con consumos históricos reales.

## 🛠️ Tecnologías Utilizadas
* **Frontend:** HTML5, CSS3, JavaScript (ES6+).
* **Librerías:** [Chart.js](https://www.chartjs.org/) para la renderización de los gráficos interactivos.
* **Datos:** Formato JSON para la ingesta de datos iniciales.

## 🚀 Instalación y Configuración (PyCharm)

1. **Clonar o descargar el proyecto:**
   Abre tu terminal en PyCharm y clona el repositorio (o simplemente abre la carpeta del proyecto en el IDE).
   ```bash
   git clone [URL_DEL_REPOSITORIO]
