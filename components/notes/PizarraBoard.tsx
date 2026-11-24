// ============================================================================
// PIZARRA BOARD — Pizarra dentro del módulo NOTAS (misma nota que el modal Pizarra)
// Se guarda en plan_notes (note_type = 'pizarra'); autoguarda al salir.
// ============================================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Platform } from 'react-native';
import { Save } from 'lucide-react-native';
import * as Haptics from '../../lib/haptics';
import { supabase } from '../../lib/supabase';

const ACCENT = '#EAB308';

export function PizarraBoard() {
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const contentRef = useRef('');
  const savedRef = useRef(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('plan_notes')
          .select('content')
          .eq('user_id', user.id)
          .eq('note_type', 'pizarra')
          .maybeSingle();
        if (!active) return;
        const text = data?.content || '';
        contentRef.current = text;
        savedRef.current = true;
        setContent(text);
        setSaved(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('plan_notes').upsert(
        {
          user_id: user.id,
          note_type: 'pizarra',
          content: contentRef.current,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,note_type' }
      );
      savedRef.current = true;
      setSaved(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } finally {
      setSaving(false);
    }
  }, []);

  // Autoguardado al salir de la pizarra (cambio de pestaña o de módulo)
  useEffect(() => {
    return () => {
      if (!savedRef.current) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (!user) return;
          supabase
            .from('plan_notes')
            .upsert(
              {
                user_id: user.id,
                note_type: 'pizarra',
                content: contentRef.current,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,note_type' }
            )
            .then(() => {});
        });
      }
    };
  }, []);

  if (loading) {
    return (
      <View className="items-center justify-center py-20">
        <ActivityIndicator size="small" color={ACCENT} />
      </View>
    );
  }

  return (
    <View>
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-zinc-500 text-[10px] font-mono">
          {saving ? 'GUARDANDO...' : saved ? 'GUARDADO' : 'SIN GUARDAR'}
        </Text>
        {!saved && (
          <Pressable
            onPress={save}
            className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl active:scale-95"
            style={{
              backgroundColor: `${ACCENT}25`,
              borderWidth: 1,
              borderColor: `${ACCENT}60`,
            }}
          >
            <Save size={14} color={ACCENT} />
            <Text style={{ color: ACCENT }} className="text-xs font-bold">
              GUARDAR
            </Text>
          </Pressable>
        )}
      </View>

      <TextInput
        value={content}
        onChangeText={(text) => {
          contentRef.current = text;
          savedRef.current = false;
          setContent(text);
          setSaved(false);
        }}
        onBlur={() => {
          if (!savedRef.current) save();
        }}
        placeholder="Notas generales, recordatorios..."
        placeholderTextColor="#52525B"
        multiline
        textAlignVertical="top"
        className="text-white text-base leading-6 rounded-2xl"
        style={{
          fontFamily: Platform.OS === 'ios' ? 'System' : 'monospace',
          minHeight: 420,
          padding: 16,
          backgroundColor: 'rgba(234, 179, 8, 0.05)',
          borderWidth: 1,
          borderColor: 'rgba(234, 179, 8, 0.3)',
        }}
      />
    </View>
  );
}

export default PizarraBoard;
