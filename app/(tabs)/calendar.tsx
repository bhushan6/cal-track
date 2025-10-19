import { View, Text, StyleSheet } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

export default function CalendarScreen() {
  const [selectedDayData, setSelectedDayData] = useState<{
    date: string;
    totalCalories: number;
  } | null>(null);
  const [historicalData, setHistoricalData] = useState<{
    [date: string]: { totalCalories: number };
  }>({});

  useFocusEffect(
    useCallback(() => {
      const loadHistoricalData = async () => {
        try {
          const storedHistoricalData = await AsyncStorage.getItem(
            "historicalData",
          );
          if (storedHistoricalData) {
            setHistoricalData(JSON.parse(storedHistoricalData));
          }
        } catch (error) {
          console.error("Failed to load historical data from storage", error);
        }
      };
      loadHistoricalData();
    }, []),
  );

  const markedDates: Record<string, { marked: boolean; dotColor: string }> = {};
  for (const date in historicalData) {
    markedDates[date] = { marked: true, dotColor: "#00adf5" };
  }

  const onDayPress = (day: DateData) => {
    const data = historicalData[day.dateString];
    if (data) {
      setSelectedDayData({ date: day.dateString, ...data });
    } else {
      setSelectedDayData(null);
    }
  };

  return (
    <View style={styles.container}>
      <Calendar
        markedDates={markedDates}
        onDayPress={onDayPress}
        theme={{
          calendarBackground: "#ffffff",
          textSectionTitleColor: "#2d414e",
          selectedDayBackgroundColor: "#00adf5",
          selectedDayTextColor: "#ffffff",
          todayTextColor: "#00adf5",
          dayTextColor: "#2d414e",
          textDisabledColor: "#d9e1e8",
          dotColor: "#00adf5",
          selectedDotColor: "#ffffff",
          arrowColor: "orange",
          monthTextColor: "blue",
          indicatorColor: "blue",
          textDayFontWeight: "300",
          textMonthFontWeight: "bold",
          textDayHeaderFontWeight: "300",
          textDayFontSize: 16,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 16,
        }}
      />
      {selectedDayData && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsText}>
            Total calories for {selectedDayData.date}:
          </Text>
          <Text style={styles.detailsCalories}>
            {selectedDayData.totalCalories} kcal
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  detailsContainer: {
    padding: 20,
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    alignItems: "center",
  },
  detailsText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  detailsCalories: {
    fontSize: 24,
    color: "#00796b",
  },
});