import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface Holiday {
  name: string;
  type: "national" | "religious" | "international";
}

const HOLIDAYS: Record<string, Holiday[]> = {
  "1-26": [{ name: "Republic Day", type: "national" }],
  "3-8":  [{ name: "International Women's Day", type: "international" }],
  "3-14": [{ name: "Holi", type: "religious" }],
  "3-31": [{ name: "Eid al-Fitr", type: "religious" }],
  "4-14": [{ name: "Dr. Ambedkar Jayanti", type: "national" }],
  "4-18": [{ name: "Good Friday", type: "religious" }],
  "5-1":  [{ name: "Labour Day", type: "national" }],
  "6-21": [{ name: "International Yoga Day", type: "international" }],
  "7-6":  [{ name: "Eid al-Adha", type: "religious" }],
  "8-15": [{ name: "Independence Day", type: "national" }],
  "8-16": [{ name: "Janmashtami", type: "religious" }],
  "10-2": [{ name: "Gandhi Jayanti", type: "national" }],
  "10-2b":[{ name: "Dussehra", type: "religious" }],
  "10-20":[{ name: "Diwali", type: "religious" }],
  "11-1": [{ name: "Diwali (Laxmi Puja)", type: "religious" }],
  "11-5": [{ name: "Guru Nanak Jayanti", type: "religious" }],
  "12-25":[{ name: "Christmas Day", type: "religious" }],
};

function getHolidays(day: number, month: number): Holiday[] {
  const key = `${month + 1}-${day}`;
  return HOLIDAYS[key] || [];
}

const TYPE_COLOR = {
  national: "#EA580C",
  religious: "#7C3AED",
  international: "#0D9488",
};

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<Date>(today);
  const s = styles(colors, insets);

  function prevMonth() {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11); }
    else setCurrentMonth(m => m - 1);
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0); }
    else setCurrentMonth(m => m + 1);
  }

  const { days, firstDayOffset } = useMemo(() => {
    const d = new Date(currentYear, currentMonth + 1, 0).getDate();
    const offset = new Date(currentYear, currentMonth, 1).getDay();
    return { days: d, firstDayOffset: offset };
  }, [currentYear, currentMonth]);

  const cells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  const isToday = (d: number) =>
    d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  const isSelected = (d: number) =>
    d === selected.getDate() && currentMonth === selected.getMonth() && currentYear === selected.getFullYear();

  const selectedHolidays = getHolidays(selected.getDate(), selected.getMonth());
  const selectedIsToday = isToday(selected.getDate()) && selected.getMonth() === currentMonth && selected.getFullYear() === currentYear;

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Nav */}
        <View style={s.nav}>
          <Pressable onPress={prevMonth} style={s.navBtn} hitSlop={8}>
            <Feather name="chevron-left" size={22} color={colors.foreground} />
          </Pressable>
          <View style={s.navCenter}>
            <Text style={s.navMonth}>{MONTHS[currentMonth]}</Text>
            <View style={s.yearRow}>
              <Pressable onPress={() => setCurrentYear(y => y - 1)} hitSlop={8}>
                <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
              </Pressable>
              <Text style={s.navYear}>{currentYear}</Text>
              <Pressable onPress={() => setCurrentYear(y => y + 1)} hitSlop={8}>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>
          <Pressable onPress={nextMonth} style={s.navBtn} hitSlop={8}>
            <Feather name="chevron-right" size={22} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Day headers */}
        <View style={s.dayHeaders}>
          {DAYS.map((d) => (
            <Text key={d} style={[s.dayHeader, (d === "Su" || d === "Sa") && { color: colors.mutedForeground }]}>{d}</Text>
          ))}
        </View>

        {/* Grid */}
        <View style={s.grid}>
          {cells.map((day, idx) => {
            if (!day) return <View key={`empty-${idx}`} style={s.cell} />;
            const holidays = getHolidays(day, currentMonth);
            const weekend = (firstDayOffset + day - 1) % 7 === 0 || (firstDayOffset + day - 1) % 7 === 6;
            return (
              <Pressable
                key={day}
                style={[
                  s.cell,
                  weekend && { backgroundColor: colors.muted + "80" },
                  isSelected(day) && { backgroundColor: colors.primary },
                  isToday(day) && !isSelected(day) && { borderWidth: 1.5, borderColor: colors.primary },
                ]}
                onPress={async () => {
                  setSelected(new Date(currentYear, currentMonth, day));
                  await Haptics.selectionAsync();
                }}
              >
                <Text style={[
                  s.dayNum,
                  weekend && { color: colors.mutedForeground },
                  isSelected(day) && { color: "#fff", fontFamily: "Inter_700Bold" },
                ]}>
                  {day}
                </Text>
                <View style={s.dots}>
                  {holidays.slice(0, 3).map((h, i) => (
                    <View
                      key={i}
                      style={[s.dot, { backgroundColor: isSelected(day) ? "#fff" : TYPE_COLOR[h.type] }]}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Legend */}
        <View style={s.legend}>
          {(["national", "religious", "international"] as const).map((t) => (
            <View key={t} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: TYPE_COLOR[t] }]} />
              <Text style={s.legendText}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
            </View>
          ))}
        </View>

        {/* Selected day info */}
        <View style={s.selectedInfo}>
          <Text style={s.selectedTitle}>
            {selected.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            {selectedIsToday && <Text style={{ color: colors.primary }}> · Today</Text>}
          </Text>
          {selectedHolidays.length > 0 ? (
            selectedHolidays.map((h, i) => (
              <View key={i} style={[s.holidayChip, { backgroundColor: TYPE_COLOR[h.type] + "18" }]}>
                <View style={[s.holidayDot, { backgroundColor: TYPE_COLOR[h.type] }]} />
                <Text style={[s.holidayName, { color: TYPE_COLOR[h.type] }]}>{h.name}</Text>
              </View>
            ))
          ) : (
            <Text style={s.noHoliday}>No holidays on this day</Text>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function styles(c: ReturnType<typeof useColors>, insets: { top: number }) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: {
      paddingTop: isWeb ? insets.top + 67 : 8,
      paddingHorizontal: 12,
    },
    nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingHorizontal: 4 },
    navBtn: { padding: 8, borderRadius: 10, backgroundColor: c.muted },
    navCenter: { alignItems: "center" },
    navMonth: { fontSize: 20, fontFamily: "Inter_700Bold", color: c.foreground },
    yearRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
    navYear: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.mutedForeground, minWidth: 36, textAlign: "center" },
    dayHeaders: { flexDirection: "row", marginBottom: 4 },
    dayHeader: { flex: 1, textAlign: "center", fontSize: 12, fontFamily: "Inter_600SemiBold", color: c.foreground, paddingVertical: 4 },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    cell: { width: `${100 / 7}%` as any, aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 8, padding: 2 },
    dayNum: { fontSize: 14, fontFamily: "Inter_500Medium", color: c.foreground },
    dots: { flexDirection: "row", gap: 2, marginTop: 2 },
    dot: { width: 4, height: 4, borderRadius: 2 },
    legend: { flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 16, marginBottom: 12 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, color: c.mutedForeground, fontFamily: "Inter_400Regular" },
    selectedInfo: { backgroundColor: c.card, borderRadius: c.radius + 4, padding: 16, borderWidth: 1, borderColor: c.border, marginTop: 4 },
    selectedTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.foreground, marginBottom: 10 },
    holidayChip: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 8, marginBottom: 6 },
    holidayDot: { width: 8, height: 8, borderRadius: 4 },
    holidayName: { fontSize: 14, fontFamily: "Inter_500Medium" },
    noHoliday: { color: c.mutedForeground, fontSize: 13, fontFamily: "Inter_400Regular" },
  });
}
