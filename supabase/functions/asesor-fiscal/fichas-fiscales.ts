// Fichas fiscales de México que se le pegan al prompt del Asesor Fiscal.
// Base curada por Eduardo + Claude. ACTUALIZAR cuando haya reforma fiscal
// (normalmente cada enero con la Miscelánea Fiscal). Última revisión: sep 2026.
// Regla: el asesor da ORIENTACIÓN con estas fichas + los datos del usuario;
// las cifras de ley se presentan como "tope/tasa de ley vigente, confírmalo".

export const FICHAS_FISCALES = `
═══════════════════════════════════════════════════════════
REGÍMENES FISCALES (persona física con negocio)
═══════════════════════════════════════════════════════════

RESICO (Régimen Simplificado de Confianza, personas físicas):
- Para quien factura hasta 3.5 millones de pesos al año (actividad empresarial,
  servicios profesionales o arrendamiento).
- ISR bajísimo: entre 1% y 2.5% según el nivel de ingresos — pero se paga sobre
  los INGRESOS FACTURADOS, sin restar gastos. No hay deducciones.
- Si le factura a una persona moral, esta le retiene 1.25% de ISR.
- Se pierde el régimen si excede 3.5M o incumple declaraciones — y quien sale de
  RESICO por incumplimiento NO PUEDE VOLVER. Cuidar las declaraciones es vital.
- OJO: en RESICO no hay deducciones de ISR, pero el IVA de las compras con
  factura SÍ se acredita en la declaración mensual de IVA. Las facturas de
  gastos siguen sirviendo — para el IVA.
- Conviene cuando el margen es alto (pocos gastos deducibles). Si los gastos son
  grandes, a veces conviene más régimen general aun con tasa mayor.

ACTIVIDAD EMPRESARIAL Y PROFESIONAL (régimen general, persona física):
- ISR con tarifa progresiva (aprox. 1.92% a 35%) sobre la UTILIDAD:
  ingresos cobrados menos deducciones autorizadas.
- Pagos provisionales mensuales (a más tardar el día 17) y declaración anual en abril.
- Aquí las deducciones SÍ importan: cada gasto con factura baja el impuesto.

PERSONA MORAL (régimen general):
- ISR 30% sobre la utilidad fiscal. Declaración anual en marzo.
- PTU: 10% de la utilidad se reparte a los trabajadores (si hay empleados).

═══════════════════════════════════════════════════════════
IVA — LO QUE TODO DUEÑO DEBE ENTENDER
═══════════════════════════════════════════════════════════
- Tasa general 16% (región fronteriza norte: estímulo al 8% en ciertos casos).
- El IVA que COBRAS en tus ventas no es tuyo: se lo debes al SAT.
- El IVA que PAGAS en tus compras (IVA acreditable) se resta — PERO solo cuenta
  si el gasto tiene CFDI (factura) y está efectivamente pagado.
- Cada mes se declara: IVA cobrado − IVA acreditable = IVA a pagar (o a favor).
- Traducción práctica: cada compra SIN factura te cuesta un 16% extra que no
  puedes recuperar, más el ISR que no puedes deducir.

═══════════════════════════════════════════════════════════
DEDUCCIONES — REGLAS DE ORO
═══════════════════════════════════════════════════════════
Para que un gasto sea deducible necesita, en general:
1. CFDI (factura) a tu RFC, con el uso de CFDI correcto.
2. Pago con medios bancarizados si supera 2,000 pesos (transferencia/tarjeta;
   en efectivo casi nunca es deducible arriba de ese monto).
3. Ser estrictamente indispensable para tu actividad.

Deducibles típicos de un negocio: mercancía e insumos, renta del local, luz,
internet y teléfono del negocio, publicidad, comisiones bancarias, honorarios
contables, nómina (con sus requisitos), gasolina (pagada con tarjeta/monedero),
equipo de cómputo y mobiliario (vía depreciación).

NO deducibles típicos: gastos personales, súper de la casa, comidas sin requisitos
(las de negocio solo 8.5% y con condiciones), compras en efectivo sin factura.

Inversiones (se deducen por porcentajes anuales, no de golpe):
- Construcciones: 5% anual (20 años). El TERRENO no se deduce nunca.
- Mobiliario y equipo: 10% anual. Equipo de cómputo: 30% anual.
- Automóviles: 25% anual con TOPE de ley (~175,000 para convencionales;
  mayor para eléctricos/híbridos — confirmar tope vigente).

═══════════════════════════════════════════════════════════
CASO CLÁSICO: ¿COMPRAR O RENTAR LOCAL?
═══════════════════════════════════════════════════════════
Marco para orientar (la decisión final es del usuario con su contador):
- RENTA: 100% deducible mes a mes (con CFDI del arrendador) → baja ISR ya,
  no compromete capital, flexible si el negocio crece o cambia de zona.
- COMPRA: solo la CONSTRUCCIÓN se deduce y al 5% anual (tardas 20 años);
  el terreno jamás se deduce; los INTERESES del crédito sí son deducibles.
  A cambio: patrimonio, plusvalía posible, dejas de pagar renta.
- Preguntas que el asesor debe hacer con los datos del usuario: ¿cuánto pagas
  hoy de renta vs cuánto sería la mensualidad?, ¿el negocio genera utilidad
  estable (ver sus números)?, ¿te descapitaliza el enganche?, ¿la deducción
  perdida vs renta te sube el ISR? Fiscalmente la renta suele ganar a corto
  plazo; patrimonialmente la compra puede ganar a largo. Depende de sus números.

═══════════════════════════════════════════════════════════
FECHAS Y OBLIGACIONES BÁSICAS
═══════════════════════════════════════════════════════════
- Declaraciones mensuales (ISR provisional e IVA): a más tardar el día 17
  del mes siguiente.
- Anual persona física: abril. Anual persona moral: marzo.
- Constancia de situación fiscal y opinión de cumplimiento: se piden cada vez más.
- No declarar "en ceros" estando activo genera multas y pérdida de RESICO.

═══════════════════════════════════════════════════════════
LÍMITES DEL ASESOR (obligatorio respetarlos)
═══════════════════════════════════════════════════════════
- Esto es ORIENTACIÓN EDUCATIVA con los datos reales del usuario; no sustituye
  a un contador ni es asesoría legal. En decisiones importantes (cambio de
  régimen, compra fuerte, problema con el SAT) SIEMPRE cerrar con:
  "valídalo con tu contador antes de moverte".
- Las tasas y topes cambian con reformas (cada enero): presentar cifras de ley
  como "tope/tasa vigente de ley — confírmalo".
- Jamás sugerir nada para evadir impuestos, facturas falsas, ni "trucos".
  Estrategia fiscal = pagar lo justo DENTRO de la ley (deducir bien, elegir
  régimen correcto, facturar bien). Eso sí, con todo.
`;
