// ============================================================================
// SHOP PREVIEW CARD — Tarjeta de la tienda con vista previa de productos.
// Al presionarla abre el modal de tienda (ShopModal, montado en HankOverlay).
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { ShoppingBag, ChevronRight } from 'lucide-react-native';
import * as Haptics from '../../lib/haptics';
import { hankToolsEvent } from '../../lib/hankToolsEvent';
import shop, { ShopProduct } from '../../services/shop';

const PREVIEW_COUNT = 3;

export default function ShopPreviewCard() {
  const [products, setProducts] = useState<ShopProduct[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await shop.listProducts({ limit: 12 });
        if (!mounted) return;
        const active = list.filter((p) => p.is_active);
        // Destacados primero
        active.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
        setProducts(active.slice(0, PREVIEW_COUNT));
      } catch {
        // Sin vista previa: la tarjeta sigue abriendo la tienda
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        hankToolsEvent.open('shop');
      }}
      className="rounded-2xl overflow-hidden mb-6"
      style={{
        backgroundColor: 'rgba(15, 8, 8, 0.92)',
        borderWidth: 1.5,
        borderColor: 'rgba(220, 38, 38, 0.4)',
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 6,
      }}
    >
      <View
        className="flex-row items-center justify-between px-4 py-3 border-b"
        style={{ borderBottomColor: '#27272a' }}
      >
        <View className="flex-row items-center gap-2.5">
          <View
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(220, 38, 38, 0.2)' }}
          >
            <ShoppingBag size={14} color="#DC2626" />
          </View>
          <View>
            <Text className="text-white text-xs font-black uppercase tracking-widest">
              Tienda TRENS
            </Text>
            <Text className="text-zinc-500 text-[10px] font-mono">Suplementos y más</Text>
          </View>
        </View>
        <ChevronRight size={16} color="#DC2626" />
      </View>

      <View className="p-4">
        {products.length > 0 ? (
          <View className="flex-row gap-2">
            {products.map((p) => (
              <View key={p.id} className="flex-1">
                <View
                  className="w-full rounded-xl overflow-hidden items-center justify-center"
                  style={{ aspectRatio: 1, backgroundColor: '#0a0505' }}
                >
                  {p.thumbnail_url ? (
                    <Image
                      source={{ uri: p.thumbnail_url }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : (
                    <ShoppingBag size={28} color="#3f3f46" />
                  )}
                </View>
                <Text className="text-white text-[10px] font-bold mt-1.5" numberOfLines={1}>
                  {p.name}
                </Text>
                <Text className="text-red-500 text-[11px] font-mono font-bold">
                  S/ {Number(p.price).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View className="items-center py-4">
            <ShoppingBag size={28} color="#3f3f46" />
            <Text className="text-zinc-500 text-xs font-mono mt-2">Explora el catálogo</Text>
          </View>
        )}

        <View
          className="mt-4 py-3 rounded-xl items-center"
          style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)' }}
        >
          <Text className="text-red-500 text-xs font-black uppercase tracking-widest">
            Abrir tienda
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
