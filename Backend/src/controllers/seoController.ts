import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { escapeHtml } from '../lib/text.js';
import { slugParams } from '../schemas/vehicle.js';
import { getPublicVehicleBySlug, listPublishedSlugs } from '../services/vehicleService.js';
import { AppError } from '../lib/errors.js';

const site = () => env.PUBLIC_SITE_URL.replace(/\/+$/, '');

export async function sitemap(_req: Request, res: Response) {
  const vehicles = await listPublishedSlugs();
  const urls = [
    { loc: `${site()}/`, changefreq: 'daily' },
    { loc: `${site()}/cars`, changefreq: 'daily' },
    { loc: `${site()}/about`, changefreq: 'monthly' },
    { loc: `${site()}/contact`, changefreq: 'monthly' },
    ...vehicles.map((v) => ({ loc: `${site()}/cars/${v.slug}`, lastmod: v.updatedAt.toISOString(), changefreq: 'weekly' })),
  ];
  const body = urls
    .map((u) => `<url><loc>${escapeHtml(u.loc)}</loc>${'lastmod' in u ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.changefreq}</changefreq></url>`)
    .join('');
  res
    .type('application/xml')
    .set('Cache-Control', 'public, max-age=900')
    .send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`);
}

/**
 * Social networks and messaging apps don't run JavaScript, so shared vehicle links
 * need server-rendered Open Graph tags. This page provides them and immediately
 * redirects real visitors to the SPA route.
 */
export async function shareVehicle(req: Request, res: Response) {
  const parsed = slugParams.safeParse(req.params);
  const target = parsed.success ? `${site()}/cars/${parsed.data.slug}` : `${site()}/cars`;
  try {
    if (!parsed.success) throw new AppError(404, 'not_found', 'Not found');
    const { vehicle } = await getPublicVehicleBySlug(parsed.data.slug);
    const image = vehicle.images[0]?.variants.large?.url ?? vehicle.images[0]?.url;
    const title = `${vehicle.title} — ${vehicle.currency} ${vehicle.price.toLocaleString('en-GH')} | Goddel Motors`;
    const description = [vehicle.trim, vehicle.mileage !== undefined ? `${vehicle.mileage.toLocaleString('en-GH')} ${vehicle.mileageUnit ?? 'km'}` : undefined, vehicle.transmission, vehicle.fuelType]
      .filter(Boolean)
      .join(' · ');
    res
      .type('html')
      .set('Cache-Control', 'public, max-age=300')
      .send(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description || 'View this vehicle at Goddel Motors.')}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Goddel Motors">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description || 'View this vehicle at Goddel Motors.')}">
<meta property="og:url" content="${escapeHtml(target)}">
${image ? `<meta property="og:image" content="${escapeHtml(image)}"><meta name="twitter:card" content="summary_large_image">` : ''}
<link rel="canonical" href="${escapeHtml(target)}">
<meta http-equiv="refresh" content="0;url=${escapeHtml(target)}">
</head><body><a href="${escapeHtml(target)}">View ${escapeHtml(vehicle.title)}</a></body></html>`);
  } catch {
    res.redirect(302, target);
  }
}
