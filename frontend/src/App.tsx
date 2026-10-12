import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { PublicLayout } from '@/layouts/PublicLayout';
import { HomePage } from '@/pages/HomePage';
import { CarsPage } from '@/pages/CarsPage';
import { VehicleDetailsPage } from '@/pages/VehicleDetailsPage';
import { AboutPage } from '@/pages/AboutPage';
import { ContactPage } from '@/pages/ContactPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PageLoader } from '@/components/ui/States';

/** The admin area (and Firebase) is split into its own chunk so public visitors never download it. */
const AdminApp = lazy(() => import('@/admin/AdminApp'));

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="cars" element={<CarsPage />} />
        <Route path="cars/:slug" element={<VehicleDetailsPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route
        path="admin/*"
        element={
          <Suspense fallback={<PageLoader label="Loading admin" />}>
            <AdminApp />
          </Suspense>
        }
      />
    </Routes>
  );
}
