// ============================================================================
// PLAN NOTES MODAL - Pizarra: nota libre del usuario
// PREMIUM SAVAGE EDITION
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { PenLine, Save } from 'lucide-react-native';
import { Haptics } from '../../lib/haptics';
import { supabase } from '../../lib/supabase';

const ACCENT = '#EAB308';

interface PlanNotesModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PlanNotesModal: React.FC<PlanNotesModalProps> = ({ visible, onClose }) => {
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const contentRef = useRef('');
  const savedRef = useRef(true);

  const translateY = useSharedValue(0);

  const loadNote = useCallback(async () => {
    setLoading(true);
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

      const text = data?.content || '';
      contentRef.current = text;
      savedRef.current = true;
      setContent(text);
      setSaved(true);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      translateY.value = 0;
      loadNote();
    }
  }, [visible, loadNote, translateY]);

  const saveNote = useCallback(async () => {
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
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }, []);

  const handleClose = useCallback(async () => {
    if (!savedRef.current) await saveNote();
    onClose();
  }, [saveNote, onClose]);

  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.value = gestureState.dy;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          handleCloseRef.current();
        } else {
          translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
        }
      },
    })
  ).current;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleTextChange = (text: string) => {
    contentRef.current = text;
    savedRef.current = false;
    setContent(text);
    setSaved(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 bg-transparent justify-end">
          <Animated.View
            style={[
              animatedStyle,
              {
                backgroundColor: '#0a0a0a',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: '90%',
                flex: 1,
                borderTopWidth: 2,
                borderTopColor: `${ACCENT}80`,
                overflow: 'hidden',
              },
            ]}
          >
            {/* Línea de acento superior */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                backgroundColor: ACCENT,
                shadowColor: ACCENT,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 10,
                zIndex: 10,
              }}
            />

            {/* Header Draggable */}
            <View {...panResponder.panHandlers}>
              <View className="pt-4 pb-2 items-center">
                <View className="w-12 h-1.5 bg-zinc-600 rounded-full" />
              </View>

              <View className="flex-row items-center justify-between px-4 pb-3">
                <View className="flex-row items-center gap-2">
                  <PenLine size={18} color={ACCENT} />
                  <Text className="text-white font-bold text-lg">Pizarra</Text>
                  <Text className="text-zinc-500 text-[10px] font-mono ml-1">
                    {saving ? 'GUARDANDO...' : saved ? 'GUARDADO' : 'SIN GUARDAR'}
                  </Text>
                </View>

                {!saved && (
                  <Pressable
                    onPress={saveNote}
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
            </View>

            {loading ? (
              <View className="flex-1 items-center justify-center py-20">
                <ActivityIndicator size="small" color={ACCENT} />
              </View>
            ) : (
              <ScrollView
                className="px-5 pt-2"
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
              >
                <TextInput
                  value={content}
                  onChangeText={handleTextChange}
                  placeholder="Notas generales, recordatorios..."
                  placeholderTextColor="#52525B"
                  multiline
                  textAlignVertical="top"
                  className="flex-1 text-white text-base leading-6 pb-8 pr-2"
                  style={{
                    fontFamily: Platform.OS === 'ios' ? 'System' : 'monospace',
                    minHeight: 300,
                    padding: 16,
                  }}
                />
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default PlanNotesModal;
