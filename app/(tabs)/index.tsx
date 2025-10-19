import {
  Text,
  View,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

interface Ingredient {
  name: string;
  calories: number;
}

interface FoodItem {
  id: string;
  name: string;
  calories?: number;
  ingredients?: Ingredient[];
  sources?: string[];
  loading?: boolean;
  error?: string;
}

const calorieGoal = 2000;

export default function Index() {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [foodName, setFoodName] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const navigation = useNavigation();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["25%", "50%"], []);

  useFocusEffect(
    useCallback(() => {
      const loadFoodItems = async () => {
        try {
          const storedFoodItems = await AsyncStorage.getItem("foodItems");
          if (storedFoodItems) {
            setFoodItems(JSON.parse(storedFoodItems));
          }
        } catch (error) {
          console.error("Failed to load food items from storage", error);
        }
      };
      loadFoodItems();
    }, []),
  );

  useEffect(() => {
    const saveFoodItems = async () => {
      try {
        await AsyncStorage.setItem("foodItems", JSON.stringify(foodItems));
      } catch (error) {
        console.error("Failed to save food items to storage", error);
      }
    };
    saveFoodItems();
  }, [foodItems]);

  useEffect(() => {
    const saveTotalCalories = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const totalCalories = foodItems.reduce(
          (sum, item) => sum + (item.calories || 0),
          0,
        );
        const storedHistoricalData =
          await AsyncStorage.getItem("historicalData");
        const historicalData = storedHistoricalData
          ? JSON.parse(storedHistoricalData)
          : {};
        historicalData[today] = { totalCalories };
        await AsyncStorage.setItem(
          "historicalData",
          JSON.stringify(historicalData),
        );
      } catch (error) {
        console.error("Failed to save total calories to storage", error);
      }
    };

    saveTotalCalories();
  }, [foodItems]);

  const handleClearAll = async () => {
    try {
      await AsyncStorage.removeItem("foodItems");
      const today = new Date().toISOString().split("T")[0];
      const storedHistoricalData = await AsyncStorage.getItem("historicalData");
      const historicalData = storedHistoricalData
        ? JSON.parse(storedHistoricalData)
        : {};
      historicalData[today] = { totalCalories: 0 };
      await AsyncStorage.setItem(
        "historicalData",
        JSON.stringify(historicalData),
      );
      setFoodItems([]);
    } catch (error) {
      console.error("Failed to clear all data", error);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleClearAll} style={{ marginRight: 10 }}>
          <Text style={{ color: "#007bff", fontSize: 16 }}>Clear All</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handlePresentModalPress = useCallback((item: FoodItem) => {
    if (item.loading || item.error) return;
    setSelectedFood(item);
    bottomSheetModalRef.current?.present();
  }, []);

  const totalCalories = foodItems.reduce(
    (sum, item) => sum + (item.calories || 0),
    0,
  );

  const fetchFoodData = async (foodName: string, id: string) => {
    console.log(foodName);
    try {
      const response = await fetch(
        `https://cal-track-api.vercel.app/api/cal-track?food=${encodeURIComponent(
          foodName,
        )}`,
      );
      if (!response.ok) {
        throw new Error("Food not found");
      }
      const data = await response.json();

      console.log(data);

      setFoodItems((prevItems) =>
        prevItems.map((item) =>
          item.id === id
            ? {
                ...item,
                name: data.food,
                calories: data.calories,
                ingredients: data.ingredients,
                sources: data.sources,
                loading: false,
              }
            : item,
        ),
      );
    } catch (error) {
      setFoodItems((prevItems) =>
        prevItems.map((item) =>
          item.id === id
            ? { ...item, loading: false, error: error.message }
            : item,
        ),
      );
    }
  };

  const handleAddFood = () => {
    if (foodName.trim() === "") return;

    const newFood: FoodItem = {
      id: Math.random().toString(),
      name: foodName,
      loading: true,
    };

    setFoodItems((prevItems) => [...prevItems, newFood]);
    fetchFoodData(foodName, newFood.id);
    setFoodName("");
  };

  // const handleDeleteFood = (id: string) => {
  //   setFoodItems((prevItems) => prevItems.filter((item) => item.id !== id));
  // };

  const renderFoodItem = ({ item }: { item: FoodItem }) => {
    return (
      <TouchableOpacity onPress={() => handlePresentModalPress(item)}>
        <View style={styles.foodItem}>
          <Text style={styles.foodName}>{item.name}</Text>
          {item.loading ? (
            <ActivityIndicator />
          ) : item.error ? (
            <TouchableOpacity onPress={() => fetchFoodData(item.name, item.id)}>
              <Text style={{ color: "red" }}>Retry</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.foodCalories}>{item.calories} kcal</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.addFoodContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter food here"
          value={foodName}
          onChangeText={setFoodName}
        />

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleAddFood}
          style={styles.addButton}
        >
          <Ionicons size={28} name="add" color="white" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={foodItems}
        keyExtractor={(item) => item.id}
        renderItem={renderFoodItem}
        contentContainerStyle={styles.listContent}
      />
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>Total: {totalCalories} kcal</Text>
        <Text style={styles.summaryText}>Goal: {calorieGoal} kcal</Text>
      </View>
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={1}
        snapPoints={snapPoints}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          {selectedFood && (
            <>
              <Text style={styles.sheetTitle}>{selectedFood.name}</Text>
              <Text style={styles.sheetCalories}>
                Total Calories: {selectedFood.calories} kcal
              </Text>
              <Text style={styles.sheetSectionTitle}>
                Calorie Breakdown by Ingredient:
              </Text>
              {selectedFood.ingredients?.map((ingredient, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <Text>{ingredient.name}</Text>
                  <Text>{ingredient.calories} kcal</Text>
                </View>
              ))}
              <Text style={styles.sheetSectionTitle}>Sources:</Text>
              {selectedFood.sources?.map((source, index) => (
                <Text key={index} style={styles.sourceItem}>
                  {source}
                </Text>
              ))}
            </>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  addFoodContainer: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: "#007bff",
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
  },
  foodItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    marginVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  foodName: {
    fontSize: 16,
    flexBasis: 1,
    flex: 1,
    flexShrink: 1,
  },
  foodCalories: {
    fontSize: 16,
    color: "#888",
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 24,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  summaryText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  bottomSheetContent: {
    padding: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  sheetCalories: {
    fontSize: 18,
    marginBottom: 20,
    color: "#333",
  },
  sheetSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  ingredientItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  sourceItem: {
    paddingVertical: 2,
    color: "#007bff",
  },
});
