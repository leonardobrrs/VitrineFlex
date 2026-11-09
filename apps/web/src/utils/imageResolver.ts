/**
 * VitrineFlex — Image URL Resolver
 * 
 * Suporta imagens locais armazenadas em apps/web/public/images/products/
 * e URLs remotas (Unsplash, CDN externa, etc.).
 * Permite injeção de VITE_IMAGE_BASE_URL (ex: bucket S3 ou CloudFront CDN)
 * para deploys distribuídos sem alteração de código.
 */

export const resolveProductImage = (url: string | null | undefined): string => {
  if (!url) return '';

  // Se já for URL absoluta (http/https), retorna diretamente
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Base URL opcional para deploy em CDN/S3
  const imageBaseUrl = ((import.meta as any).env?.VITE_IMAGE_BASE_URL as string | undefined)?.replace(/\/$/, '') || '';

  if (url.startsWith('/')) {
    return imageBaseUrl ? `${imageBaseUrl}${url}` : url;
  }

  return imageBaseUrl ? `${imageBaseUrl}/${url}` : `/${url}`;
};
