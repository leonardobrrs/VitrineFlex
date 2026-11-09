import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Cart } from '../types';
import { useAuth } from './AuthContext';
import { useStore } from './StoreContext';

interface CartContextType {
  cart: Cart | null;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addItem: (
    productId: string,
    variantId?: string,
    quantity?: number,
    itemMeta?: { title?: string; price?: number; image_url?: string }
  ) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  fetchCart: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const CartContext = createContext<CartContextType>({
  cart: null,
  isCartOpen: false,
  setIsCartOpen: () => {},
  addItem: async () => {},
  updateQuantity: async () => {},
  removeItem: async () => {},
  clearCart: async () => {},
  fetchCart: async () => {},
  loading: false,
  error: null,
});

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const { manifest } = useStore();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storeId = manifest?.store_id || manifest?.store_slug || 'vitrine-tech';

  const fetchCart = useCallback(async () => {
    if (!token) {
      // Local storage cart for guest
      const localCart = localStorage.getItem(`cart_${storeId}`);
      if (localCart) {
        try {
          setCart(JSON.parse(localCart));
        } catch {
          setCart(null);
        }
      } else {
        setCart({ id: 'guest-cart', store_id: storeId, user_id: 'guest', items: [], total_items: 0, subtotal: 0 });
      }
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/cart?store_id=${storeId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (err: any) {
      console.warn('Erro ao carregar carrinho da API, usando local fallback:', err.message);
    } finally {
      setLoading(false);
    }
  }, [storeId, token]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addItem = async (
    productId: string,
    variantId?: string,
    quantity: number = 1,
    itemMeta?: { title?: string; price?: number; image_url?: string }
  ) => {
    setError(null);

    if (token) {
      try {
        const res = await fetch('http://localhost:8000/api/v1/cart/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            store_id: storeId,
            product_id: productId,
            variant_id: variantId || null,
            quantity,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData?.error?.message || 'Falha ao adicionar item ao carrinho');
        }

        const updatedCart = await res.json();
        setCart(updatedCart);
        setIsCartOpen(true);
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    } else {
      // Guest local cart simulation com dados reais do produto
      setCart((prev) => {
        const currentItems = prev ? [...prev.items] : [];
        const existingIdx = currentItems.findIndex(
          (i) => i.product_id === productId && i.variant_id === (variantId || undefined)
        );

        const unitPrice = itemMeta?.price ?? 99.9;
        const title = itemMeta?.title || `Produto ${productId.slice(0, 8)}`;
        const imageUrl = itemMeta?.image_url;

        if (existingIdx >= 0) {
          currentItems[existingIdx].quantity += quantity;
          currentItems[existingIdx].subtotal =
            currentItems[existingIdx].unit_price * currentItems[existingIdx].quantity;
        } else {
          currentItems.push({
            id: `item-${Date.now()}`,
            product_id: productId,
            variant_id: variantId,
            title,
            unit_price: unitPrice,
            quantity,
            subtotal: unitPrice * quantity,
            image_url: imageUrl,
          });
        }

        const total_items = currentItems.reduce((acc, it) => acc + it.quantity, 0);
        const subtotal = currentItems.reduce((acc, it) => acc + it.subtotal, 0);

        const newCart: Cart = {
          id: prev?.id || 'guest-cart',
          store_id: storeId,
          user_id: user?.id || 'guest',
          items: currentItems,
          total_items,
          subtotal,
        };

        localStorage.setItem(`cart_${storeId}`, JSON.stringify(newCart));
        return newCart;
      });
      setIsCartOpen(true);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      return removeItem(itemId);
    }

    if (token) {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/cart/items/${itemId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ quantity }),
        });
        if (res.ok) {
          const data = await res.json();
          setCart(data);
        }
      } catch (err: any) {
        setError(err.message);
      }
    } else {
      setCart((prev) => {
        if (!prev) return null;
        const items = prev.items.map((it) =>
          it.id === itemId
            ? { ...it, quantity, subtotal: round(it.unit_price * quantity) }
            : it
        );
        const total_items = items.reduce((acc, it) => acc + it.quantity, 0);
        const subtotal = items.reduce((acc, it) => acc + it.subtotal, 0);
        const newCart = { ...prev, items, total_items, subtotal };
        localStorage.setItem(`cart_${storeId}`, JSON.stringify(newCart));
        return newCart;
      });
    }
  };

  const removeItem = async (itemId: string) => {
    if (token) {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/cart/items/${itemId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setCart(data);
        }
      } catch (err: any) {
        setError(err.message);
      }
    } else {
      setCart((prev) => {
        if (!prev) return null;
        const items = prev.items.filter((it) => it.id !== itemId);
        const total_items = items.reduce((acc, it) => acc + it.quantity, 0);
        const subtotal = items.reduce((acc, it) => acc + it.subtotal, 0);
        const newCart = { ...prev, items, total_items, subtotal };
        localStorage.setItem(`cart_${storeId}`, JSON.stringify(newCart));
        return newCart;
      });
    }
  };

  const clearCart = async () => {
    if (token) {
      try {
        await fetch(`http://localhost:8000/api/v1/cart?store_id=${storeId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err: any) {
        console.warn('Erro ao esvaziar carrinho:', err.message);
      }
    }
    const emptyCart: Cart = {
      id: cart?.id || 'empty-cart',
      store_id: storeId,
      user_id: user?.id || 'guest',
      items: [],
      total_items: 0,
      subtotal: 0,
    };
    setCart(emptyCart);
    localStorage.removeItem(`cart_${storeId}`);
  };

  const round = (val: number) => Math.round(val * 100) / 100;

  return (
    <CartContext.Provider
      value={{
        cart,
        isCartOpen,
        setIsCartOpen,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        fetchCart,
        loading,
        error,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
