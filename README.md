# Élites locales y trayectorias políticas

**Atlas histórico digital · Espacio de Charcas, siglo XVII**

Sitio web con un mapa interactivo que acompaña una investigación histórica sobre las élites locales de Jujuy durante el siglo XVII. El trabajo examina las prácticas, las políticas y las disputas jurisdiccionales de esa élite a través de las biografías de Juan Ochoa de Zárate, Pablo Bernárdes de Ovando y Pablo de Espinosa, y su interdependencia social y política con los núcleos de poder charqueños: La Plata, Potosí, Chichas y Lípez, entre otros.

El sitio también incluye una sección sobre el papel de la mujer en las élites del siglo XVII.

> **Nota metodológica.** Las relaciones históricas se incorporan mediante documentación. La proximidad espacial, por sí sola, no demuestra una relación política o institucional.

---

## Contenido del sitio

| Sección | Descripción |
|---|---|
| **Portada** | Presentación del proyecto. |
| **Explorar el mapa** | Mapa interactivo con cuatro capas y fichas históricas. |
| **La mujer en el siglo XVII** | Texto sobre el rol de las mujeres en la consolidación de las élites. |
| **Quién soy** | Datos de la autora y contacto. |

---

## El mapa

El mapa usa [Leaflet](https://leafletjs.com/) sobre imágenes satelitales de [Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9). Cada capa se puede activar o desactivar y tiene su propio control de transparencia. Al hacer clic en cualquier entidad se abre un popup y, desde allí, su ficha.

### Capas

| # | Capa | Tipo | Archivo | Cómo se ve |
|---|---|---|---|---|
| 1 | Capitales · Ciudades · Minería | Puntos | `public/data/puntos.geojson` | Ícono según `tipoid` |
| 2 | Real Audiencia | Polígono | `public/data/real_audiencia.geojson` | Azul |
| 3 | Gobernación del Tucumán | Polígono | `public/data/tucuman.geojson` | Verde |
| 4 | Distribución territorial | Polígonos | `public/data/territorios.geojson` | Gama de rojos |

La capa de puntos es opcional: si `puntos.geojson` no existe, el resto del mapa funciona igual.

### Campos esperados en cada archivo

**`territorios.geojson`**

| Campo | Ejemplo |
|---|---|
| `id_territorio` | `TER-0001` |
| `Nombre` | `Atacama` |

**`real_audiencia.geojson`** y **`tucuman.geojson`**

| Campo | Ejemplo |
|---|---|
| `id_poder` | `POD-0002` (Real Audiencia) · `POD-0001` (Gobernación) |
| `Nombre` | `Audiencia Real de Charcas` |

**`puntos.geojson`**

| Campo | Ejemplo |
|---|---|
| `id_punto` | `PUN-0001` |
| `Nombre` | `Jujuy` |
| `tipoid` | `Capital`, `Ciudad`, `Pueblo` o `Mina` |

Íconos de la capa de puntos:

| `tipoid` | Ícono | Etiqueta en el mapa |
|---|---|---|
| Capital | ⭐ estrella dorada | Sí, con el nombre |
| Ciudad / Pueblo | 🏠 casita oscura | No |
| Mina | ⛏️ pico violeta | No |
| (otro valor) | círculo gris | No |

El campo `tipoid` no distingue mayúsculas ni tildes. También se reconocen `subciudad`, `villa`, `mineria` y `asiento`.

### Reglas para los datos

- **Sistema de coordenadas:** todos los archivos deben estar en **WGS 84 (EPSG:4326)**, en grados de longitud y latitud. Si se exporta desde QGIS, elegir ese CRS al guardar. Un archivo con coordenadas en metros no se verá en el mapa, aunque su encabezado diga lo contrario.
- **IDs únicos:** los identificadores se comparten entre todas las capas. No debe repetirse ninguno, ni siquiera entre archivos distintos.
- **Vínculo con las fichas:** el ID de cada entidad es el que conecta el mapa con su ficha (ver más abajo).

---

## Fichas históricas

Cada entidad puede tener una ficha con descripción, personas, acontecimientos, fuentes y relaciones documentadas. Hay dos orígenes, y el sitio usa el primero que encuentre:

1. **Base de datos (Supabase).** Si está configurada y la ficha está publicada, se muestra completa: descripción, personas vinculadas con su trayectoria, acontecimientos, fuentes y relaciones.
2. **Archivo local `src/fichas.js`.** Si no hay base de datos o la ficha no está publicada, se usa el texto de este archivo.

### Formato de `src/fichas.js`

```js
export const FICHAS = {
  'TER-0001': {
    name: 'Atacama',
    period: 'Siglo XVII',
    description: `**Contexto histórico:** Texto del primer párrafo[1].

**Otro apartado:** Texto del segundo párrafo[2][3].`
  }
};
```

- El identificador (`TER-0001`, `POD-0001`, `PUN-0001`…) debe coincidir con el del archivo GeoJSON.
- Los párrafos se separan con una línea en blanco.
- `**texto**` produce negrita y `[1]` produce una referencia numerada.

---

## Base de datos (opcional)

El sitio puede conectarse a [Supabase](https://supabase.com/) para guardar las fichas y administrarlas. Se configura en `src/config.js`:

```js
export const CONFIG = {
  supabaseUrl: 'https://TU-PROYECTO.supabase.co',
  supabaseAnonKey: 'TU-CLAVE-ANON'
};
```

Sin estos datos el sitio funciona igual, solo con las fichas de `src/fichas.js`.

Tablas que usa el código:

`entity_fiches`, `people`, `events`, `offices`, `sources`, `entity_relations`, `entity_people`, `entity_events`, `entity_sources` y `person_offices`.

Para las fichas, `entity_type` puede valer `territorio`, `poder` o `punto`.

> **Seguridad.** La clave `anon` es pública por diseño: cualquiera que abra el sitio puede verla. La protección real está en las políticas de seguridad por fila (*Row Level Security*) de Supabase, que deben permitir leer solo los registros publicados y escribir solo a usuarios autorizados. El alta de usuarios y los permisos se gestionan desde el panel de Supabase; no hay credenciales predeterminadas.

> **Pendiente de completar:** el esquema SQL de las tablas y las políticas de seguridad. Conviene guardarlo en una carpeta (por ejemplo `database/`) para poder recrear la base.

### Panel de administración

El código incluye un panel para crear y editar fichas, personas, acontecimientos, cargos, fuentes y relaciones. Actualmente **no hay botón visible** para abrirlo en el sitio.

---

## Estructura del proyecto

```
.
├── index.html
├── README.md
├── src/
│   ├── app.js          Lógica del mapa, las fichas y el panel de administración
│   ├── config.js       Datos de conexión a Supabase
│   ├── fichas.js       Textos de las fichas
│   ├── styles.css      Estilos
│   └── TAPA.jpg        Imagen de portada
└── public/
    └── data/
        ├── puntos.geojson
        ├── real_audiencia.geojson
        ├── territorios.geojson
        └── tucuman.geojson
```

Las rutas se resuelven de forma relativa a `index.html`, por lo que esa estructura debe mantenerse.

---

## Cómo ejecutarlo en tu computadora

El sitio usa módulos de JavaScript y carga archivos con `fetch`, así que **no funciona abriendo `index.html` con doble clic**. Hay que servirlo desde un servidor local.

Con Python instalado, desde la carpeta del proyecto:

```bash
python3 -m http.server 8000
```

Luego abrir <http://localhost:8000> en el navegador.

Se necesita conexión a internet, porque Leaflet, Supabase y las imágenes satelitales se cargan desde la red.

---

## Publicación

Es un sitio estático: no requiere servidor propio. Se puede publicar tal cual en servicios como GitHub Pages, Netlify o Cloudflare Pages, subiendo la carpeta completa.

---

## Tecnologías y créditos

- [Leaflet](https://leafletjs.com/) 1.9.4 para el mapa.
- [Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9) como cartografía de base (imágenes satelitales). Se mantiene la atribución que muestra el mapa.
- [Supabase](https://supabase.com/) para fichas y administración (opcional).
- Tipografías del sistema; sin dependencias de compilación.

**Dirección del proyecto:** Lic. Rocío Soledad Campos, docente de Historia y becaria doctoral del CONICET.
Contacto: [rociocampos1292@gmail.com](mailto:rociocampos1292@gmail.com) · [Perfil en Academia.edu](https://conicet-ar.academia.edu/RocioSoledadCampos)

---

## Estado y licencia

Proyecto de investigación histórica. **Contenido en desarrollo.**

> **Pendiente de definir:** licencia del código, licencia de los textos y de los datos geográficos, y forma de citar el atlas.
