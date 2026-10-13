import { CURRENCIES, type CurrencyCode } from '@/types';
import { BODY_TYPE_LABELS, CONDITION_LABELS, DRIVETRAIN_LABELS, FUEL_LABELS, TRANSMISSION_LABELS } from '@/lib/labels';

export type QuickFillField =
  | 'make'
  | 'model'
  | 'trim'
  | 'vin'
  | 'year'
  | 'price'
  | 'currency'
  | 'condition'
  | 'bodyType'
  | 'mileage'
  | 'mileageUnit'
  | 'engineSize'
  | 'fuelType'
  | 'transmission'
  | 'drivetrain'
  | 'exteriorColor'
  | 'interiorColor'
  | 'location'
  | 'description'
  | 'featuresText'
  | 'conditionNotes'
  | 'knownDefects';

export interface QuickFillResult {
  values: Partial<Record<QuickFillField, string>>;
  /** Lines that weren't placed in any field, so staff can copy them across by hand. */
  unused: string[];
}

const MAX_YEAR = new Date().getFullYear() + 1;

/* ------------------------------------------------------------------ vocab */

const MAKES: [alias: string, make: string, modelPrefix?: string][] = [
  ['range rover', 'Land Rover', 'Range Rover'],
  ['land rover', 'Land Rover'],
  ['mercedes-benz', 'Mercedes-Benz'],
  ['mercedes benz', 'Mercedes-Benz'],
  ['mercedes', 'Mercedes-Benz'],
  ['benz', 'Mercedes-Benz'],
  ['volkswagen', 'Volkswagen'],
  ['vw', 'Volkswagen'],
  ['chevrolet', 'Chevrolet'],
  ['chevy', 'Chevrolet'],
  ['rolls-royce', 'Rolls-Royce'],
  ['rolls royce', 'Rolls-Royce'],
  ['aston martin', 'Aston Martin'],
  ['alfa romeo', 'Alfa Romeo'],
  ['great wall', 'Great Wall'],
  ...[
    'Toyota', 'Honda', 'Nissan', 'Mazda', 'Mitsubishi', 'Subaru', 'Suzuki', 'Lexus', 'Infiniti', 'Acura', 'Hyundai', 'Kia', 'Genesis',
    'Ford', 'GMC', 'Dodge', 'Ram', 'Jeep', 'Chrysler', 'Cadillac', 'Lincoln', 'Buick', 'Tesla', 'BMW', 'Audi', 'Porsche', 'Jaguar',
    'Volvo', 'Mini', 'Peugeot', 'Renault', 'Citroen', 'Opel', 'Fiat', 'Maserati', 'Ferrari', 'Lamborghini', 'Bentley', 'Isuzu', 'Hino',
    'Geely', 'Chery', 'BYD', 'Haval', 'GWM', 'Changan', 'JAC', 'Skoda', 'Daihatsu', 'Mahindra', 'Tata', 'Proton', 'SsangYong',
  ].map((m): [string, string] => [m.toLowerCase(), m]),
];

/** First words of models that are always followed by a second word. */
const TWO_WORD_MODEL_STARTS = new Set(['land', 'grand', 'range', 'santa', 'model', 'town', 'new', 'cr', 'rav']);

const COLOURS = [
  'black', 'white', 'silver', 'grey', 'gray', 'blue', 'red', 'green', 'gold', 'brown', 'beige', 'maroon', 'burgundy', 'orange',
  'yellow', 'purple', 'champagne', 'bronze', 'navy', 'cream', 'tan', 'charcoal', 'pearl white', 'wine',
];
const COLOUR_RE = new RegExp(`\\b(?:(?:pearl|metallic|matte|dark|light|deep)\\s+)?(?:${COLOURS.join('|')})\\b`, 'i');

const CHOICES: { field: 'fuelType' | 'transmission' | 'drivetrain' | 'bodyType' | 'condition'; patterns: [RegExp, string][] }[] = [
  {
    field: 'condition',
    patterns: [
      [/\bbrand[\s-]?new\b/i, CONDITION_LABELS.new],
      [/\b(?:foreign|us|usa|american|canada|canadian|japan|japanese|uk|european|tokunbo)[\s-]?used\b|\btokunbo\b/i, CONDITION_LABELS.foreign_used],
      [/\b(?:ghana|ghanaian|locally|local|home)[\s-]?used\b/i, CONDITION_LABELS.locally_used],
      [/\bcertified\s+pre[\s-]?owned\b|\bcpo\b/i, CONDITION_LABELS.certified_pre_owned],
    ],
  },
  {
    field: 'fuelType',
    patterns: [
      [/\bplug[\s-]?in\s+hybrid\b|\bphev\b/i, FUEL_LABELS.plug_in_hybrid],
      [/\bhybrid\b/i, FUEL_LABELS.hybrid],
      [/\bdiesel\b/i, FUEL_LABELS.diesel],
      [/\bpetrol\b|\bgasoline\b/i, FUEL_LABELS.petrol],
      [/\belectric\b|\bEV\b/, FUEL_LABELS.electric],
      [/\blpg\b/i, FUEL_LABELS.lpg],
    ],
  },
  {
    field: 'transmission',
    patterns: [
      [/\bdual[\s-]?clutch\b|\bdct\b|\bdsg\b/i, TRANSMISSION_LABELS.dual_clutch],
      [/\bcvt\b/i, TRANSMISSION_LABELS.cvt],
      [/(?<!semi[\s-]?)\bautomatic\b|\bauto\s*(?:gear|transmission|trans)\b|^auto$|\ba\/t\b|\btiptronic\b/i, TRANSMISSION_LABELS.automatic],
      [/\bmanual\b|\bm\/t\b|\bstick\s*shift\b/i, TRANSMISSION_LABELS.manual],
    ],
  },
  {
    field: 'drivetrain',
    patterns: [
      [/\b4\s?x\s?4\b|\b4wd\b|\bfour[\s-]wheel[\s-]drive\b/i, DRIVETRAIN_LABELS['4wd']],
      [/\bawd\b|\ball[\s-]wheel[\s-]drive\b|\b4matic\b|\bxdrive\b|\bquattro\b/i, DRIVETRAIN_LABELS.awd],
      [/\bfwd\b|\bfront[\s-]wheel[\s-]drive\b/i, DRIVETRAIN_LABELS.fwd],
      [/\brwd\b|\brear[\s-]wheel[\s-]drive\b/i, DRIVETRAIN_LABELS.rwd],
    ],
  },
  {
    field: 'bodyType',
    patterns: [
      [/\bsuv\b/i, BODY_TYPE_LABELS.suv],
      [/\bcrossover\b/i, BODY_TYPE_LABELS.crossover],
      [/\bsedan\b|\bsaloon\b/i, BODY_TYPE_LABELS.sedan],
      [/\bhatch(?:back)?\b/i, BODY_TYPE_LABELS.hatchback],
      [/\bpick[\s-]?up\b|\b(?:double|single|crew)\s+cab(?:in)?\b/i, BODY_TYPE_LABELS.pickup],
      [/\bcoupe\b/i, BODY_TYPE_LABELS.coupe],
      [/\bconvertible\b|\bcabriolet\b/i, BODY_TYPE_LABELS.convertible],
      [/\b(?:station\s+)?wagon\b|\bestate\b/i, BODY_TYPE_LABELS.wagon],
      [/\bmini[\s-]?bus\b/i, BODY_TYPE_LABELS.minibus],
      [/\bvan\b/i, BODY_TYPE_LABELS.van],
    ],
  },
];

const FEATURE_WORDS =
  /\b(camera|sunroof|moonroof|panoramic|leather|navigation|\bgps\b|bluetooth|keyless|push[\s-]?(?:to[\s-]?)?start|cruise|sensor|alloy|carplay|android auto|heated|cooled|ventilated|360|lane|blind[\s-]?spot|airbag|\babs\b|climate|a\/c|air[\s-]?con|power (?:seat|window|mirror|tailgate|boot)|remote start|tow|roof rack|third row|7[\s-]?seater|seater|led|xenon|parking|touch ?screen|screen|speaker|sound system|wireless charg|memory seat|head[\s-]?up|start\/stop|spoiler|rims|fog ?light)/i;
const CONDITION_NOTE_WORDS =
  /\b(accident|clean title|salvage|service history|serviced|duty|registered|unregistered|first owner|one owner|single owner|cleared|customs|no faults|mint|excellent condition|good condition|neat)\b/i;
const CONTACT_LINE = /(https?:\/\/|www\.|@\w|#\w|\bwhats\s?app\b|\bcall\b|\bdm\b|\bcontact\b|\binbox\b|\bfollow us\b)/i;

/* --------------------------------------------------------------- labels */

type LabelTarget = QuickFillField | 'features' | 'ignore';

const LABELS: [RegExp, LabelTarget][] = [
  [/^(?:make|brand|manufacturer)$/, 'make'],
  [/^model$/, 'model'],
  [/^(?:trim|variant|grade|edition|version)$/, 'trim'],
  [/^(?:year|yr|model year|year of (?:manufacture|make)|manufacture year|reg(?:istration)? year)$/, 'year'],
  [/^(?:price|cost|amount|selling price|asking price|our price|price tag)$/, 'price'],
  [/^(?:mileage|odometer|odo|kms?|miles|distance(?: covered)?)$/, 'mileage'],
  [/^(?:engine(?: size| capacity)?|capacity|cc|displacement)$/, 'engineSize'],
  [/^(?:fuel(?: type)?)$/, 'fuelType'],
  [/^(?:transmission|gear ?box|gear|trans)$/, 'transmission'],
  [/^(?:drive(?: ?train| type)?|wheel drive)$/, 'drivetrain'],
  [/^(?:body(?: type| style)?|type|style)$/, 'bodyType'],
  [/^(?:condition|state)$/, 'condition'],
  [/^(?:colou?r|exterior(?: colou?r)?|ext(?:erior)?\.? colou?r|paint)$/, 'exteriorColor'],
  [/^(?:interior(?: colou?r)?|int(?:erior)?\.? colou?r|upholstery)$/, 'interiorColor'],
  [/^(?:location|located|city|available at|pick ?up)$/, 'location'],
  [/^(?:features?|extras?|options?|equipment|comes with|key features|specs?|specifications)$/, 'features'],
  [/^(?:description|details|about|overview|notes?)$/, 'description'],
  [/^(?:condition notes?|history)$/, 'conditionNotes'],
  [/^(?:known )?(?:defects?|issues?|faults?|problems?)$/, 'knownDefects'],
  [/^(?:vin(?: number| no\.?)?|chassis(?: number| no\.?)?|frame(?: number| no\.?)?)$/, 'vin'],
  [/^(?:reg(?:istration)?(?: number| no\.?)?|plate|stock(?: number| no\.?)?|phone|contact|whats ?app|tel)$/, 'ignore'],
];

function labelTarget(key: string): LabelTarget | undefined {
  const k = key.toLowerCase().replace(/[^a-z0-9/ .]/g, ' ').replace(/\s+/g, ' ').trim();
  return LABELS.find(([re]) => re.test(k))?.[1];
}

/* -------------------------------------------------------------- helpers */

function cleanLine(raw: string): string {
  return raw
    .replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, ' ')
    .replace(/^\s*(?:[-–—•*▪●◦►>✓✔]+\s*|\d{1,2}[.)]\s+)/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchChoice(field: (typeof CHOICES)[number]['field'], text: string): string | undefined {
  return CHOICES.find((c) => c.field === field)!.patterns.find(([re]) => re.test(text))?.[1];
}

function toNumber(digits: string, multiplier?: string): number {
  const m = multiplier?.toLowerCase();
  const scale = m === 'k' || m === 'thousand' ? 1_000 : m === 'm' || m === 'million' ? 1_000_000 : 1;
  return Math.round(Number(digits.replace(/[,\s]/g, '')) * scale * 100) / 100;
}

const CURRENCY_ALIASES: [RegExp, CurrencyCode][] = [
  [/^(?:gh\s?[₵¢]|ghs|ghc|gh|[₵¢]|cedis?)$/i, 'GHS'],
  [/^(?:ca\$|c\$|cad)$/i, 'CAD'],
  [/^(?:us\$|usd|\$|dollars?)$/i, 'USD'],
  [/^(?:€|eur|euros?)$/i, 'EUR'],
  [/^(?:£|gbp|pounds?)$/i, 'GBP'],
  [/^(?:₦|ngn|naira)$/i, 'NGN'],
  [/^(?:aed|dirhams?)$/i, 'AED'],
  [/^(?:cny|rmb|¥|yuan)$/i, 'CNY'],
];

function currencyOf(token: string | undefined): CurrencyCode | undefined {
  if (!token) return undefined;
  const code = CURRENCY_ALIASES.find(([re]) => re.test(token.trim()))?.[1];
  return code && (CURRENCIES as readonly string[]).includes(code) ? code : undefined;
}

const CUR_PREFIX = String.raw`(gh\s?[₵¢]|ghs|ghc|[₵¢]|us\$|usd|ca\$|c\$|cad|\$|€|eur|£|gbp|₦|ngn|aed|cny|rmb|¥)`;
const AMOUNT = String.raw`(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d+)?)`;
const MULT = String.raw`(k|m|million|thousand)?`;
const CUR_SUFFIX = String.raw`(cedis?|ghs|usd|dollars?|eur|euros?|gbp|pounds?|cad|ngn|naira|aed|dirhams?|cny|rmb|yuan)?`;
const PRICE_RE = new RegExp(String.raw`${CUR_PREFIX}?\s*${AMOUNT}\s*${MULT}\b\s*${CUR_SUFFIX}\b`, 'gi');

function findPrice(text: string, requireCurrency: boolean): { price: string; currency?: CurrencyCode } | undefined {
  for (const m of text.matchAll(PRICE_RE)) {
    const [, prefix, amount, mult, suffix] = m;
    const currency = currencyOf(prefix) ?? currencyOf(suffix);
    if (requireCurrency && !currency) continue;
    const value = toNumber(amount, mult);
    if (!value || value < 100) continue;
    if (!currency && !mult && /^(19[5-9]\d|20\d\d)$/.test(amount)) continue;
    return { price: String(value), currency };
  }
  return undefined;
}

const MILEAGE_RE = /(\d{1,3}(?:[,\s.]\d{3})+|\d+(?:\.\d+)?)\s*(k)?\s*(km|kms|kilomet(?:er|re)s?|miles?|mi)\b/i;

function findMileage(text: string): { mileage: string; unit?: 'km' | 'mi' } | undefined {
  const m = text.match(MILEAGE_RE);
  if (!m) return undefined;
  const [, amount, k, unit] = m;
  const value = k ? Math.round(Number(amount.replace(/,/g, '')) * 1000) : Number(amount.replace(/[,\s.]/g, ''));
  if (!Number.isFinite(value)) return undefined;
  return { mileage: String(value), unit: /^mi/i.test(unit) ? 'mi' : 'km' };
}

function findEngine(text: string): string | undefined {
  const size = text.match(/\b(\d\.\d)\s?(?:l|litres?|liters?|ltrs?)\b/i)?.[1];
  const cc = text.match(/\b(\d{3,4})\s?cc\b/i)?.[1];
  const cylinders = text.match(/\b(v\s?(?:6|8|10|12)|[3-8][\s-]?cyl(?:inder)?s?|inline[\s-]?[3-6]|i[3-6])\b/i)?.[1];
  const turbo = /\btwin[\s-]?turbo\b/i.test(text) ? 'twin-turbo' : /\bturbo\b/i.test(text) ? 'turbo' : undefined;
  const base = size ? `${size}L` : cc ? `${cc}cc` : undefined;
  if (!base && !cylinders) return undefined;
  const cyl = cylinders && (/^[vi]/i.test(cylinders) ? cylinders.toUpperCase().replace(/\s/g, '') : cylinders.toLowerCase());
  return [base, cyl, turbo].filter(Boolean).join(' ').slice(0, 30);
}

/** Standard 17-character VIN (never contains I, O or Q), with at least one letter and one digit. */
function findVin(text: string): string | undefined {
  for (const m of text.matchAll(/\b[A-HJ-NPR-Z0-9]{17}\b/gi)) {
    if (/\d/.test(m[0]) && /[a-z]/i.test(m[0])) return m[0].toUpperCase();
  }
  return undefined;
}

function findYear(text: string): string | undefined {
  for (const m of text.matchAll(/\b(19[5-9]\d|20\d\d)\b/g)) {
    const y = Number(m[1]);
    if (y >= 1950 && y <= MAX_YEAR) return m[1];
  }
  return undefined;
}

function titleCase(s: string): string {
  return s.replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

const MODEL_STOP =
  /^(for|sale|available|with|in|at|price|now|full|option|options|clean|neat|super|very|is|and|&|registered|unregistered|duty|paid|just|arrived|automatic|manual|petrol|diesel|hybrid|electric|foreign|brand|ghana|ghanaian|locally|local|home|used|new|tokunbo|suv|sedan|saloon|hatchback|pickup|coupe|convertible|wagon|van|crossover|4x4|awd|4wd|fwd|rwd|km|kms|miles)$/i;

function findMakeModel(text: string): { make: string; model?: string; trim?: string } | undefined {
  const lower = text.toLowerCase();
  let best: { index: number; alias: string; make: string; prefix?: string } | undefined;
  for (const [alias, make, prefix] of MAKES) {
    const re = new RegExp(`(^|[^a-z0-9])${alias.replace(/[-]/g, '[\\s-]?').replace(/ /g, '\\s+')}(?=$|[^a-z0-9])`, 'i');
    const m = re.exec(lower);
    if (!m) continue;
    const index = m.index + m[1].length;
    if (!best || index < best.index || (index === best.index && alias.length > best.alias.length)) best = { index, alias, make, prefix };
  }
  if (!best) return undefined;

  const after = text.slice(best.index + best.alias.length).replace(/^[\s:,-]+/, '');
  const tokens: string[] = [];
  for (const raw of after.split(/\s+/)) {
    if (/^[|–—,(/]/.test(raw) || raw === '-') break;
    const token = raw.replace(/[,.;:!)]+$/, '');
    if (!token || MODEL_STOP.test(token) || /^(19[5-9]\d|20\d\d)$/.test(token) || /[₵¢$€£₦]/.test(token) || /^\d{1,3}(,\d{3})+/.test(token)) break;
    tokens.push(token);
    if (/[,;|]$/.test(raw) || tokens.length >= 5) break;
  }
  if (best.prefix) tokens.unshift(...best.prefix.split(' '));
  if (tokens.length === 0) return { make: best.make };

  const modelLength = tokens.length > 1 && TWO_WORD_MODEL_STARTS.has(tokens[0].toLowerCase()) ? 2 : 1;
  const fix = (t: string) => (/^[a-z]+$/.test(t) ? titleCase(t) : t);
  const model = tokens.slice(0, modelLength).map(fix).join(' ');
  const trim = tokens.slice(modelLength, modelLength + 3).join(' ');
  return { make: best.make, model, trim: trim || undefined };
}

function splitList(value: string): string[] {
  return value
    .split(/\s*(?:[,;|]|\s\/\s|\band\b(?=\s+[a-z]))\s*/i)
    .map((s) => cleanLine(s))
    .filter((s) => s.length > 1 && s.length <= 80);
}

/* ---------------------------------------------------------------- parse */

export function parseVehicleText(input: string): QuickFillResult {
  const values: QuickFillResult['values'] = {};
  const features: string[] = [];
  const description: string[] = [];
  const conditionNotes: string[] = [];
  const defects: string[] = [];
  const unused: string[] = [];
  const set = (field: QuickFillField, value: string | undefined) => {
    if (value && !values[field]) values[field] = value.trim();
  };

  const lines = input.split(/\r?\n/).map(cleanLine);
  const firstLines = lines.filter(Boolean).slice(0, 3);
  let section: 'features' | 'description' | 'conditionNotes' | 'knownDefects' | undefined;
  const leftovers: string[] = [];

  for (const line of lines) {
    if (!line) {
      section = undefined;
      continue;
    }
    const isVinLine = /^(?:vin|chassis|frame)\b/i.test(line);
    if (!isVinLine && (CONTACT_LINE.test(line) || /(?:\+?\d[\d\s-]{8,}\d)/.test(line.replace(/\d{1,3}(,\d{3})+/g, '')))) {
      if (!/\b(price|mileage|km|miles)\b/i.test(line)) continue;
    }

    const labelled = line.match(/^([A-Za-z][A-Za-z .()/]{0,30}?)\s*(?::|=|–|—|\s-\s)\s*(.*)$/);
    const target = labelled ? labelTarget(labelled[1]) : undefined;
    if (labelled && target) {
      const value = labelled[2].trim();
      section = undefined;
      switch (target) {
        case 'ignore':
          break;
        case 'features':
          if (value) features.push(...splitList(value));
          else section = 'features';
          break;
        case 'description':
        case 'conditionNotes':
        case 'knownDefects':
          if (value) (target === 'description' ? description : target === 'conditionNotes' ? conditionNotes : defects).push(value);
          else section = target;
          break;
        case 'price': {
          const p = findPrice(value, false);
          if (p) {
            set('price', p.price);
            set('currency', p.currency);
          }
          break;
        }
        case 'mileage': {
          const m = findMileage(value) ?? (/\d/.test(value) ? { mileage: value.replace(/[^\d]/g, ''), unit: /mi/i.test(labelled[1]) ? ('mi' as const) : undefined } : undefined);
          if (m?.mileage) {
            set('mileage', m.mileage);
            set('mileageUnit', m.unit);
          }
          break;
        }
        case 'year':
          set('year', findYear(value));
          break;
        case 'vin': {
          const vin = value.replace(/[^A-Za-z0-9\- ]/g, '').trim().toUpperCase();
          if (vin.length >= 5) set('vin', vin.slice(0, 30));
          break;
        }
        case 'engineSize':
          set('engineSize', findEngine(value) ?? value.slice(0, 30));
          break;
        case 'condition': {
          const known = matchChoice('condition', value);
          if (known) set('condition', known);
          else if (value) conditionNotes.push(`${titleCase(value.split(' ')[0])}${value.slice(value.split(' ')[0].length)}`);
          break;
        }
        case 'fuelType':
        case 'transmission':
        case 'drivetrain':
        case 'bodyType':
          set(target, matchChoice(target, value) ?? (value ? titleCase(value).slice(0, 40) : undefined));
          break;
        case 'make': {
          const mm = findMakeModel(value);
          set('make', mm?.make ?? titleCase(value));
          if (mm?.model && !values.model) set('model', mm.model);
          break;
        }
        default:
          set(target, value);
      }
      continue;
    }

    if (section) {
      if (section === 'features') features.push(...splitList(line));
      else (section === 'description' ? description : section === 'conditionNotes' ? conditionNotes : defects).push(line);
      continue;
    }
    leftovers.push(line);
  }

  const free = leftovers.join('\n');
  const title = firstLines.join(' ');

  const titleLine = firstLines.find((l) => findMakeModel(l));
  const mm = titleLine ? findMakeModel(titleLine) : undefined;
  if (mm) {
    set('make', mm.make);
    set('model', mm.model);
    set('trim', mm.trim);
  }
  set('vin', findVin(free));
  set('year', findYear(title) ?? findYear(free));
  const price = findPrice(free, true);
  if (price) {
    set('price', price.price);
    set('currency', price.currency);
  }
  const mileage = findMileage(free);
  if (mileage) {
    set('mileage', mileage.mileage);
    set('mileageUnit', mileage.unit);
  }
  set('engineSize', findEngine(free));
  for (const { field } of CHOICES) set(field, matchChoice(field, free));

  for (const line of leftovers) {
    const mentionsColour = /\b(colou?r|exterior|paint)\b/i.test(line) || line === titleLine;
    for (const m of line.matchAll(new RegExp(COLOUR_RE.source, 'gi'))) {
      const colour = titleCase(m[0].toLowerCase());
      const around = line.slice(Math.max(0, m.index - 12), m.index + m[0].length + 24);
      const isInterior = new RegExp(`interior\\W+${m[0]}|${m[0]}\\s+(?:\\w+\\s+)?(?:leather|interior|seats?|upholstery)`, 'i').test(around);
      if (isInterior) set('interiorColor', colour);
      else if (mentionsColour) set('exteriorColor', colour);
    }
    const located = line.match(/\b(?:[Ll]ocated|[Ll]ocation|[Bb]ased|[Aa]vailable|[Cc]ar is)\s+(?:in|at)\s+([A-Z][\w' -]{2,60}?)(?:[.,!]|$)/);
    if (located) set('location', located[1].trim());
  }

  for (const line of leftovers) {
    const words = line.split(' ').filter((w) => /[a-z0-9]/i.test(w)).length;
    if (line === titleLine) continue;
    const parts = line.split(/\s*[•|·,;/]\s*/).filter(Boolean);
    if (parts.length > 1 && parts.every((part) => isConsumed(part, values))) continue;
    if (COLOUR_RE.test(line) && /\b(exterior|interior|colou?r|paint)\b/i.test(line) && words <= 10) continue;
    if (/^[^a-z]*\b(?:defects?|issues?|faults?)\b/i.test(line)) defects.push(line);
    else if (CONDITION_NOTE_WORDS.test(line) && words <= 14) conditionNotes.push(line);
    else if (line.includes(',') && FEATURE_WORDS.test(line) && words <= 30 && !/[.!?]$/.test(line)) features.push(...splitList(line));
    else if (FEATURE_WORDS.test(line) && words <= 8) features.push(line);
    else if (words >= 6) description.push(line);
    else if (!isConsumed(line, values)) unused.push(line);
  }

  if (features.length) set('featuresText', [...new Set(features.map((f) => f.charAt(0).toUpperCase() + f.slice(1)))].join('\n'));
  if (description.length) set('description', description.join('\n\n'));
  if (conditionNotes.length) set('conditionNotes', conditionNotes.join('\n'));
  if (defects.length) set('knownDefects', defects.join('\n'));

  return { values, unused };
}

/** Short lines like "Automatic" or "GH₵ 250,000" whose information was already captured elsewhere. */
function isConsumed(line: string, values: QuickFillResult['values']): boolean {
  if (values.vin && line.toUpperCase().includes(values.vin)) return true;
  if (findPrice(line, true) || findMileage(line) || findEngine(line) || findYear(line)) return true;
  if (CHOICES.some(({ field }) => matchChoice(field, line))) return true;
  if (COLOUR_RE.test(line) && (values.exteriorColor || values.interiorColor)) return true;
  return /^(for sale|available|sold|new arrival|just arrived|price negotiable|negotiable|neat|clean)$/i.test(line);
}
