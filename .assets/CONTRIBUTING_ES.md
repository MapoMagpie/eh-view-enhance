## He aquí una breve descripción de los archivos de código fuente del directorio src:

```
./src
 |-main.ts                       // Organiza el código de cada módulo.
 |-page-fetcher.ts               // Página de obtención: Se encarga de extraer la información de las imágenes de cada página y de construir los objetos de 
 | |                                obtención de imágenes basados en esa información.
 |-img-fetcher.ts                // Se encarga de extraer las imagenes.
 |-idle-loader.ts                // Cargador automático inactivo: Funciona cuando la opción de configuración "Cargador automático" está habilitada, cargando 
 | |                                las imágenes una a una de forma lenta.
 |-fetcher-queue.ts              // Cola de obtenedores de imágenes: Organiza las solicitudes de los obtenedores de imágenes y controla cuántas imágenes se 
 | |                                cargan simultáneamente.
 |-img-node.ts                   // Información de la imagen: Encapsulada en el obtentor de imágenes.
 |-event-bus.ts                  // Bus de eventos: Los módulos se envían y reciben eventos a través de la variable global EBUS.
 |-config.ts                     // Opciones de configuración.
 |-download/                     //
 | |-downloader.ts               // Descargador: Durante la descarga, desactiva el cargador automático y utiliza el cargador automático inactivo para llevar 
 | |                                a cabo la descarga.
 |-platform/                     //
 | |-platform.ts                 // Adaptador de plataforma de sitio: Describe cómo un sitio obtiene la siguiente página, cómo extrae la información de la 
 | |                                imagen de la página y cómo obtiene los metadatos.
 | |-adapt.ts                    // Devuelve el adaptador de plataforma según la dirección del sitio.
 | |                             // Se enumeran a continuación algunos adaptadores y se describe brevemente su comportamiento para obtener información.
 | |-hitomi.ts                   // El adaptador de hitomi.la solicita directamente a la API y decodifica el contenido para obtener la información de las 
 | |                                miniaturas y las imágenes originales.
 | |-nhentai.ts                  // El adaptador de nhentai.net extrae toda la información de las imágenes directamente de una etiqueta <script> en la página.
 | |-pixiv.ts                    // El adaptador de pixiv.net obtiene el ID autor de la página y luego solicita a la API toda la información de las obras del 
 | |                                mismo, posteriormente, realiza solicitudes adicionales a la API para obtener detalles más específicos sobre las imágenes.
 | |-danbooru.ts                 // Los adaptadores de algunos sitios tipo booru buscan los elementos de imagen en la página y luego solicitan la siguiente 
 | |                                página, repitiendo el proceso.
 | |                                Al solicitar la imagen original, el solicitador de imágenes pide la página de detalles de cada imagen (href) y extrae la 
 | |                                dirección de la imagen original de esa página de detalles.
 | |-ehentai.ts                  // El adaptador de e-hentai.org/exhentai.org busca los elementos de imagen en la página y luego solicita la siguiente página, 
 | |                                repitiendo este proceso.
 | |                                Al solicitar la imagen original, el solicitador de imágenes pide la página de visualización de cada imagen y extrae la 
 | |                                dirección de la imagen original de esa página de visualización.
 | |-twitter.ts                  // El adaptador de twitter.ts solicita la información de medios de un usuario a través de la API usando el ID del usuario. La 
 | |                                solicitud a la API incluye paginación para manejar grandes volúmenes de datos.
 |-ui/                           //
 | |-html.ts                     // Interfaz del script.
 | |-style.ts                    // Estilo de la interfaz del script.
 | |-full-view-grid-manager.ts   // Interfaz de la cuadrícula de miniaturas.
 | |-ultra-image-frame-manager.ts// Interfaz de visualización de imágenes grandes.
 | |-config-panel.ts             // Panel de configuración.
 | |-event.ts                    // Eventos de los elementos en algunas interfaces de scripts, incluyendo eventos de teclado.
 |-utils/                        // 
```

## Agregar soporte para un sitio

Todo el código relacionado con la adaptación de sitios se encuentra en el directorio src/platform. En [src/platform/platform.ts](/src/platform/platform.ts) se define la clase abstracta de adaptadores de sitios, que describe cómo el programa debe obtener la paginación y la información de imágenes en un sitio específico.
Para permitir una futura conversión a un programa independiente, los adaptadores de sitios están diseñados para no depender de los resultados del JavaScript que se ejecuta en la página original. 
En lugar de eso, se analiza la información de la página original, se llaman directamente a las API correspondientes, o se utiliza DOMParser para analizar el documento original y consultar los elementos de imagen correspondientes.
Esto significa que no es necesario esperar a que la página original se cargue completamente, ni a que el JavaScript en la página termine de cargar, ni establecer tiempos de espera para que la información aparezca.

En [src/platform/platform.ts](/src/platform/platform.ts) se definen dos clases abstractas, Matcher y BaseMatcher. Matcher es la clase abstracta superior que representa completamente al adaptador de sitios
BaseMatcher implementa algunos métodos de Matcher, proporcionando implementaciones predeterminadas para ciertos comportamientos. Esto reduce la cantidad de métodos que deben ser implementados por las clases que heredan de Matcher.
Por lo tanto, al agregar soporte para un nuevo sitio, solo es necesario heredar de BaseMatcher.
```javascript
export class ExampleMatcher extends BaseMatcher {}
```

A través del LSP (Language Server Protocol) de TypeScript, es posible generar automáticamente la implementación de los métodos de BaseMatcher en ExampleMatcher. Sin embargo, es necesario realizar algunas modificaciones adicionales, como agregar la palabra clave `async` para aplicar la sintaxis.
```javascript
class ExampleMatcher extends BaseMatcher {
  fetchPagesSource(source: Chapter): AsyncGenerator<PagesSource, any, unknown> {
    throw new Error("Method not implemented.");
  }
  parseImgNodes(page: PagesSource, chapterID?: number | undefined): Promise<ImageNode[]> {
    throw new Error("Method not implemented.");
  }
  fetchOriginMeta(node: ImageNode, retry: boolean, chapterID?: number | undefined): Promise<OriginMeta> {
    throw new Error("Method not implemented.");
  }
  name(): string {
    throw new Error("Method not implemented.");
  }
  workURL(): RegExp {
    throw new Error("Method not implemented.");
  }
}
```
Basado en el código anterior, describe brevemente lo que debe hacer cada método.
El ejemplo describe el flujo de obtención de información de un sitio tradicional como e-hentai, donde en la página de la galería se pueden obtener las URL de las miniaturas de las imágenes, las URL de visualización y la URL de la siguiente página. La URL de la imagen original debe obtenerse después de solicitar la URL de visualización.

```javascript
class ExampleMatcher extends BaseMatcher {
  name(): string {
    return "example site";
  }
  // Paso 1: Obtén el contenido de la página. Después de obtener el contenido de la página, en el Paso 2 se extraerá la información de las imágenes de dicho contenido.
  // Necesitas agregar async y, además, anteponer un * al nombre del método para indicar que es un generador, lo que permitirá usar la palabra clave yield para devolver valores.
  // @param _source: Es información de capítulos. Para la mayoría de los sitios que no tienen un diseño de capítulos, este parámetro puede ser ignorado o directamente eliminado.
  async *fetchPagesSource(_source: Chapter): AsyncGenerator<PagesSource> {
    // Normalmente, el primer paso consiste en devolver directamente el objeto de documento de la página actual.
    yield document;
    // Cuando el programa necesita obtener la siguiente página.
    while (true) {
      // Obtener la dirección de la siguiente página.
      let nextPage = getNextPage();
      // Si no se puede obtener la siguiente página, saliendo del bucle, indicando que se han obtenido todas las páginas.
      if (nextPage === undefined || nextPage === "") break;
      // Solicitar la siguiente página y analizarla como un objeto de documento.
      const doc = await window.fetch(nextPage).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
      yield doc;
    }
  }
  // Paso 2: El parámetro page es el contenido de la página devuelto en el Paso 1, que puede ser un Document o una string, dependiendo del tipo de valor devuelto en el Paso 1.
  // @param _chapterID: Información de capítulo que también puede ser ignorada.
  async parseImgNodes(page: PagesSource, _chapterID?: number | undefined): Promise<ImageNode[]> {
    // Dado que el Paso 1 devuelve un Document, puedes asumir directamente que page es un Document.
    const doc = page as Document;
    // Consulta los elementos de imagen correspondientes a partir del Document.
    const elements = Array.from(doc.querySelectorAll("some img or a"));
    let nodes: ImageNode[] = [];
    for (const ele of elements) {
      // title: Obtener el título de la imagen o establecer el título de otra manera.
      // thumbnailSrc: Obtener la dirección de la miniatura.
      // href: Obtener la dirección de lectura (href) correspondiente a la imagen, es decir, la dirección a la que se redirige al hacer clic en la miniatura en la página original.
      nodes.push(new ImageNode(thumbnailSrc, href, title: Parámetro opcional: thumbnailSrc con retraso, Parámetro opcional: establecer directamente la dirección de la imagen original));
      // Parámetro opcional: thumbnailSrc con retraso. En e-hentai, no se proporciona directamente la dirección de la miniatura; en su lugar, se utiliza una imagen sprite compartida por 20 imágenes. Por lo tanto, cuando no se puede obtener thumbnailSrc directamente, solicita la imagen sprite, divide la imagen según sea necesario, y luego devuelve la dirección del blob de las imágenes divididas.
      // Parámetro opcional: establecer directamente la dirección de la imagen original. Algunos sitios son muy generosos y proporcionan directamente la información de la dirección de la imagen original en la página, lo que permite omitir la operación de solicitud asíncrona para obtener la dirección en el tercer paso.
    }
    return nodes;
  }
  // Paso 3: Obtener la dirección de la imagen original.
  // @param _retry: Si no se puede obtener la imagen desde la dirección de la imagen original, y _retry es true, se puede intentar cambiar la dirección de la imagen original. Sin embargo, en la mayoría de los sitios, la dirección de la imagen original no cambia, por lo que este paso puede ser opcional.
  // @param _chapterID: Información de capítulo que también puede ser ignorada.
  async fetchOriginMeta(node: ImageNode, _retry: boolean, _chapterID?: number | undefined): Promise<OriginMeta> {
    // Si en el Paso 2 se ha establecido claramente la dirección de la imagen original, devuelve la dirección directamente.
    // return {url: node.originSrc!};
    // Si en el Paso 2 no se puede obtener la dirección de la imagen original, es necesario solicitar la dirección de lectura de la imagen (href). Luego, obtén la dirección de la imagen original a partir del HTML devuelto.
    const doc = await window.fetch(node.href).then((res) => res.text()).then((text) => new DOMParser().parseFromString(text, "text/html"));
    const originSrc = doc.querySelector("some img")?.src;
    return {url: originSrc};
    // El valor de retorno OriginMeta puede tener dos propiedades opcionales, title y href, que se utilizan para actualizar el title y el href de la información de la imagen.
    // Por ejemplo, si en el Paso 2 se estableció el title como 01.jpg, pero en esta etapa se descubre que la imagen original es del formato PNG, entonces se puede actualizar el title para que refleje el formato correcto, cambiando .jpg por .png.
  }
  // Devuelve una expresión regular para coincidir con qué sitio se aplica y las páginas de galería específicas de ese sitio.
  workURL(): RegExp {
    return /example.com/$Expresión regular para el ID de galería/;
  }
}
```
Muchos sitios tienen métodos complejos para obtener información de imágenes, que incluyen técnicas como carga diferida, ofuscación, fragmentación desordenada de imágenes, construcción compleja de solicitudes API y cifrado de contenido en las respuestas de la API.
Si te enfrentas a estas situaciones complejas, consulta el código de los adaptadores de sitios ya implementados para obtener orientación específica.
Por ejemplo, en la página de hitomi, se proporciona directamente una lista de imágenes cifradas junto con las miniaturas y la información de las imágenes originales, así como funciones de desciframiento ofuscadas.
En Twitter, existe una construcción compleja de solicitudes a la API.
En 18comic, las imágenes se devuelven fragmentadas y desordenadas, y también se proporcionan funciones ofuscadas para la restauración de las imágenes.

## Quiero agregar nuevas funcionalidades o corregir errores en el script.

Aquí se describe el flujo que sigue el script después de comenzar a ejecutarse.
TODO
