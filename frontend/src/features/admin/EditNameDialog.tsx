import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/States';
import { errorMessage } from '@/lib/api';

const schema = z.object({ displayName: z.string().trim().min(2, 'Enter a name.').max(80, 'Use 80 characters or fewer.') });
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  title: string;
  currentName: string;
  description?: string;
  onClose: () => void;
  onSave: (displayName: string) => Promise<void>;
}

/** Name editor shared by the "your profile" card and the owner's Team page. */
export function EditNameDialog({ open, title, currentName, description, onClose, onSave }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      {open && <EditNameForm currentName={currentName} description={description} onClose={onClose} onSave={onSave} />}
    </Dialog>
  );
}

function EditNameForm({ currentName, description, onClose, onSave }: Omit<Props, 'open' | 'title'>) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { displayName: currentName } });

  const onSubmit = async ({ displayName }: Values) => {
    setServerError(null);
    try {
      await onSave(displayName);
      onClose();
    } catch (err) {
      setServerError(errorMessage(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {description && <p className="text-sm text-muted">{description}</p>}
      {serverError && <Alert tone="error">{serverError}</Alert>}
      <TextField label="Full name" required autoComplete="name" autoFocus maxLength={80} error={errors.displayName?.message} {...register('displayName')} />
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty} leftIcon={<Save className="h-4 w-4" aria-hidden />}>
          Save name
        </Button>
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
