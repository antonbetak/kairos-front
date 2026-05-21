import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { themeList, KairosTheme } from '../styles/themes';
import { typography, spacing, radii } from '../styles/theme';

// ─── Swatch row ───────────────────────────────────────────────────────────────

function ThemeCard({
  item,
  isActive,
  onSelect,
}: {
  item: KairosTheme;
  isActive: boolean;
  onSelect: () => void;
}) {
  // Pick 5 representative colors from each theme for the swatch
  const swatchColors = [
    item.bg,
    item.surface,
    item.primary,
    item.secondary,
    item.textPrimary,
  ];

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: item.surface, borderColor: item.border },
        isActive && { borderColor: item.primary, borderWidth: 2 },
      ]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      {/* Swatch row */}
      <View style={styles.swatchRow}>
        {swatchColors.map((color, i) => (
          <View
            key={i}
            style={[styles.swatch, { backgroundColor: color }]}
          />
        ))}
      </View>

      {/* Name + check */}
      <View style={styles.cardBottom}>
        <Text style={[styles.cardName, { color: item.textPrimary }]}>
          {item.name}
        </Text>
        {isActive && (
          <View style={[styles.checkBadge, { backgroundColor: item.primary }]}>
            <Text style={[styles.checkText, { color: item.textInverse }]}>✓</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  /** If true renders just the trigger button (for embedding in screens) */
  compact?: boolean;
}

export default function ThemePicker({ compact = false }: Props) {
  const { theme, themeId, setTheme } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <>
      {/* Trigger button */}
      <TouchableOpacity
        style={[
          styles.trigger,
          compact ? styles.triggerCompact : styles.triggerFull,
          { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
        ]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        {/* Mini swatch preview */}
        <View style={styles.triggerSwatches}>
          {[theme.bg, theme.primary, theme.secondary].map((c, i) => (
            <View key={i} style={[styles.triggerSwatch, { backgroundColor: c }]} />
          ))}
        </View>
        <Text style={[styles.triggerText, { color: theme.textSecondary }]}>
          {compact ? theme.name : `Tema: ${theme.name}`}
        </Text>
        <Text style={[styles.triggerArrow, { color: theme.textTertiary }]}>›</Text>
      </TouchableOpacity>

      {/* Bottom sheet modal */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />

        <View style={[styles.sheet, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          <Text style={[styles.sheetTitle, { color: theme.textPrimary }]}>
            Elige tu tema
          </Text>
          <Text style={[styles.sheetSubtitle, { color: theme.textSecondary }]}>
            Personaliza la apariencia de Kairos
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.grid}
          >
            {themeList.map(item => (
              <ThemeCard
                key={item.id}
                item={item}
                isActive={themeId === item.id}
                onSelect={() => {
                  setTheme(item.id);
                  setVisible(false);
                }}
              />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Trigger
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  triggerFull: {
    alignSelf: 'center',
  },
  triggerCompact: {
    alignSelf: 'flex-start',
  },
  triggerSwatches: {
    flexDirection: 'row',
    gap: 3,
  },
  triggerSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  triggerText: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    flex: 1,
  },
  triggerArrow: {
    fontSize: typography.md,
    lineHeight: typography.md,
  },

  // Modal backdrop
  backdrop: {
    flex: 1,
    backgroundColor: '#00000055',
  },

  // Bottom sheet
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxxl,
    maxHeight: '75%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.full,
    alignSelf: 'center',
    marginBottom: spacing.base,
  },
  sheetTitle: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    marginBottom: spacing.xs,
  },
  sheetSubtitle: {
    fontSize: typography.sm,
    marginBottom: spacing.xl,
  },

  // Grid
  grid: {
    gap: spacing.sm,
    paddingBottom: spacing.base,
  },

  // Theme card
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  swatch: {
    flex: 1,
    height: 32,
    borderRadius: radii.sm,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardName: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
  },
});