import React, { createContext, useContext, useEffect, useState } from 'react';
import { StoreManifest } from '../types';

interface StoreContextType {
  manifest: StoreManifest | null;
  loading: boolean;
  error: string | null;
  hasFeature: (featureName: string) => boolean;
  loadStoreBySlug: (slug: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType>({
  manifest: null,
  loading: true,
  error: null,
  hasFeature: () => false,
  loadStoreBySlug: async () => {},
});

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [manifest, setManifest] = useState<StoreManifest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const applyThemeColors = (primary?: string, secondary?: string, _fontFamily?: string) => {
    if (primary) {
      document.documentElement.style.setProperty('--primary-color', primary);
    }
    if (secondary) {
      document.documentElement.style.setProperty('--secondary-color', secondary);
    }
    // Identidade tipográfica única para toda a aplicação (ETAPA 1)
    const unifiedFont = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    document.documentElement.style.setProperty('--font-family', unifiedFont);
    document.body.style.fontFamily = unifiedFont;
  };

  const loadStoreBySlug = async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/lps/stores/${slug}/manifest`);
      if (!res.ok) {
        throw new Error(`Manifesto da loja '${slug}' não encontrado no LPS Config Service`);
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
      applyThemeColors(
        data.theme?.primary_color,
        data.theme?.secondary_color,
        data.theme?.font_family
      );
    } catch (err: any) {
      console.warn('Fallback para fixture mock local:', err.message);
      // Fallback to local dev fixture
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
        // Adapt fixture format to StoreManifest
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
        applyThemeColors(adapted.theme?.primary_color, adapted.theme?.secondary_color);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    // Attempt to load first store or fallback to fixture
    loadFixture();
  }, []);

  const hasFeature = (featureName: string): boolean => {
    if (!manifest?.features) return false;
    return manifest.features[featureName] === true;
  };

  return (
    <StoreContext.Provider value={{ manifest, loading, error, hasFeature, loadStoreBySlug }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
