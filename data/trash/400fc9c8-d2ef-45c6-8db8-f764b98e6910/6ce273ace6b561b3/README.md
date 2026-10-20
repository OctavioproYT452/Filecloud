# SpeedPulse - Medidor de Internet Profesional

Aplicación web moderna para medir la velocidad de conexión a Internet en tiempo real (Mbps y MB/s), diseñada específicamente para adaptarse a cualquier dispositivo (móviles, tablets y ordenadores) con un sofisticado **tema oscuro / claro** dinámico.

## 🚀 Características Principales

1. **Diseño Moderno y Adaptativo (Responsive):**
   - Interfaz minimalista inspirada en paneles de control profesionales.
   - Efectos visuales de brillo dinámico, fuentes tipográficas cuidadas (`Outfit` y `JetBrains Mono`) e iconos vectoriales (`FontAwesome`).
   - Tacógrafo circular animado en tiempo real que reacciona a la velocidad del test.

2. **Medición con APIs y CDNs Reales:**
   - **Latencia (Ping y Jitter):** Mide los tiempos de respuesta mediante pruebas de cabecera contra CDNs globales rápidos (Cloudflare y Google).
   - **Velocidad de Descarga:** Descarga real de paquetes de datos desde servidores CDN públicos midiendo el rendimiento en directo.
   - **Velocidad de Subida:** Envío de paquetes mediante peticiones asíncronas para calcular el ancho de banda de subida real.
   - **Doble Métrica:** Muestra simultáneamente los resultados tanto en **Mbps** (Megabits por segundo) como en **MB/s** (Megabytes por segundo).

3. **Diagnóstico de Red Automático:**
   - Detecta la **IP Pública**, el **ISP** (Proveedor de servicios de Internet) y la ubicación geográfica mediante la API gratuita `ipapi.co`.
   - Historial de pruebas recientes guardado durante la sesión.

---

## 📂 Estructura de Archivos Creada en `/medidor_internet/`

- `index.html` : Estructura HTML semántica y moderna de la aplicación.
- `style.css` : Estilos CSS avanzados con variables CSS, diseño adaptativo y soporte para tema oscuro/claro.
- `script.js` : Lógica completa de medición con APIs reales, cálculo dinámico de Mbps y MB/s, y manipulación del DOM.
