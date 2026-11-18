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

El mapa usa [Leaflet](https://leafletjs.com/) con dos cartografías de base a elegir: imágenes satelitales de [Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9) y un mapa gris claro de Esri. Cada capa se puede activar o desactivar y tiene su propio control de transparencia.

- **Polígonos** (territorios, Real Audiencia y Gobernación): llevan su nombre como rótulo y, al hacer clic, abren su ficha en un panel lateral.
- **Puntos:** al hacer clic muestran solo el nombre (no tienen ficha).

### Capas

| # | Capa | Tipo | Archivo | Cómo se ve |
|---|---|---|---|---|
| 1 | Capitales · Ciudades · Minería | Puntos | `public/data/puntos.geojson` | Ícono según `tipoid` |
| 2 | Real Audiencia | Polígono | `public/data/real_audiencia.geojson` | Azul |
| 3 | Gobernación del Tucumán | Polígono | `public/data/tucuman.geojson` | Verde |
| 4 | Distribución territorial | Polígonos | `public/data/territorios.geojson` | Un color por territorio |

La capa de puntos es opcional: si `puntos.geojson` no existe, el resto del mapa funciona igual.

### Colores de la capa Distribución territorial

Cada territorio tiene un color propio, de tono medio, y el carmesí queda reservado para el **Cabildo de Jujuy**, que es el foco del trabajo. Los colores están asignados para que los territorios vecinos se distingan bien entre sí.

| Territorio | `id_territorio` | Color |
|---|---|---|
| Atacama | `TER-0001` | `#c45a86` (rosa) |
| Cabildo de Jujuy | `TER-0002` | `#c8102e` (carmesí) |
| Lípez | `TER-0003` | `#4f9da6` (turquesa) |
| Tarija | `TER-0004` | `#7c8794` (gris pizarra) |
| Chichas | `TER-0005` | `#d9a21b` (ocre) |
| Porco | `TER-0006` | `#7b5ea7` (violeta) |
| Potosí | `TER-0007` | `#e07b39` (naranja) |
| Yamparáez | `TER-0008` | `#8c4a2f` (siena) |

Para cambiar un color, editar `TERRITORY_COLORS` al principio de `src/app.js` (el color del foco está en `FOCUS_TERRITORY`). Si se agrega un territorio nuevo sin color asignado, usa uno de reserva (`territoryPalette`).

### Íconos de la capa de puntos

Cada tipo tiene una silueta distinta, además de un color, para reconocerlo de un vistazo. Los dibujos están definidos en `POINT_TYPES` (`src/app.js`).

| `tipoid` | Ícono | Etiqueta en el mapa |
|---|---|---|
| Capital | Estrella dorada, la más grande | Sí, con el nombre |
| Ciudad / Pueblo | Círculo blanco con centro oscuro | No |
| Mina | Rombo violeta con un pico blanco | No |
| (otro valor) | Círculo gris pequeño | No |

El campo `tipoid` no distingue mayúsculas ni tildes. También se reconocen `subciudad`, `villa`, `mineria` y `asiento`. Al alejar el zoom, los íconos se achican un poco para que no se amontonen.

### Rótulos de los polígonos

Los tamaños siguen una jerarquía, de mayor a menor:

| Rótulo | Tamaño |
|---|---|
| Real Audiencia de Charcas | 11 px |
| Gobernación del Tucumán | 10 px |
| Cabildo de Jujuy (en dos líneas) | 9 px |
| Resto de los territorios | 9 px |

Los tamaños están en variables al comienzo del bloque de rótulos de `src/styles.css` (`--lbl-audiencia`, `--lbl-gobernacion`, `--lbl-cabildo`, `--lbl-territorio`).

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

### Reglas para los datos

- **Sistema de coordenadas:** todos los archivos deben estar en **WGS 84 (EPSG:4326)**, en grados de longitud y latitud. Si se exporta desde QGIS, elegir ese CRS al guardar. Un archivo con coordenadas en metros no se verá en el mapa, aunque su encabezado diga lo contrario.
- **IDs únicos:** los identificadores se comparten entre todas las capas. No debe repetirse ninguno, ni siquiera entre archivos distintos.
- **Vínculo con las fichas:** el ID de cada polígono es el que conecta el mapa con su ficha (ver más abajo).

---

## Fichas históricas

Cada territorio y cada espacio de poder tiene una ficha con su descripción. Los textos están en `src/fichas.js`. Si un polígono no tiene ficha, el panel muestra "La ficha de esta entidad está en preparación".

### Formato de `src/fichas.js`

```js
export const FICHAS = {
  'TER-0001': {
    name: 'Atacama',
    period: 'Siglo XVII',
    description: `**Contexto histórico:** Texto del primer párrafo.

**Otro apartado:** Texto del segundo párrafo.`
  }
};
```

- El identificador (`TER-0001`, `POD-0001`…) debe coincidir con el del archivo GeoJSON.
- Los párrafos se separan con una línea en blanco.
- `**texto**` produce negrita y `*texto*` produce cursiva.

---

## Estructura del proyecto

```
.
├── index.html
├── README.md
├── src/
│   ├── app.js            Lógica del mapa, los rótulos, las fichas y el menú
│   ├── fichas.js         Textos de las fichas
│   ├── styles.css        Estilos
│   ├── TAPA.jpg          Imagen de portada
│   ├── logo-rsc.png      Logo (encabezado)
│   └── logo-rsc-dark.png Logo para fondo oscuro (pie de página)
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

Se necesita conexión a internet, porque Leaflet, la tipografía Montserrat y las imágenes de base se cargan desde la red.

---

## Publicación

Es un sitio estático: no requiere servidor propio. Se puede publicar tal cual en servicios como GitHub Pages, Netlify o Cloudflare Pages, subiendo la carpeta completa.

---

## Tecnologías y créditos

- [Leaflet](https://leafletjs.com/) 1.9.4 para el mapa.
- [Esri World Imagery y Light Gray Canvas](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9) como cartografía de base. Se mantiene la atribución que muestra el mapa.
- [Montserrat](https://fonts.google.com/specimen/Montserrat) (Google Fonts) para los títulos.
- Sin dependencias de compilación.

**Dirección del proyecto:** Lic. Rocío Soledad Campos, docente de Historia y becaria doctoral del CONICET.
Contacto: [rociocampos1292@gmail.com](mailto:rociocampos1292@gmail.com) · [Perfil en Academia.edu](https://conicet-ar.academia.edu/RocioSoledadCampos)

---

## Estado y licencia

Proyecto de investigación histórica. **Contenido en desarrollo.** Por ahora las fichas no incluyen citas de fuentes.

> **Pendiente de definir:** licencia del código, licencia de los textos y de los datos geográficos, y forma de citar el atlas.
