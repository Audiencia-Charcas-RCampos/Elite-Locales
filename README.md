# Élites locales y trayectorias políticas

**Atlas histórico digital · Espacio de Charcas, siglo XVII**

Sitio web con un mapa interactivo que acompaña una investigación sobre las élites locales de Jujuy durante el siglo XVII. A través de las biografías de Juan Ochoa de Zárate, Pablo Bernárdes de Ovando y Pablo de Espinosa, analiza sus prácticas, políticas y disputas jurisdiccionales, y su vínculo con los núcleos de poder charqueños: La Plata, Potosí, Chichas y Lípez, entre otros. Incluye una sección sobre el rol de las mujeres en las élites.

> **Nota metodológica.** Las relaciones históricas se incorporan mediante documentación. La proximidad espacial, por sí sola, no demuestra una relación política o institucional.

## Contenido

- **Portada:** presentación del proyecto.
- **Explorar el mapa:** mapa con cuatro capas y fichas históricas.
- **La mujer en el siglo XVII:** texto sobre su papel en la consolidación de las élites.
- **Autoría:** datos de la autora y contacto.

## El mapa

Hecho con [Leaflet](https://leafletjs.com/), con dos mapas de base (satélite y relieve de Esri). Cada capa se activa o desactiva y tiene su propio control de transparencia.

| Capa | Tipo | Archivo |
| --- | --- | --- |
| Capitales · Ciudades · Minería | Puntos | `public/data/puntos.geojson` |
| Real Audiencia | Polígono | `public/data/real_audiencia.geojson` |
| Gobernación del Tucumán | Polígono | `public/data/tucuman.geojson` |
| Distribución territorial | Polígonos | `public/data/territorios.geojson` |

- Los polígonos abren su ficha en un panel lateral al hacer clic; los puntos muestran solo el nombre.
- La capa de puntos es opcional: si falta, el resto del mapa funciona igual.
- Los colores de los territorios se cambian en `TERRITORY_COLORS` (`src/app.js`) y los tamaños de rótulos en las variables `--lbl-*` (`src/styles.css`).

### Reglas para los datos

- Coordenadas en **WGS 84 (EPSG:4326)**.
- Los IDs (`TER-0001`, `POD-0001`, `PUN-0001`…) son únicos entre todas las capas.
- El ID de cada polígono lo conecta con su ficha.

## Fichas históricas

Los textos están en `src/fichas.js`, indexados por el mismo ID del GeoJSON. Los párrafos se separan con una línea en blanco; `**texto**` produce negrita y `*texto*` cursiva. Si un polígono no tiene ficha, el panel muestra "La ficha de esta entidad está en preparación".

## Estructura

```
.
├── index.html
├── README.md
├── src/
│   ├── app.js          Mapa, rótulos, fichas y menú
│   ├── fichas.js       Textos de las fichas
│   ├── styles.css      Estilos
│   ├── TAPA.jpg        Imagen de portada
│   ├── logo-rsc.png
│   └── logo-rsc-dark.png
└── public/data/        Archivos GeoJSON
```

Las rutas son relativas a `index.html`, por lo que esta estructura debe mantenerse.

## Ejecutarlo en local

El sitio usa módulos de JavaScript y `fetch`, así que no funciona abriendo `index.html` con doble clic. Desde la carpeta del proyecto:

```
python3 -m http.server 8000
```

Luego abrir <http://localhost:8000>. Se necesita conexión a internet (Leaflet, tipografías y mapas de base se cargan desde la red).

## Publicación

Es un sitio estático: se publica tal cual en GitHub Pages, Netlify o Cloudflare Pages, subiendo la carpeta completa.

## Tecnologías

- [Leaflet](https://leafletjs.com/) 1.9.4 para el mapa.
- [Esri World Imagery y Light Gray Canvas](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9) como cartografía de base (se mantiene la atribución del mapa).
- Tipografías de Google Fonts: [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) (títulos), [Libre Caslon Text](https://fonts.google.com/specimen/Libre+Caslon+Text) (texto) y [Karla](https://fonts.google.com/specimen/Karla) (interfaz).
- [GoatCounter](https://www.goatcounter.com/) para estadísticas de visitas, sin cookies.
- Sin dependencias de compilación.

## Autoría

**Dirección del proyecto:** Lic. Rocío Soledad Campos, docente de Historia y becaria doctoral del CONICET.
Contacto: [rociocampos1292@gmail.com](mailto:rociocampos1292@gmail.com) · [Academia.edu](https://conicet-ar.academia.edu/RocioSoledadCampos)

## Estado y licencia

Proyecto de investigación histórica. **Contenido en desarrollo.** Por ahora las fichas no incluyen citas de fuentes.

**Pendiente de definir:** licencia del código, de los textos y datos geográficos, y forma de citar el atlas.
