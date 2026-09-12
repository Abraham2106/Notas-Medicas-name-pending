# Actualización de estado de Abraham — Oira

**12 de septiembre de 2026 · Inferencia local, gestión de GPU y experiencia de revisión**

Hoy avanzamos de una base de transcripción local hacia un flujo conectado de
Whisper → Qwen → revisión médica. El trabajo incluyó captura de audio, gestión
del ciclo de vida de modelos, selección automática de GPU, estructuración del
borrador y una interfaz que muestra el progreso sin detener el procesamiento.

Este update resume los cambios registrados hoy en el repositorio y la evidencia
disponible. Es un avance de prototipo, no una certificación de calidad clínica
ni de compatibilidad con cualquier equipo.

## Model Offloading — liberar memoria antes del siguiente modelo

Integramos un runtime compartido que coordina carga, uso y descarga de Whisper
y Qwen. Whisper se prepara para transcribir y se descarga antes de cargar el
generador. Qwen puede permanecer residente durante la revisión; al preparar la
siguiente consulta, se libera antes de volver a cargar Whisper.

**Por qué:** el equipo de referencia tiene una RTX 2050 de 4 GB. La residencia
secuencial evita solicitar memoria para los dos modelos grandes a la vez.
Aquí «offloading» significa descargar un modelo para liberar sus recursos;
no una migración automática de capas a RAM o CPU.

El runtime también coordina solicitudes de preparación, estados, cancelación,
cargas tardías y cierre. Si la descarga requerida falla, no debe continuar
como si hubiera memoria disponible para el siguiente modelo.

## Warm-up y Fast Handoff — preparar antes y evitar esperas innecesarias

La acción **Preparar grabación** inicia el calentamiento de Whisper, mientras
el acceso al micrófono sigue dependiendo de pulsar **Grabar**. Se separaron
la preparación del modelo y la captura para hacer visible cuándo comienza
realmente la grabación.

Al terminar Whisper, el backend entrega la transcripción e inicia el cambio
a Qwen sin esperar la animación de la UI. Reutiliza los metadatos del dispositivo
obtenidos durante la preparación y evita otra consulta de recursos entre modelos.

Un diagnóstico local guardado comparó dos ejecuciones: el intervalo entre
finalizar la transcripción y solicitar la carga de Qwen pasó de **7790 ms a
205 ms**. Se usó un WAV sintético silencioso de 0,5 segundos. Esta cifra mide
ese tramo del handoff en esas dos ejecuciones, no el tiempo total de una consulta
ni un benchmark general. Los registros permanecen en `reports/`, fuera de los
commits del producto.

## GPU Auto Selector — selección automática con intención agnóstica

El selector descubre adaptadores mediante los recursos reportados por QVAC y
utiliza memoria y descriptores para elegir una GPU. La aplicación ya no depende
exclusivamente de fijar manualmente el modelo comercial de la tarjeta.

**Por qué:** separar la elección del dispositivo de la configuración de Whisper
y Qwen permite adaptar el procesamiento al equipo y mostrar qué se solicitó.
El panel distingue la selección solicitada de la evidencia efectiva disponible.

**Alcance actual:** es una primera aproximación a un selector agnóstico, no una
implementación portable demostrada. Aún usa heurísticas por nombre para detectar
integradas, prioriza de manera discutible la VRAM desconocida e infiere índices
del backend a partir del ranking de memoria. Falta mapear identidades contra la
enumeración real de cada backend y evaluar múltiples dispositivos.

En el probe local de Qwen, `main-gpu=1` correspondió a **NVIDIA GeForce RTX 2050,
backend `vulkan1`**. La memoria NVIDIA utilizada pasó de 595 a 3583 MiB al cargar.
Eso aporta evidencia para esa ejecución de Qwen; no confirma por sí solo el
dispositivo efectivo de Whisper ni la portabilidad del selector. Los scripts
de laboratorio conservan supuestos locales: el smoke de Qwen solicita índice 1
y el probe NVIDIA utiliza `nvidia-smi`.

## Qwen Draft Engine — estructuración local de la nota

Conectamos **Qwen3 4B Q4_K_M** al puerto de estructuración de QVAC. El flujo activo
ya genera borradores con el modelo local. Incluye preparación de mensajes,
división de transcripciones largas en chunks, ensamblado de resultados y
conversión a las siete secciones editables de Oira.

**Por qué:** completar el paso entre la transcripción y una nota organizada que
el médico pueda revisar, manteniendo la ejecución dentro del runtime local.

La salida actual se normaliza de forma permisiva: se intenta extraer JSON y
puede conservarse texto de respaldo. No hay todavía validación semántica fuerte,
verificación de negaciones o garantía de ausencia de invenciones. Los helpers
de evidencia son provisionales. Se corrigió la documentación que describía
Qwen 1.7B o controles más estrictos que los implementados.

## Audio Capture Recovery — una entrada más consistente para Whisper

Se corrigió la reanudación de `AudioContext` suspendido en Electron y se permitió
recibir el callback final antes de cerrar la captura. El preprocesamiento recorta
silencios periféricos con margen para voz y aplica ganancia acotada a audio débil,
manteniendo el formato PCM esperado.

**Por qué:** una captura incompleta o demasiado baja puede perjudicar la entrada
al transcriptor antes incluso de que el modelo intervenga. Se añadieron casos
de regresión para recorte, normalización y conservación del formato; eso no
equivale todavía a una medición de mejora en reconocimiento de voz.

También se alineó la integración con **QVAC 0.18.2**, Whisper Large V3 Turbo y
su configuración en español. La caché de modelos se resuelve desde el lanzamiento
en raíz o en desktop; los pesos descargados quedan ignorados por Git.

## Progressive Transcript — resultados visibles mientras Qwen trabaja

La UI recibe la transcripción en cuanto termina Whisper y la presenta
progresivamente durante la estructuración. La animación conserva el texto
original, permite **Mostrar todo**, respeta movimiento reducido y deja de
forzar el seguimiento cuando el usuario se desplaza por el contenido.

**Por qué:** mostrar un resultado real durante la espera y permitir su lectura
sin retrasar el trabajo del backend. Es una presentación de la transcripción
ya recibida, no streaming de reconocimiento palabra por palabra.

Si falla la estructuración, la transcripción se conserva y se muestra completa.
El mensaje diferencia el fallo de transcripción del fallo al organizar el
borrador, para que el usuario sepa qué parte del proceso sí terminó.

## Clinical Review Refresh — más espacio para leer y revisar

- Se compactaron las secciones y se movió la casilla de revisión a su cabecera.
- Se simplificaron la búsqueda de transcripción, los mensajes auxiliares y el
  bloque de aceptación, manteniendo la confirmación explícita del médico.
- Se ajustaron márgenes, separadores, tamaños y comportamiento responsive.
- Los bloques sin fuentes dejaron de añadir un mensaje repetido en cada sección.
- El panel de modelos pasó a un indicador compacto desplegable, con estados
  de Whisper/Qwen y detalles del dispositivo disponibles para diagnóstico.
- Se incorporaron pantalla de arranque, preparación de consulta y estado
  **Iniciando…** para deshabilitar el botón mientras comienza la captura.
- Se corrigieron condiciones de visibilidad y reinicio de la pantalla de grabación.

**Por qué:** dedicar más espacio al borrador y su fuente, hacer visibles las
operaciones en curso y reducir controles o mensajes repetidos. La revisión
médica y la aceptación siguen siendo decisiones explícitas.

Durante la validación local se mantiene el acceso sin login; la integración
Google permanece preparada. Esto es una decisión de prototipo, no una nueva
garantía de autenticación para despliegue.

## Quality Gate — comprobaciones y commits

La validación más reciente del conjunto de código completó:

| Comprobación | Resultado |
| --- | --- |
| Vitest | 216 tests en 53 archivos, todos pasando |
| Typecheck | Paquete de tipos y desktop: correcto |
| ESLint | Renderer y Main: correcto |
| Build | Main, preload CJS y renderer: correcto |
| Sintaxis de probes | Ambos scripts nuevos pasan `node --check` |

Estas comprobaciones no sustituyen un benchmark con modelos reales ni una nueva
prueba completa de UI con audio. Los diagnósticos GPU/handoff citados arriba son
evidencia guardada de ejecuciones anteriores del día.

Los últimos bloques quedaron en cinco commits locales:

| Commit | Entrega |
| --- | --- |
| `f7c71d1` | Integración Qwen y ciclo de vida de modelos |
| `f40feb8` | Transcripción progresiva y protección del inicio de grabación |
| `cc52976` | Compactación de revisión clínica y transcripción |
| `4191c37` | Scripts de diagnóstico Qwen/NVIDIA |
| `f71aab8` | Contrato del futuro verificador |

Los cambios previos del día incluyen captura de audio (`cf6851d`), runtime y
warm-up (`b9c1506`), preparación y pantalla de arranque (`0d3f92e`) y caché local
(`9df3de2`), además de actualizaciones del README. No se realizó push de los
cinco commits desde esta sesión.

## Siguiente etapa — Prompt Hardening, Qwen Reviewer y Processing Metrics

Se dejó una [nota técnica ampliada](NOTE_VERIFIER_P3.md) para:

1. Endurecer prompts y contratos, preservando ausencia, incertidumbre, sujeto,
   negaciones, dosis y evidencia sin completar información por plausibilidad.
2. Implementar un segundo agente Qwen de revisión, con contexto limpio y carga
   secuencial, que reporte discrepancias sin reescribir ni aceptar silenciosamente.
3. Añadir heurísticas explicables y probar tanto detecciones como falsas alarmas.
4. Crear un corpus sintético anotado y un harness que mida fidelidad, cobertura,
   errores, calidad del revisor, latencia, VRAM y estabilidad.
5. Comparar baseline, prompts endurecidos, heurísticas y segundo agente para
   conocer el beneficio real y su coste, y endurecer la selección de GPU.

El segundo agente y ese harness **siguen pendientes**. La prioridad siguiente
es medir y fortalecer la confianza en el borrador, con el principio de Oira:
**el agente documenta; el médico decide**.
