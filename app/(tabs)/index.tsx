import {
  Text,
  View,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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

export default function Index() {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [foodName, setFoodName] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const navigation = useNavigation();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["25%", "50%"], []);

  const [recipes, setRecipes] = useState<Record<string, FoodItem>>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const loadRecipesFromStorage = useCallback(() => {
    const loadRecipes = async () => {
      try {
        const stored = await AsyncStorage.getItem("recipes");
        if (stored) setRecipes(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to load recipes", error);
      }
    };
    loadRecipes();
  }, []);

  useFocusEffect(loadRecipesFromStorage);

  // Load calorie goal from settings
  useFocusEffect(
    useCallback(() => {
      const loadSettings = async () => {
        try {
          const goal = await AsyncStorage.getItem("calorieGoal");
          if (goal) {
            setCalorieGoal(parseInt(goal));
          }
        } catch (error) {
          console.error("Failed to load calorie goal", error);
        }
      };
      loadSettings();
    }, []),
  );

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
      // Get API keys from storage
      const [geminiKey, sciraKey, useCustom] = await Promise.all([
        AsyncStorage.getItem("geminiApiKey"),
        AsyncStorage.getItem("sciraApiKey"),
        AsyncStorage.getItem("useCustomKeys"),
      ]);

      const useCustomKeys = useCustom ? JSON.parse(useCustom) : false;

      // Build URL with optional API keys
      let url = `https://cal-track-api.vercel.app/api/cal-track?food=${encodeURIComponent(foodName)}`;

      if (useCustomKeys && geminiKey && sciraKey) {
        url += `&geminiKey=${encodeURIComponent(geminiKey)}&sciraKey=${encodeURIComponent(sciraKey)}`;
      }

      const response = await fetch(url);

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

  const handleAddFood = async () => {
    if (foodName.trim() === "") return;

    if (foodName.startsWith("@")) {
      const recipeName = foodName.slice(1).trim().toLowerCase();

      try {
        const storedRecipes = await AsyncStorage.getItem("recipes");
        const recipes = storedRecipes ? JSON.parse(storedRecipes) : {};

        const recipe = recipes[recipeName];
        if (!recipe) {
          Alert.alert(
            "Recipe Not Found",
            `No saved recipe for "${recipeName}"`,
          );
          return;
        }

        // Clone recipe to add as new entry
        const newFood = { ...recipe, id: Math.random().toString() };
        setFoodItems((prevItems) => [...prevItems, newFood]);
        setFoodName("");
        return;
      } catch (error) {
        console.error("Failed to load recipe", error);
        return;
      }
    }

    const newFood: FoodItem = {
      id: Math.random().toString(),
      name: foodName,
      loading: true,
    };

    setFoodItems((prevItems) => [...prevItems, newFood]);
    fetchFoodData(foodName, newFood.id);
    setFoodName("");
  };

  const handleCreateRecipe = async (food: FoodItem) => {
    try {
      const storedRecipes = await AsyncStorage.getItem("recipes");
      const recipes = storedRecipes ? JSON.parse(storedRecipes) : {};

      // Save by normalized name
      const key = food.name.trim().toLowerCase();
      recipes[key] = food;

      await AsyncStorage.setItem("recipes", JSON.stringify(recipes));
      Alert.alert("Recipe Saved", `"${food.name}" saved for quick reuse!`);
      loadRecipesFromStorage();
    } catch (error) {
      console.error("Failed to save recipe", error);
    }
  };

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

  // Calculate progress percentage
  const progressPercentage = Math.min((totalCalories / calorieGoal) * 100, 100);
  const isOverGoal = totalCalories > calorieGoal;

  const handleTextChange = (text: string) => {
    setFoodName(text);

    if (text.startsWith("@")) {
      const query = text.slice(1).toLowerCase();
      if (query.length > 0) {
        const matches = Object.keys(recipes).filter((name) =>
          name.includes(query),
        );
        setSuggestions(matches);
      } else {
        setSuggestions(Object.keys(recipes));
      }
    } else {
      setSuggestions([]); // Hide when not typing @
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.addFoodContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter food here"
          value={foodName}
          onChangeText={handleTextChange}
        />

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleAddFood}
          style={styles.addButton}
        >
          <Ionicons size={28} name="add" color="white" />
        </TouchableOpacity>
      </View>
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((name) => (
            <TouchableOpacity
              key={name}
              onPress={() => {
                setFoodName(`@${name}`);
                setSuggestions([]);
              }}
              style={styles.suggestionItem}
            >
              <Ionicons name="restaurant-outline" size={16} color="#007bff" />
              <Text style={styles.suggestionText}>{name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <FlatList
        data={foodItems}
        keyExtractor={(item) => item.id}
        renderItem={renderFoodItem}
        contentContainerStyle={styles.listContent}
      />
      <View style={styles.summaryContainer}>
        <View style={styles.calorieInfo}>
          <Text style={styles.summaryText}>Total: {totalCalories} kcal</Text>
          <Text style={styles.summaryText}>Goal: {calorieGoal} kcal</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${progressPercentage}%`,
                backgroundColor: isOverGoal ? "#ff4444" : "#4CAF50",
              },
            ]}
          />
        </View>
        <Text style={styles.remainingText}>
          {isOverGoal
            ? `${totalCalories - calorieGoal} kcal over goal`
            : `${calorieGoal - totalCalories} kcal remaining`}
        </Text>
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
              <TouchableOpacity
                style={styles.recipeButton}
                onPress={() => handleCreateRecipe(selectedFood)}
              >
                <Ionicons
                  name="save-outline"
                  size={20}
                  color="white"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.recipeButtonText}>Create Recipe</Text>
              </TouchableOpacity>
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
  suggestionsContainer: {
    backgroundColor: "#fff",
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    borderRadius: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    paddingVertical: 4,
    zIndex: 10,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  suggestionText: {
    marginLeft: 8,
    fontSize: 15,
    color: "#333",
  },
  listContent: {
    padding: 16,
    paddingBottom: 140, // Extra space for the larger summary
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
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  calorieInfo: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  remainingText: {
    textAlign: "center",
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
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
  recipeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  recipeButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
