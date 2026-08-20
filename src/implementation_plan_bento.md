# Neo-Skeuomorphic Bento Box UI/UX Plan

Este plan detalla la refactorización arquitectónica visual de MoneyBot hacia una estética Bento Box / iOS Modern. Siguiendo la regla de oro, **toda la lógica de negocio, consultas de Supabase y esquemas de Gemini permanecerán intactos**. Solo se modificará el CSS (Tailwind, `globals.css`) y la estructura JSX.

## User Review Required

> [!WARNING]
> **Cambios en Consultas (Dashboard)**: Para mostrar el "Widget 50/30/20 Resumido" en el Dashboard principal (`/`), es necesario que agregue `needs_percent`, `wants_percent` y `savings_percent` a la consulta existente de `profiles` en `page.tsx`. Esto no altera la lógica, solo trae los datos que ya existen. ¿Apruebas este pequeño ajuste a la consulta para poder renderizar el widget en el Home?

> [!IMPORTANT]
> **Diseño Radial en Planning**: Implementaré un anillo SVG (Gauge) para consolidar el presupuesto 50/30/20 en `/planning`, calculando los porcentajes acumulados matemáticamente sin alterar el backend.

## Proposed Changes

### `globals.css` y Componentes Base
- Actualizar `.glass` y `.card-hero` para adoptar `rounded-[28px]` y `rounded-[32px]`.
- Añadir utilidades CSS para píldoras (`rounded-full`), barras 3D y squircles (`border-radius: 1rem` con aspect-ratio 1:1).
- Crear animaciones suaves para los Bottom Sheets (arrastre/deslizamiento).

### `src/app/page.tsx` (Dashboard Principal)
- **Estructura Grid**: Implementar `grid grid-cols-1 md:grid-cols-2 gap-4`.
- **Bento 1 (Hero)**: `md:col-span-2`, gran tipografía 4xl, fondo `var(--bg-card-dark)`. Accesos rápidos dentro del mismo Bento como píldoras.
- **Bento 2 (50/30/20)**: Tarjeta clara con 3 barras gruesas tipo píldora (`h-3`).
- **Bento 3 (Actividad)**: Lista con íconos tipo squircle y fondos pastel dinámicos.

### `src/app/planning/page.tsx` (Planificación)
- **Gauge Circular**: Remplazo de las 3 barras planas por un `svg` circular de 3 segmentos que muestra el consumo global del presupuesto.
- **Metas de Ahorro**: Cada meta pasa a ser un mini-Bento. Añadir botones circulares grandes `+` y `-` que lancen las acciones de depósito/retiro rápido (reutilizando la UI existente o una simplificada).

### `src/app/stats/page.tsx` (Estadísticas)
- **Histograma Soft-3D**: Las barras del gráfico actual (`recharts`) se personalizarán para tener `radius={[10, 10, 10, 10]}` y luces neon al hacer hover.
- **Selectores de Píldora**: El selector de Income/Expense/Balance pasará a ser un contenedor `bg-zinc-200/70` (o `var(--muted)`) con el botón activo en blanco brillante.

### Componentes Flotantes y Modales
- **BottomNav**: Se cambiará a un diseño encapsulado de píldora flotante, separado del borde inferior de la pantalla.
- **Modales (si aplican)**: Adaptar los estilos a Bottom Sheets (esquinas superiores redondeadas, barra horizontal superior `w-12 h-1.5 bg-border rounded-full`).

## Verification Plan

### Manual Verification
- Cargar la PWA en móvil simulado para asegurar que los bordes `[28px]` y el Grid funcionan fluidamente en anchos pequeños (se apilan a una columna).
- Verificar que el anillo SVG de `planning` calcule y renderice correctamente la suma matemática de los gastos frente al presupuesto, sin fallos de renderizado.
- Comprobar que los temas dinámicos (los 8 temas incluyendo *Midnight Slate*) sigan adaptándose perfectamente a los nuevos fondos Bento.
