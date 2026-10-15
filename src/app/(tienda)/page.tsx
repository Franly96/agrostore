import {
  Check,
  ClipboardCheck,
  Factory,
  Globe,
  Handshake,
  Package,
  Salad,
  Ship,
  Sprout,
  TrendingUp,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GOLDVEG",
  description:
    "GOLDVEG, aliado estratégico en el suministro de frutas y vegetales frescos, respaldado por más de 10 años de experiencia de GOLDAGRO SRL.",
};

type Strength = { icon: LucideIcon; title: string; body: string[] };

const strengths: Strength[] = [
  {
    icon: Truck,
    title: "Flota de camiones propios",
    body: [
      "Contamos con unidades de transporte propias que nos permiten tener mayor control sobre la logística, coordinar entregas oportunas y responder con mayor eficiencia a las necesidades de nuestros clientes.",
    ],
  },
  {
    icon: Factory,
    title: "Planta empacadora propia con cuarto frío",
    body: [
      "Disponemos de instalaciones propias para la recepción, selección, clasificación, empaque y almacenamiento de frutas y vegetales, incluyendo cuarto frío para aquellos productos que requieren conservación a temperaturas controladas.",
      "Esta infraestructura nos permite trabajar para preservar la frescura, calidad y presentación de nuestros productos.",
    ],
  },
  {
    icon: Sprout,
    title: "Disponibilidad de fincas para producción agrícola",
    body: [
      "Tenemos acceso a terrenos agrícolas con capacidad para desarrollar cultivos de acuerdo con las necesidades de nuestros clientes.",
      "Esto nos permite planificar producciones específicas, establecer programas de siembra y contribuir a garantizar el suministro de determinados productos durante el año.",
    ],
  },
  {
    icon: Globe,
    title: "Más de 10 años de experiencia en mercados internacionales",
    body: [
      "A través de nuestra empresa GOLDAGRO SRL, contamos con más de una década de experiencia exportando frutas y vegetales a mercados internacionales.",
      "Esta trayectoria nos ha permitido desarrollar conocimientos en selección, clasificación, manipulación, empaque, logística y estándares de calidad exigidos por compradores internacionales.",
    ],
  },
  {
    icon: Handshake,
    title: "Amplia red de productores nacionales",
    body: [
      "Mantenemos relaciones comerciales con una extensa red de agricultores y productores en diferentes regiones de la República Dominicana.",
      "Gracias a esta red, podemos acceder a una mayor variedad de productos, gestionar volúmenes importantes y contar con distintas fuentes de abastecimiento.",
    ],
  },
  {
    icon: Ship,
    title: "Capacidad de importación ante situaciones de escasez",
    body: [
      "Una de nuestras principales ventajas competitivas es nuestra experiencia en comercio internacional.",
      "Cuando determinados productos presentan escasez en el mercado nacional, contamos con la capacidad de gestionar alternativas de importación para contribuir a mantener la continuidad del suministro, sujeto a disponibilidad y regulaciones aplicables.",
    ],
  },
  {
    icon: Package,
    title: "Empaque personalizado según las necesidades del cliente",
    body: [
      "Entendemos que cada supermercado tiene sus propios requerimientos de presentación, peso, clasificación y empaque.",
      "Por esta razón, ofrecemos la posibilidad de preparar los productos de acuerdo con las especificaciones de cada cliente, facilitando su recepción, almacenamiento, exhibición y comercialización.",
    ],
  },
  {
    icon: Salad,
    title: "Amplia variedad de frutas y vegetales",
    body: [
      "Nuestra estructura de abastecimiento nos permite ofrecer una amplia gama de productos agrícolas nacionales y, cuando sea necesario, gestionar productos importados.",
      "Nuestro objetivo es que los supermercados puedan centralizar una parte importante de sus compras de frutas y vegetales con un solo proveedor, simplificando sus operaciones.",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "Compromiso con la calidad y las buenas prácticas de manipulación",
    body: [
      "Nuestra experiencia en exportación nos permite aplicar conocimientos y procedimientos orientados a la correcta manipulación, selección, clasificación y empaque de los productos agrícolas.",
      "Trabajamos para entregar productos que cumplan con las especificaciones de calidad acordadas con cada cliente.",
    ],
  },
  {
    icon: TrendingUp,
    title: "Capacidad de crecimiento junto a nuestros clientes",
    body: [
      "En GOLDVEG no buscamos únicamente realizar ventas ocasionales.",
      "Nuestro propósito es desarrollar relaciones comerciales a largo plazo, adaptándonos al crecimiento de nuestros clientes, sus necesidades de volumen, frecuencia de entrega y nuevas oportunidades de abastecimiento.",
    ],
  },
];

const commitments = [
  "Mantener un abastecimiento constante y confiable.",
  "Ofrecer frutas y vegetales frescos y cuidadosamente seleccionados.",
  "Reducir las complicaciones relacionadas con la gestión de múltiples proveedores.",
  "Facilitar las operaciones mediante empaques adaptados a sus necesidades.",
  "Desarrollar programas de suministro y planificación de compras.",
  "Ofrecer alternativas de abastecimiento durante períodos de escasez.",
  "Construir relaciones comerciales estables, competitivas y duraderas.",
];

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-10">
      <header className="flex flex-col items-start gap-4">
        <h1 className="text-display text-ink">GOLDVEG</h1>
        <p className="max-w-2xl text-title text-ink">
          Su aliado estratégico en el suministro de frutas y vegetales frescos
        </p>
        <p className="max-w-2xl text-body text-ink-muted">
          Calidad, frescura, experiencia y confianza en cada entrega.
        </p>
      </header>

      <section aria-labelledby="por-que-elegir" className="mt-10 md:mt-16">
        <h2 id="por-que-elegir" className="text-heading text-ink">
          ¿Por qué elegir GOLDVEG como su proveedor?
        </h2>
        <div className="mt-4 flex max-w-3xl flex-col gap-4 text-body text-ink">
          <p>
            En GOLDVEG entendemos que para un supermercado, contar con un proveedor confiable de
            frutas y vegetales es fundamental para garantizar la satisfacción de sus clientes,
            mantener la frescura de sus productos y asegurar el abastecimiento continuo de sus
            establecimientos.
          </p>
          <p>
            Somos una empresa dominicana respaldada por la experiencia, infraestructura y
            trayectoria de GOLDAGRO SRL, con más de 10 años de experiencia en la exportación de
            frutas y vegetales hacia mercados internacionales.
          </p>
          <p>
            Ahora ponemos esa experiencia al servicio del mercado nacional, ofreciendo a
            supermercados, hoteles, restaurantes y otros establecimientos comerciales una solución
            integral para el abastecimiento de productos agrícolas frescos.
          </p>
        </div>
      </section>

      <section aria-labelledby="fortalezas" className="mt-10 md:mt-16">
        <h2 id="fortalezas" className="text-heading text-ink">
          Nuestras principales fortalezas
        </h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {strengths.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="flex flex-col gap-2 rounded-md border border-line bg-surface p-4 md:p-6"
            >
              <span className="mb-2 inline-flex size-11 items-center justify-center rounded-pill bg-green-100 text-green-800">
                <Icon aria-hidden="true" size={24} />
              </span>
              <h3 className="text-title text-ink">{title}</h3>
              {body.map((paragraph) => (
                <p key={paragraph} className="text-body text-ink-muted">
                  {paragraph}
                </p>
              ))}
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="aliado"
        className="mt-10 rounded-md bg-surface-soft p-4 md:mt-16 md:p-6"
      >
        <h2 id="aliado" className="text-heading text-ink">
          Más que un proveedor, un aliado comercial
        </h2>
        <div className="mt-4 flex max-w-3xl flex-col gap-4 text-body text-ink">
          <p>
            Sabemos que uno de los mayores desafíos de los supermercados es mantener sus góndolas
            abastecidas con productos frescos, de buena presentación y a precios competitivos.
          </p>
          <p>
            Por eso, nuestra propuesta va más allá de vender frutas y vegetales. Buscamos ofrecer
            seguridad en el abastecimiento, flexibilidad operativa, capacidad de respuesta y una
            relación comercial basada en la confianza.
          </p>
          <p>
            Nuestra combinación de infraestructura propia, experiencia internacional, acceso a
            productores nacionales, capacidad agrícola y conocimientos logísticos nos permite
            ofrecer una propuesta de valor diferenciada dentro del mercado dominicano.
          </p>
        </div>
      </section>

      <section aria-labelledby="compromiso" className="mt-10 md:mt-16">
        <h2 id="compromiso" className="text-heading text-ink">
          Nuestro compromiso
        </h2>
        <p className="mt-4 max-w-3xl text-body text-ink">
          En GOLDVEG queremos convertirnos en un socio estratégico para su supermercado,
          contribuyendo a:
        </p>
        <ul className="mt-4 flex max-w-3xl flex-col gap-3">
          {commitments.map((item) => (
            <li key={item} className="flex items-start gap-3 text-body text-ink">
              <Check aria-hidden="true" size={24} className="shrink-0 text-green-600" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="confiar" className="mt-10 md:mt-16">
        <h2 id="confiar" className="text-heading text-ink">
          ¿Por qué confiar en nosotros?
        </h2>
        <div className="mt-4 flex max-w-3xl flex-col gap-4 text-body text-ink">
          <p>
            Porque GOLDVEG no comienza desde cero. Nacemos respaldados por más de una década de
            experiencia en el exigente mercado internacional de frutas y vegetales, una
            infraestructura operativa establecida y una amplia red de abastecimiento agrícola.
          </p>
          <p>
            La experiencia que hemos desarrollado llevando productos dominicanos a mercados
            internacionales, ahora la ponemos al servicio de los supermercados de nuestro país.
          </p>
        </div>
      </section>

      <div className="mt-10 flex flex-col items-start gap-4 rounded-md border border-line bg-surface p-4 md:mt-16 md:p-6">
        <div>
          <p className="text-title text-ink">GOLDVEG</p>
          <p className="text-body text-ink-muted">Compra y venta de frutas y vegetales</p>
        </div>
        <p className="text-body text-ink">
          <strong className="font-semibold">Experiencia internacional. Compromiso nacional.</strong>{" "}
          GOLDVEG: cultivamos confianza, entregamos frescura.
        </p>
      </div>
    </main>
  );
}
