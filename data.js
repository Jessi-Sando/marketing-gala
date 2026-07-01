// Contenido del dashboard de Campaña Q3 2026 — Gala SA
// Todo el contenido está hardcodeado acá, tal como lo define el brief.

const UNITS = [
  {
    id: "casino-gala",
    name: "Casino Gala",
    subtitle: "7 salas · cuenta única centralizada · Mundial de la Suerte → La Experiencia (Sala Central)",
    accent: "#C9A84C",
    months: {
      julio: [
        { tags: ["sorteo", "pautar"], meta: "1 jul · Sala Fontana", title: "Sorteo Mundial", desc: "Premios propios de sala · BOXIE" },
        { tags: ["sorteo", "pautar"], meta: "7 jul · Sala Barranqueras", title: "Sorteo Mundial", desc: "Premios propios de sala · BOXIE" },
        { tags: ["sorteo", "pautar"], meta: "14 jul · Sala Sáenz Peña", title: "Sorteo Mundial", desc: "Premios propios de sala · BOXIE" },
        { tags: ["sorteo", "campaña", "pautar"], highlight: true, meta: "19 jul · Sala Central 21:00 hs", title: "Gran Sorteo Final", desc: "Cierre Mundial de la Suerte · anuncio sorpresa La Experiencia al final de la noche" },
        { tags: ["lanzamiento", "pautar"], meta: "20 jul · Sala Central", title: "Lanzamiento La Experiencia", desc: "Primera pieza digital · imagen ruleta EGT · crédito promo en ruleta · tragos en blackjack con dealer" },
        { tags: ["contenido"], meta: "Todo julio", title: "Publicación casi diaria", desc: "Sala → premios → ganadores al día siguiente → próximo sorteo → BOXIE" }
      ],
      agosto: [
        { tags: ["La Experiencia", "contenido", "pautar"], meta: "1–7 ago", title: "Reel ruleta EGT en acción", desc: "Mostrar la máquina funcionando · ambiente · jugadores" },
        { tags: ["La Experiencia", "contenido"], meta: "Agosto", title: "Blackjack con dealer", desc: "Contenido del dealer en mesa · ambiente social · tragos incluidos" },
        { tags: ["La Experiencia", "acción"], meta: "Agosto", title: "BOXIE + ruleta electrónica", desc: "Vincular puntos BOXIE al juego en ruleta EGT · crédito promocional" },
        { tags: ["contenido", "pautar selectivo"], meta: "Todo agosto", title: "BOXIE · Hora BOXIE · Premium Martes", desc: "Pozos activos · reels de pozos · fidelización" }
      ],
      septiembre: [
        { tags: ["La Experiencia", "contenido", "pautar"], meta: "Septiembre", title: "Contenido de ambiente y jugadores", desc: "Testimonios · noche en sala · dealer en acción" },
        { tags: ["La Experiencia", "acción", "pautar"], meta: "Septiembre", title: "Noche especial La Experiencia", desc: "Evento puntual en Sala Central · reforzar concepto de noche diferente" },
        { tags: ["contenido"], meta: "Todo septiembre", title: "BOXIE · pozos · Premium Martes", desc: "Contenido de fidelización permanente" },
        { tags: ["pendiente"], meta: "", title: "Nueva campaña masiva Q4", desc: "Diseñar en septiembre para lanzar en octubre" }
      ]
    },
    pendientesGenerales: [
      "Confirmar premios exactos por sala (Fontana, Barranqueras, Sáenz Peña)",
      "Confirmar si habrá evento especial en septiembre (DJ, ambientación)"
    ]
  },
  {
    id: "valentino-restaurant",
    name: "Valentino Restaurant",
    subtitle: "Amerian Hotel Casino Gala · cenas temáticas mensuales · delivery · reservas Riservi",
    accent: "#8B2635",
    channels: "Pedidos Ya · FUDO · Riservi · Teléfono · Recepción hotel · Paquete fidelización (en desarrollo)",
    months: {
      julio: [
        { tags: ["contenido", "pautar"], meta: "28 jun–7 jul", title: "Lanzamiento Cena Temática Argentina", desc: "Flyer feed · historia · copy WhatsApp · carga Riservi · Humand" },
        { tags: ["cena temática", "pautar"], highlight: true, meta: "8 jul", title: "Cena Temática Argentina", desc: "Bodega Terrazas de los Andes · Sommelier Carlos Daownie · menú por pasos · maridaje" },
        { tags: ["contenido"], meta: "Todo julio", title: "Menú ejecutivo · sugerencia del chef", desc: "2–3 piezas semanales · feed e historias" },
        { tags: ["canales", "pautar"], meta: "Julio", title: "Lanzamiento Pedidos Ya · FUDO · Riservi", desc: "Comunicar canales digitales en redes y WhatsApp" }
      ],
      agosto: [
        { tags: ["pendiente"], meta: "", title: "Cena temática agosto", desc: "Fecha y concepto a confirmar 10 días antes" },
        { tags: ["contenido"], meta: "Agosto", title: "Menú ejecutivo · sugerencia del chef", desc: "2–3 piezas semanales" },
        { tags: ["canales"], meta: "Agosto", title: "Recordatorio canales digitales", desc: "Pedidos Ya · FUDO · Riservi" },
        { tags: ["fidelización"], meta: "Agosto", title: "Paquete de fidelización", desc: "Diseño del concepto · definir beneficios · canal de activación" }
      ],
      septiembre: [
        { tags: ["pendiente"], meta: "", title: "Cena temática septiembre", desc: "Fecha y concepto a confirmar 10 días antes" },
        { tags: ["contenido"], meta: "Septiembre", title: "Menú ejecutivo · sugerencia del chef", desc: "2–3 piezas semanales" },
        { tags: ["canales"], meta: "Septiembre", title: "Recordatorio canales digitales", desc: "" },
        { tags: ["fidelización", "pautar"], meta: "Septiembre", title: "Lanzamiento paquete fidelización", desc: "Si diseño listo en agosto · comunicación a base de clientes" }
      ]
    }
  },
  {
    id: "resto-ruta-11",
    name: "Resto Ruta 11",
    subtitle: "Gala Hotel & Convenciones · Desafío de Sommelier · FUDO · Riservi",
    accent: "#C4621A",
    channels: "FUDO · Riservi · Teléfono / recepción",
    months: {
      julio: [
        { tags: ["cena maridaje", "evento especial", "pautar"], meta: "Fecha a confirmar · julio", title: "Desafío de Sommelier", desc: "2 sommeliers (Juan Chichizola y El Tano) · 2 vinos · cata a ciegas · los clientes votan al ganador" },
        { tags: ["contenido"], meta: "10 días antes del evento", title: "Presentación Juan Chichizola", desc: "Quién es · su propuesta · generar expectativa" },
        { tags: ["contenido"], meta: "10 días antes del evento", title: "Presentación El Tano", desc: "Quién es · su propuesta · el duelo está servido" },
        { tags: ["contenido", "pautar"], meta: "Días previos", title: "Recordatorio + reservas", desc: "Copy WhatsApp · historia · carga Riservi · Humand" },
        { tags: ["contenido"], meta: "Post-evento", title: "Revelación del ganador", desc: "Foto de la noche · sommelier ganador · vino elegido" },
        { tags: ["contenido"], meta: "Todo julio", title: "Sugerencia del chef", desc: "2 piezas semanales · feed e historias" },
        { tags: ["canales", "pautar"], meta: "Julio", title: "Lanzamiento FUDO + Riservi", desc: "" }
      ],
      agosto: [
        { tags: ["pendiente"], meta: "", title: "Cena especial agosto", desc: "Slot reservado, formato y fecha a confirmar" },
        { tags: ["contenido"], meta: "Agosto", title: "Sugerencia del chef", desc: "2 piezas semanales" },
        { tags: ["canales"], meta: "Agosto", title: "Recordatorio FUDO + Riservi", desc: "" },
        { tags: ["a evaluar"], meta: "Agosto", title: "¿Desafío de Sommelier Ronda 2?", desc: "Si el evento de julio funciona, evaluar repetir" }
      ],
      septiembre: [
        { tags: ["pendiente"], meta: "", title: "Cena especial septiembre", desc: "Slot reservado, formato y fecha a confirmar" },
        { tags: ["contenido"], meta: "Septiembre", title: "Sugerencia del chef", desc: "2 piezas semanales" },
        { tags: ["canales"], meta: "Septiembre", title: "Recordatorio FUDO + Riservi", desc: "" },
        { tags: ["contenido", "pautar selectivo"], meta: "Septiembre", title: "Contenido behind the scenes", desc: "Cocina · chef en acción · reels cortos" }
      ]
    },
    pendientesGenerales: [
      "Confirmar fecha del Desafío de Sommelier",
      "Confirmar nombres completos y bodegas de los dos sommeliers"
    ]
  },
  {
    id: "amerian-hotel",
    name: "Amerian Hotel Casino Gala",
    subtitle: "Posicionamiento de marca · colaboración con Valentino Restaurant · generación de banco visual",
    accent: "#0C447C",
    objective: "Que cuando alguien decida venir a Resistencia, Amerian sea la única opción que tenga en la cabeza.",
    pilares: "Habitaciones · Servicios (piscina, spa, gimnasio, bar) · Gastronomía (Valentino) · Ubicación céntrica",
    months: {
      julio: [
        { tags: ["producción"], meta: "Todo julio", title: "Sesión de fotos y video", desc: "Habitaciones · piscina · spa · bar · lobby · Valentino · exteriores. Banco para los 3 meses." },
        { tags: ["contenido", "pautar"], meta: "Julio", title: "Presentación del hotel", desc: "Serie de piezas por espacio. Con fotos existentes mientras llega el material nuevo." },
        { tags: ["contenido", "pautar"], meta: "Julio", title: "¿Por qué Resistencia?", desc: "Ciudad + hotel como base ideal. Atractivos locales, conectividad, centro." },
        { tags: ["colaboración", "pautar"], meta: "8 jul", title: "Cena Temática Argentina · Valentino", desc: "Post en colaboración desde cuenta del hotel." },
        { tags: ["Humand"], meta: "Julio", title: "Novedades del hotel para colaboradores Gala SA", desc: "" }
      ],
      agosto: [
        { tags: ["contenido", "pautar"], meta: "Agosto", title: "Reels de espacios", desc: "Habitación · piscina · spa · bar. Un reel por espacio, aspiracionales." },
        { tags: ["contenido", "pautar"], meta: "Agosto", title: "Experiencia completa", desc: "Check-in → habitación → Valentino → piscina → check-out." },
        { tags: ["posicionamiento", "pautar"], meta: "Agosto", title: "El mejor hotel de Resistencia", desc: "Mensaje directo. Para quien viene por negocios, turismo o eventos." },
        { tags: ["colaboración"], meta: "Agosto", title: "Cena temática agosto · Valentino", desc: "Post en colaboración cuando se confirme." },
        { tags: ["Humand"], meta: "Agosto", title: "Novedades del hotel para colaboradores Gala SA", desc: "" }
      ],
      septiembre: [
        { tags: ["posicionamiento", "pautar"], meta: "Septiembre", title: "Campaña de posicionamiento", desc: "“Si venís a Resistencia, acá es.”" },
        { tags: ["contenido", "pautar selectivo"], meta: "Septiembre", title: "Corporativo y eventos", desc: "Salones, reuniones, servicios para grupos." },
        { tags: ["colaboración"], meta: "Septiembre", title: "Cena temática septiembre · Valentino", desc: "Post en colaboración cuando se confirme." },
        { tags: ["contenido"], meta: "Septiembre", title: "Valentino + hotel", desc: "Cruce gastronómico como parte de la estadía." },
        { tags: ["Humand"], meta: "Septiembre", title: "Novedades del hotel para colaboradores Gala SA", desc: "" }
      ]
    }
  },
  {
    id: "gala-hotel-convenciones",
    name: "Gala Hotel & Convenciones",
    subtitle: "Posicionamiento · eventos y convenciones · colaboración con Resto Ruta 11 · generación de banco visual",
    accent: "#3B6D11",
    objective: "El lugar de Resistencia donde pasan los eventos que importan.",
    pilares: "Convenciones · Alojamiento · Gastronomía (Ruta 11) · Recepciones",
    months: {
      julio: [
        { tags: ["producción"], meta: "Todo julio", title: "Sesión de fotos y video", desc: "Salones · habitaciones · exteriores · Ruta 11 · lobby." },
        { tags: ["contenido", "pautar"], meta: "Julio", title: "Presentación del hotel", desc: "Serie de piezas por espacio con fotos existentes." },
        { tags: ["posicionamiento", "pautar"], meta: "Julio", title: "El espacio para tu evento", desc: "Capacidad de salones, servicios integrales, respaldo profesional." },
        { tags: ["colaboración", "pautar"], meta: "Julio", title: "Desafío de Sommelier · Ruta 11", desc: "Post en colaboración desde cuenta del hotel." },
        { tags: ["Humand"], meta: "Julio", title: "Novedades del hotel para colaboradores Gala SA", desc: "" }
      ],
      agosto: [
        { tags: ["contenido", "pautar"], meta: "Agosto", title: "Reels de salones y espacios", desc: "Salón montado · detalles · capacidad. Para organizadores de eventos." },
        { tags: ["contenido", "pautar"], meta: "Agosto", title: "Experiencia de estadía", desc: "Habitaciones · servicios · confort." },
        { tags: ["colaboración"], meta: "Agosto", title: "Cena especial agosto · Ruta 11", desc: "Post en colaboración cuando se confirme." },
        { tags: ["Humand"], meta: "Agosto", title: "Novedades del hotel para colaboradores Gala SA", desc: "" }
      ],
      septiembre: [
        { tags: ["posicionamiento", "pautar"], meta: "Septiembre", title: "Campaña de posicionamiento", desc: "“El lugar de Resistencia donde pasan los eventos que importan.”" },
        { tags: ["contenido", "pautar selectivo"], meta: "Septiembre", title: "Corporativo y convenciones", desc: "Empresas, instituciones, servicios para grupos." },
        { tags: ["colaboración"], meta: "Septiembre", title: "Cena especial septiembre · Ruta 11", desc: "Post en colaboración cuando se confirme." },
        { tags: ["contenido", "pautar"], meta: "Septiembre", title: "Anticipo temporada alta", desc: "Disponibilidad de salones para recepciones nov–dic." },
        { tags: ["Humand"], meta: "Septiembre", title: "Novedades del hotel para colaboradores Gala SA", desc: "" }
      ]
    }
  },
  {
    id: "gala-recepciones",
    name: "Gala Recepciones",
    subtitle: "17 noches nov–dic · educación ecommerce · acciones mensuales · BOX de comida en septiembre",
    accent: "#72243E",
    objective: "Que los padres entiendan que con Gala Recepciones tienen todo en un solo lugar — y que usar la plataforma es lo más cómodo que existe.",
    channels: "WhatsApp (principal) · Redes sociales (novedades) · Ecommerce (eventosgala.com.ar)",
    months: {
      julio: [
        { tags: ["promoción", "pautar"], meta: "1–17 jul", title: "5% de descuento en ecommerce", desc: "Para padres que paguen online hasta el 17 de julio." },
        { tags: ["promoción", "WhatsApp"], meta: "17 jul", title: "Extensión una semana más", desc: "“Extendemos el descuento hasta el 24 de julio.” Comunicar ese mismo día." },
        { tags: ["ecommerce", "contenido"], meta: "Julio", title: "¿Cómo usar la plataforma?", desc: "Paso a paso: contraseña · ingresar · pagar · descargar factura." },
        { tags: ["ecommerce", "WhatsApp"], meta: "Julio", title: "Beneficios de pagar online", desc: "Comodidad · desde casa · facturas disponibles · sin filas." }
      ],
      agosto: [
        { tags: ["pendiente"], meta: "", title: "Acción de agosto", desc: "Incentivo mensual a confirmar. Puede ser sorteo, beneficio o nuevo descuento." },
        { tags: ["ecommerce", "WhatsApp"], meta: "Agosto", title: "Recordatorio plataforma", desc: "Para padres que no ingresaron. “Todavía estás a tiempo.”" },
        { tags: ["contenido", "pautar selectivo"], meta: "Agosto", title: "Novedades en redes", desc: "Detrás de escena de una recepción Gala." },
        { tags: ["contenido"], meta: "Agosto", title: "Anticipo BOX de comida", desc: "“Algo nuevo llega en septiembre.” Generar intriga." }
      ],
      septiembre: [
        { tags: ["BOX de comida", "pautar"], meta: "Septiembre", title: "Lanzamiento BOX Clásico y BOX Gourmet", desc: "Nuevo producto de Gala Recepciones. “Tenés todo con nosotros.”" },
        { tags: ["contenido", "WhatsApp"], meta: "Septiembre", title: "17 noches · nov–dic", desc: "Recordar a padres que completen pagos antes de la temporada." },
        { tags: ["promoción"], meta: "Septiembre", title: "Acción del mes", desc: "A definir. Puede vincularse al BOX o al cierre de pagos." },
        { tags: ["contenido", "pautar"], meta: "Septiembre", title: "Redes · detrás de escena", desc: "Preparativos, salones, detalles de una recepción Gala." }
      ]
    }
  }
];
