import { useEffect } from 'react';
import { config } from '@/lib/config';

interface Meta {
  title: string;
  description?: string;
  image?: string;
  path?: string;
  noIndex?: boolean;
}

const SITE_NAME = 'Goddel Motors';

function setMeta(attr: 'name' | 'property', key: string, content: string | undefined): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!content) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string | undefined): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

export function useDocumentMeta({ title, description, image, path, noIndex }: Meta): void {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;
    const url = path !== undefined ? `${config.siteUrl}${path}` : undefined;
    const absoluteImage = image && image.startsWith('/') ? `${config.siteUrl}${image}` : image;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', absoluteImage);
    setMeta('property', 'og:url', url);
    setMeta('name', 'twitter:card', absoluteImage ? 'summary_large_image' : 'summary');
    setMeta('name', 'robots', noIndex ? 'noindex, nofollow' : undefined);
    setCanonical(url);
  }, [title, description, image, path, noIndex]);
}
