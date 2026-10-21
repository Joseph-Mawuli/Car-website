import { apiRequest, apiUpload } from '@/lib/api';
import type {
  AdminSettings,
  AdminVehicle,
  AuditLogEntry,
  AvailabilityStatus,
  CurrentStaff,
  DashboardSummary,
  Enquiry,
  EnquiryStatus,
  Paginated,
  SetupLinkDelivery,
  StaffMember,
  StaffRole,
  StaffStatus,
  VehicleImage,
  Visibility,
} from '@/types';

const auth = { auth: true } as const;

export const adminApi = {
  me: () => apiRequest<CurrentStaff>('/admin/me', auth),
  updateMyName: (displayName: string) => apiRequest<CurrentStaff>('/admin/me', { ...auth, method: 'PATCH', body: { displayName } }),
  dashboard: (signal?: AbortSignal) => apiRequest<DashboardSummary>('/admin/dashboard', { ...auth, signal }),

  listVehicles: (
    query: { q?: string; availability?: AvailabilityStatus; visibility?: Visibility; sort?: string; page?: number; limit?: number },
    signal?: AbortSignal,
  ) => apiRequest<Paginated<AdminVehicle>>('/admin/vehicles', { ...auth, query, signal }),
  getVehicle: (id: string, signal?: AbortSignal) => apiRequest<AdminVehicle>(`/admin/vehicles/${id}`, { ...auth, signal }),
  createVehicle: (body: Record<string, unknown>) => apiRequest<AdminVehicle>('/admin/vehicles', { ...auth, method: 'POST', body }),
  updateVehicle: (id: string, body: Record<string, unknown>) => apiRequest<AdminVehicle>(`/admin/vehicles/${id}`, { ...auth, method: 'PATCH', body }),
  archiveVehicle: (id: string) => apiRequest<AdminVehicle>(`/admin/vehicles/${id}/archive`, { ...auth, method: 'POST' }),
  restoreVehicle: (id: string) => apiRequest<AdminVehicle>(`/admin/vehicles/${id}/restore`, { ...auth, method: 'POST' }),
  deleteVehicle: (id: string) => apiRequest<void>(`/admin/vehicles/${id}`, { ...auth, method: 'DELETE' }),

  uploadImages: (id: string, files: File[], onProgress?: (f: number) => void) => {
    const form = new FormData();
    files.forEach((f) => form.append('photos', f));
    return apiUpload<{ images: VehicleImage[] }>(`/admin/vehicles/${id}/images`, form, { onProgress });
  },
  replaceImage: (id: string, imageId: string, file: File, onProgress?: (f: number) => void) => {
    const form = new FormData();
    form.append('photo', file);
    return apiUpload<VehicleImage>(`/admin/vehicles/${id}/images/${imageId}/file`, form, { method: 'PUT', onProgress });
  },
  deleteImage: (id: string, imageId: string) => apiRequest<void>(`/admin/vehicles/${id}/images/${imageId}`, { ...auth, method: 'DELETE' }),
  reorderImages: (id: string, imageIds: string[]) => apiRequest<void>(`/admin/vehicles/${id}/images/order`, { ...auth, method: 'PUT', body: { imageIds } }),
  updateImageAlt: (id: string, imageId: string, alt: string) =>
    apiRequest<void>(`/admin/vehicles/${id}/images/${imageId}`, { ...auth, method: 'PATCH', body: { alt } }),

  listEnquiries: (query: { q?: string; status?: EnquiryStatus; assigned?: string; page?: number }, signal?: AbortSignal) =>
    apiRequest<Paginated<Enquiry>>('/admin/enquiries', { ...auth, query, signal }),
  getEnquiry: (id: string, signal?: AbortSignal) => apiRequest<Enquiry>(`/admin/enquiries/${id}`, { ...auth, signal }),
  updateEnquiry: (id: string, body: { status?: EnquiryStatus; assignedTo?: string | null }) =>
    apiRequest<Enquiry>(`/admin/enquiries/${id}`, { ...auth, method: 'PATCH', body }),
  addEnquiryNote: (id: string, body: string) => apiRequest<Enquiry>(`/admin/enquiries/${id}/notes`, { ...auth, method: 'POST', body: { body } }),
  deleteEnquiry: (id: string) => apiRequest<void>(`/admin/enquiries/${id}`, { ...auth, method: 'DELETE' }),
  assignees: (signal?: AbortSignal) => apiRequest<{ id: string; name: string; role: StaffRole }[]>('/admin/enquiries/assignees', { ...auth, signal }),

  listStaff: (signal?: AbortSignal) => apiRequest<StaffMember[]>('/admin/staff', { ...auth, signal }),
  inviteStaff: (body: { email: string; displayName: string; role: StaffRole }) =>
    apiRequest<{ staff: StaffMember; delivery: SetupLinkDelivery }>('/admin/staff', { ...auth, method: 'POST', body }),
  updateStaff: (id: string, body: { role?: StaffRole; status?: StaffStatus; displayName?: string }) =>
    apiRequest<StaffMember>(`/admin/staff/${id}`, { ...auth, method: 'PATCH', body }),
  staffSetupLink: (id: string) => apiRequest<{ email: string; delivery: SetupLinkDelivery }>(`/admin/staff/${id}/setup-link`, { ...auth, method: 'POST' }),

  getSettings: (signal?: AbortSignal) => apiRequest<AdminSettings>('/admin/settings', { ...auth, signal }),
  updateSettings: (body: Record<string, unknown>) => apiRequest<AdminSettings>('/admin/settings', { ...auth, method: 'PUT', body }),
  uploadLogo: (file: File, onProgress?: (f: number) => void) => {
    const form = new FormData();
    form.append('logo', file);
    return apiUpload<AdminSettings>('/admin/settings/logo', form, { method: 'PUT', onProgress });
  },
  deleteLogo: () => apiRequest<AdminSettings>('/admin/settings/logo', { ...auth, method: 'DELETE' }),

  auditLogs: (page: number, signal?: AbortSignal) => apiRequest<Paginated<AuditLogEntry>>('/admin/audit-logs', { ...auth, query: { page }, signal }),
  deleteAuditLog: (id: string) => apiRequest<void>(`/admin/audit-logs/${id}`, { ...auth, method: 'DELETE' }),
  clearAuditLog: () => apiRequest<{ removed: number }>('/admin/audit-logs', { ...auth, method: 'DELETE', body: { confirm: true } }),
};
