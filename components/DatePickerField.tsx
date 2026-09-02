import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FONTS, RADIUS, SPACING } from '../constants/theme';
import type { ThemeColors } from '../constants/themes';
import {
  formatDateInput,
  getDaysInMonth,
  getMonthLeadingBlanks,
  isSameDay,
  maskDateInput,
  parseDateInput,
  toStartOfDay,
  TR_MONTHS,
  TR_WEEKDAYS,
} from '../lib/dateInput';

type Props = {
  value: string;
  onChange: (nextValue: string) => void;
  colors: ThemeColors;
  editable?: boolean;
  /** Bu tarihten sonrasi secilemez (varsayilan: bugun). null = sinir yok */
  maxDate?: Date | null;
  /** Bu tarihten oncesi secilemez */
  minDate?: Date | null;
};

export function DatePickerField({
  value,
  onChange,
  colors,
  editable = true,
  maxDate,
  minDate,
}: Props) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const parsedValue = parseDateInput(value);
  const today = toStartOfDay(new Date());
  const upperBound = maxDate === null ? null : toStartOfDay(maxDate ?? today);
  const lowerBound = minDate ? toStartOfDay(minDate) : null;

  const anchor = parsedValue ?? (upperBound && upperBound < today ? upperBound : today);
  const [viewYear, setViewYear] = useState(anchor.getFullYear());
  const [viewMonth, setViewMonth] = useState(anchor.getMonth());

  // Takvim her acildiginda secili tarihin ayina konumlan
  useEffect(() => {
    if (!calendarOpen) {
      return;
    }

    const target = parseDateInput(value) ?? anchor;
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarOpen]);

  const cells = useMemo(() => {
    const blanks = getMonthLeadingBlanks(viewYear, viewMonth);
    const dayCount = getDaysInMonth(viewYear, viewMonth);
    const list: (number | null)[] = [];

    for (let i = 0; i < blanks; i += 1) {
      list.push(null);
    }

    for (let day = 1; day <= dayCount; day += 1) {
      list.push(day);
    }

    while (list.length % 7 !== 0) {
      list.push(null);
    }

    return list;
  }, [viewYear, viewMonth]);

  function shiftMonth(delta: number) {
    const shifted = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(shifted.getFullYear());
    setViewMonth(shifted.getMonth());
  }

  function isDisabled(day: number) {
    const candidate = new Date(viewYear, viewMonth, day);

    if (upperBound && candidate > upperBound) {
      return true;
    }

    if (lowerBound && candidate < lowerBound) {
      return true;
    }

    return false;
  }

  function selectDay(day: number) {
    if (isDisabled(day)) {
      return;
    }

    onChange(formatDateInput(new Date(viewYear, viewMonth, day)));
    setCalendarOpen(false);
  }

  const invalid = value.length > 0 && !parsedValue;

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.ink,
              backgroundColor: colors.cream,
              borderColor: invalid ? colors.danger : colors.border,
            },
          ]}
          placeholder="GG.AA.YYYY"
          placeholderTextColor={colors.inkLight}
          value={value}
          onChangeText={(next) => onChange(maskDateInput(next))}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={10}
          editable={editable}
        />
        <TouchableOpacity
          style={[
            styles.calendarButton,
            { borderColor: colors.border, backgroundColor: colors.creamDark },
          ]}
          onPress={() => setCalendarOpen(true)}
          disabled={!editable}
          accessibilityRole="button"
          accessibilityLabel="Takvimden tarih sec"
        >
          <Text style={styles.calendarButtonIcon}>📅</Text>
          <Text style={[styles.calendarButtonText, { color: colors.inkLight }]}>
            Takvim
          </Text>
        </TouchableOpacity>
      </View>

      {invalid && (
        <Text style={[styles.errorText, { color: colors.danger }]}>
          Tarih GG.AA.YYYY olmalı. Takvim düğmesinden de seçebilirsin.
        </Text>
      )}

      <Modal
        visible={calendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setCalendarOpen(false)}>
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: colors.warmWhite, borderColor: colors.border },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <TouchableOpacity
                style={[styles.navButton, { borderColor: colors.border }]}
                onPress={() => shiftMonth(-12)}
                accessibilityRole="button"
                accessibilityLabel="Önceki yıl"
              >
                <Text style={[styles.navText, { color: colors.inkLight }]}>‹‹</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navButton, { borderColor: colors.border }]}
                onPress={() => shiftMonth(-1)}
                accessibilityRole="button"
                accessibilityLabel="Önceki ay"
              >
                <Text style={[styles.navText, { color: colors.inkLight }]}>‹</Text>
              </TouchableOpacity>

              <Text style={[styles.monthLabel, { color: colors.ink }]}>
                {TR_MONTHS[viewMonth]} {viewYear}
              </Text>

              <TouchableOpacity
                style={[styles.navButton, { borderColor: colors.border }]}
                onPress={() => shiftMonth(1)}
                accessibilityRole="button"
                accessibilityLabel="Sonraki ay"
              >
                <Text style={[styles.navText, { color: colors.inkLight }]}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navButton, { borderColor: colors.border }]}
                onPress={() => shiftMonth(12)}
                accessibilityRole="button"
                accessibilityLabel="Sonraki yıl"
              >
                <Text style={[styles.navText, { color: colors.inkLight }]}>››</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {TR_WEEKDAYS.map((weekday) => (
                <Text
                  key={weekday}
                  style={[styles.weekday, { color: colors.inkLight }]}
                >
                  {weekday}
                </Text>
              ))}
            </View>

            <ScrollView style={styles.grid} contentContainerStyle={styles.gridContent}>
              <View style={styles.gridRows}>
                {cells.map((day, index) => {
                  if (day === null) {
                    return <View key={`blank-${index}`} style={styles.dayCell} />;
                  }

                  const cellDate = new Date(viewYear, viewMonth, day);
                  const disabled = isDisabled(day);
                  const selected = parsedValue ? isSameDay(cellDate, parsedValue) : false;
                  const isToday = isSameDay(cellDate, today);

                  return (
                    <TouchableOpacity
                      key={`day-${day}`}
                      style={[
                        styles.dayCell,
                        styles.dayCellRound,
                        isToday && { borderWidth: 1, borderColor: colors.gold },
                        selected && { backgroundColor: colors.gold },
                      ]}
                      onPress={() => selectDay(day)}
                      disabled={disabled}
                      accessibilityRole="button"
                      accessibilityLabel={`${day} ${TR_MONTHS[viewMonth]} ${viewYear}`}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          { color: colors.ink },
                          disabled && { color: colors.border },
                          selected && { color: colors.warmWhite },
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={[styles.footerButton, { borderColor: colors.border }]}
                onPress={() => {
                  onChange(formatDateInput(today));
                  setCalendarOpen(false);
                }}
              >
                <Text style={[styles.footerButtonText, { color: colors.inkLight }]}>
                  Bugün
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerButton, { borderColor: colors.border }]}
                onPress={() => setCalendarOpen(false)}
              >
                <Text style={[styles.footerButtonText, { color: colors.inkLight }]}>
                  Kapat
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: SPACING.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.uiMedium,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  calendarButtonIcon: {
    fontSize: 15,
  },
  calendarButtonText: {
    fontSize: 13,
    fontFamily: FONTS.uiMedium,
  },
  errorText: {
    fontSize: 12,
    fontFamily: FONTS.body,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(44, 36, 22, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  navButton: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minWidth: 34,
    alignItems: 'center',
  },
  navText: {
    fontSize: 16,
    fontFamily: FONTS.uiMedium,
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontFamily: FONTS.uiBold,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    flexBasis: '14.2857%',
    textAlign: 'center',
    fontSize: 12,
    fontFamily: FONTS.uiMedium,
    paddingVertical: SPACING.xs,
  },
  grid: {
    maxHeight: 300,
  },
  gridContent: {
    paddingBottom: SPACING.xs,
  },
  gridRows: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    flexBasis: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellRound: {
    borderRadius: 999,
  },
  dayText: {
    fontSize: 15,
    fontFamily: FONTS.uiMedium,
  },
  sheetFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  footerButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  footerButtonText: {
    fontSize: 13,
    fontFamily: FONTS.uiMedium,
  },
});
