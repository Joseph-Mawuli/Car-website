import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoManager } from './PhotoManager';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { VehicleImage } from '@/types';

const photos: VehicleImage[] = [
  { id: 'p1', url: '/p1.jpg', alt: 'Front view', sortOrder: 0 },
  { id: 'p2', url: '/p2.jpg', alt: 'Interior', sortOrder: 1 },
];

function Harness() {
  const [images, setImages] = useState(photos);
  return <PhotoManager vehicleId="v1" vehicleTitle="2020 Toyota Camry" images={images} onChange={setImages} />;
}

async function deleteSecondPhoto() {
  await userEvent.click(screen.getAllByRole('button', { name: 'Delete photo' })[1]);
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete photo' }));
}

describe('PhotoManager', () => {
  it('removes the photo right away without waiting for the server', async () => {
    let finish: () => void = () => {};
    renderWithProviders(<Harness />, {
      api: (_path, options) => {
        if (options.method === 'DELETE') return new Promise((resolve) => (finish = () => resolve(undefined)));
        return Promise.resolve({});
      },
    });
    await deleteSecondPhoto();
    expect(screen.queryByDisplayValue('Interior')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Front view')).toBeInTheDocument();
    finish();
    expect(await screen.findByText('Photo deleted')).toBeInTheDocument();
  });

  it('puts the photo back and explains when the delete fails', async () => {
    renderWithProviders(<Harness />, {
      api: async (_path, options) => {
        if (options.method === 'DELETE') throw new Error('Network down');
        return {};
      },
    });
    await deleteSecondPhoto();
    await waitFor(() => expect(screen.getByDisplayValue('Interior')).toBeInTheDocument());
    expect(await screen.findByText(/couldn't delete the photo/i)).toBeInTheDocument();
  });
});
