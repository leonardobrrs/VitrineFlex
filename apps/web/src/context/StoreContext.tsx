import React, { createContext, useContext, useEffect, useState } from 'react';
import { StoreManifest } from '../types';
import { StoreTheme, resolveStoreTheme, applyStoreTheme } from '../services/theme';

interface StoreContextType {
  manifest: StoreManifest | null;
  loading: boolean;
  error: string | null;
  theme: StoreTheme;
  setTheme: (t: StoreTheme) => void;
  hasFeature: (featureName: string) => boolean;
  loadStoreBySlug: (slug: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType>({
  manifest: null,
  loading: true,
  error: null,
  theme: 'neutral',
  setTheme: () => {},
  hasFeature: () => false,
  loadStoreBySlug: async () => {},
});

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [manifest, setManifest] = useState<StoreManifest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setThemeState] = useState<StoreTheme>('neutral');

  const setTheme = (newTheme: StoreTheme) => {
    setThemeState(newTheme);
    applyStoreTheme(newTheme);
  };

  const canonicalSlug = (raw: string): string => {
    const map: Record<string, string> = {
      moda: 'vitrine-moda',
      fashion: 'vitrine-moda',
      tech: 'vitrine-tech',
      livros: 'vitrine-books',
      books: 'vitrine-books',
    };
    return map[raw.toLowerCase()] || raw;
  };

  const loadStoreBySlug = async (slug: string) => {
    const resolvedSlug = canonicalSlug(slug);
    const resolvedTheme = resolveStoreTheme(resolvedSlug);
    setTheme(resolvedTheme);

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/lps/stores/${resolvedSlug}/manifest`);
      if (!res.ok) {
        throw new Error(`Manifesto da loja '${resolvedSlug}' não encontrado no LPS Config Service`);
      }
      const data = await res.json();
      const storeObj = {
        id: data.store_id,
        name: data.store_name,
        slug: data.store_slug,
        segment: data.segment,
      };
      setManifest({
        ...data,
        store: storeObj,
      });
      const segmentTheme = resolveStoreTheme(data.segment || resolvedSlug);
      setTheme(segmentTheme);
    } catch (err: any) {
      console.warn('Fallback para fixture mock local:', err.message);
      loadFixture();
    } finally {
      setLoading(false);
    }
  };

  const loadFixture = () => {
    fetch('/fixtures/vitrine-fixture-dev.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Falha ao carregar fixture (${res.status})`);
        return res.json();
      })
      .then((data: any) => {
        const adapted: StoreManifest = {
          schema_version: data.schema_version || '1.1.0',
          version: data.manifest_version || 1,
          created_at: data.created_at,
          store_id: data.store?.id || 'store-dev-01',
          store_slug: data.store?.slug || 'vitrine-moda-dev',
          store_name: data.store?.name || 'Vitrine Moda Dev',
          segment: data.store?.segment || 'FASHION',
          store: data.store || {
            id: 'store-dev-01',
            name: 'Vitrine Moda Dev',
            slug: 'vitrine-moda-dev',
            segment: 'FASHION',
          },
          features: data.features,
          payment_methods: data.payment_methods || ['PIX'],
          fulfillment_modes: data.fulfillment_modes || ['DELIVERY'],
          theme: data.theme,
        };
        setManifest(adapted);
        setTheme(resolveStoreTheme(adapted.segment));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadFixture();
  }, []);

  const hasFeature = (featureName: string): boolean => {
    if (!manifest?.features) return false;
    return manifest.features[featureName] === true;
  };

  return (
    <StoreContext.Provider value={{ manifest, loading, error, theme, setTheme, hasFeature, loadStoreBySlug }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);

