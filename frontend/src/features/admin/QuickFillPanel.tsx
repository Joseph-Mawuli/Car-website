import { useState } from 'react';
import { ChevronDown, ClipboardPaste, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TextAreaField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/States';
import { parseVehicleText, type QuickFillField } from './parseVehicleText';

export const QUICK_FILL_LABELS: Record<QuickFillField, string> = {
  make: 'Make',
  model: 'Model',
  trim: 'Trim',
  vin: 'VIN',
  year: 'Year',
  price: 'Price',
  currency: 'Currency',
  condition: 'Condition',
  bodyType: 'Body type',
  mileage: 'Mileage',
  mileageUnit: 'Mileage unit',
  engineSize: 'Engine',
  fuelType: 'Fuel type',
  transmission: 'Transmission',
  drivetrain: 'Drivetrain',
  exteriorColor: 'Exterior colour',
  interiorColor: 'Interior colour',
  location: 'Location',
  description: 'Description',
  featuresText: 'Features',
  conditionNotes: 'Condition notes',
  knownDefects: 'Known defects',
};

const REQUIRED: QuickFillField[] = ['make', 'model', 'year', 'price'];

const PLACEHOLDER = `e.g.
2018 Toyota Camry SE
Price: GH₵ 250,000
45,000 km, 2.5L petrol, automatic
Foreign used, black with beige interior
Reverse camera, sunroof, leather seats`;

interface Outcome {
  filled: QuickFillField[];
  missing: QuickFillField[];
  unused: string[];
}

/**
 * Paste a listing (WhatsApp post, supplier message, auction sheet) and fill the form from it.
 * Runs entirely in the browser; only details found in the text are filled.
 */
export function QuickFillPanel({
  defaultOpen,
  disabled,
  isFilled,
  onApply,
}: {
  defaultOpen: boolean;
  disabled?: boolean;
  /** Whether a required field already has a value in the form. */
  isFilled: (field: QuickFillField) => boolean;
  onApply: (values: Partial<Record<QuickFillField, string>>) => void;
}) {
  const [text, setText] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const canReadClipboard = typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.readText);

  const fill = (source = text) => {
    const { values, unused } = parseVehicleText(source);
    const filled = (Object.keys(values) as QuickFillField[]).filter((k) => k !== 'mileageUnit' && k !== 'currency' && values[k]);
    onApply(values);
    setOutcome({ filled, missing: REQUIRED.filter((f) => !values[f] && !isFilled(f)), unused });
  };

  const pasteAndFill = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip.trim()) return;
      setText(clip);
      fill(clip);
    } catch {
      /* Permission denied — staff can still paste into the box by hand. */
    }
  };

  return (
    <details className="group card mb-5 scroll-mt-20" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-start gap-3 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-500">
          <Wand2 className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold">Quick fill from text</span>
          <span className="mt-0.5 block text-sm text-muted">Paste a listing or message and we'll fill in what we can. You can correct anything afterwards.</span>
        </span>
        <ChevronDown className="mt-2 h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
      </summary>

      <div className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
        <TextAreaField
          label="Listing text"
          rows={6}
          placeholder={PLACEHOLDER}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          className="min-h-36 field-sizing-content"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => fill()} disabled={disabled || !text.trim()} leftIcon={<Wand2 className="h-4 w-4" aria-hidden />}>
            Fill the form
          </Button>
          {canReadClipboard && (
            <Button variant="outline" onClick={pasteAndFill} disabled={disabled} leftIcon={<ClipboardPaste className="h-4 w-4" aria-hidden />}>
              Paste &amp; fill
            </Button>
          )}
          {text && (
            <Button
              variant="ghost"
              onClick={() => {
                setText('');
                setOutcome(null);
              }}
            >
              Clear text
            </Button>
          )}
        </div>

        {outcome &&
          (outcome.filled.length === 0 ? (
            <Alert tone="warning">We couldn't recognise any vehicle details in that text. Try including the make, model, year and price.</Alert>
          ) : (
            <Alert tone="success">
              <p className="font-semibold">
                Filled {outcome.filled.length} {outcome.filled.length === 1 ? 'field' : 'fields'}. Please check them below before saving.
              </p>
              <p className="mt-1 text-sm">{outcome.filled.map((f) => QUICK_FILL_LABELS[f]).join(', ')}</p>
              {outcome.missing.length > 0 && <p className="mt-2 text-sm font-semibold text-amber-200">Still needed: {outcome.missing.map((f) => QUICK_FILL_LABELS[f]).join(', ')}</p>}
            </Alert>
          ))}
        {outcome && outcome.unused.length > 0 && (
          <details className="rounded-xl bg-surface-2 p-3 text-sm">
            <summary className="cursor-pointer font-semibold">Not used ({outcome.unused.length})</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              {outcome.unused.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </details>
  );
}
