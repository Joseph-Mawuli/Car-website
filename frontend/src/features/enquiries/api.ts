import { apiRequest } from '@/lib/api';
import type { EnquiryInput } from '@/types';

export function submitEnquiry(input: EnquiryInput) {
  return apiRequest<{ id: string }>('/enquiries', { method: 'POST', body: input });
}
