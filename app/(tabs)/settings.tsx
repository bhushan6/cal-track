import {
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen() {
  const [calorieGoal, setCalorieGoal] = useState("2000");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [sciraApiKey, setSciraApiKey] = useState("");
  const [useCustomKeys, setUseCustomKeys] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [goal, gemini, scira, useCustom] = await Promise.all([
        AsyncStorage.getItem("calorieGoal"),
        AsyncStorage.getItem("geminiApiKey"),
        AsyncStorage.getItem("sciraApiKey"),
        AsyncStorage.getItem("useCustomKeys"),
      ]);

      if (goal) setCalorieGoal(goal);
      if (gemini) setGeminiApiKey(gemini);
      if (scira) setSciraApiKey(scira);
      if (useCustom) setUseCustomKeys(JSON.parse(useCustom));
    } catch (error) {
      console.error("Failed to load settings", error);
      Alert.alert("Error", "Failed to load settings");
    }
  };

  const saveSettings = async () => {
    // Validate calorie goal
    const goalNumber = parseInt(calorieGoal);
    if (isNaN(goalNumber) || goalNumber < 500 || goalNumber > 10000) {
      Alert.alert(
        "Invalid Goal",
        "Please enter a calorie goal between 500 and 10,000",
      );
      return;
    }

    // Validate API keys if custom keys are enabled
    if (useCustomKeys) {
      if (!geminiApiKey.trim()) {
        Alert.alert("Missing API Key", "Please enter your Gemini API key");
        return;
      }
      if (!sciraApiKey.trim()) {
        Alert.alert("Missing API Key", "Please enter your Scira API key");
        return;
      }
    }

    setIsSaving(true);
    try {
      await Promise.all([
        AsyncStorage.setItem("calorieGoal", calorieGoal),
        AsyncStorage.setItem("geminiApiKey", geminiApiKey),
        AsyncStorage.setItem("sciraApiKey", sciraApiKey),
        AsyncStorage.setItem("useCustomKeys", JSON.stringify(useCustomKeys)),
      ]);

      Alert.alert("Success", "Settings saved successfully!");
    } catch (error) {
      console.error("Failed to save settings", error);
      Alert.alert("Error", "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      "Reset Settings",
      "Are you sure you want to reset to default settings?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setCalorieGoal("2000");
            setGeminiApiKey("");
            setSciraApiKey("");
            setUseCustomKeys(false);

            try {
              await Promise.all([
                AsyncStorage.setItem("calorieGoal", "2000"),
                AsyncStorage.removeItem("geminiApiKey"),
                AsyncStorage.removeItem("sciraApiKey"),
                AsyncStorage.setItem("useCustomKeys", "false"),
              ]);
              Alert.alert("Success", "Settings reset to defaults");
            } catch (error) {
              console.error("Failed to reset settings", error);
            }
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Calorie Goal Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="fitness" size={24} color="#007bff" />
            <Text style={styles.sectionTitle}>Calorie Goal</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Set your daily calorie target
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter daily calorie goal"
              value={calorieGoal}
              onChangeText={setCalorieGoal}
              keyboardType="numeric"
            />
            <Text style={styles.inputUnit}>kcal</Text>
          </View>
        </View>

        {/* API Configuration Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="key" size={24} color="#007bff" />
            <Text style={styles.sectionTitle}>API Configuration</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Use your own API keys for food data fetching
          </Text>

          <TouchableOpacity
            style={styles.toggleContainer}
            onPress={() => setUseCustomKeys(!useCustomKeys)}
          >
            <Text style={styles.toggleLabel}>Use Custom API Keys</Text>
            <View style={[styles.toggle, useCustomKeys && styles.toggleActive]}>
              <View
                style={[
                  styles.toggleThumb,
                  useCustomKeys && styles.toggleThumbActive,
                ]}
              />
            </View>
          </TouchableOpacity>

          {useCustomKeys && (
            <>
              <View style={styles.apiKeyContainer}>
                <Text style={styles.label}>Gemini API Key</Text>
                <TextInput
                  style={styles.input}
                  placeholder="AIzaSy..."
                  value={geminiApiKey}
                  onChangeText={setGeminiApiKey}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.hint}>
                  Get your key from Google AI Studio
                </Text>
              </View>

              <View style={styles.apiKeyContainer}>
                <Text style={styles.label}>Scira API Key</Text>
                <TextInput
                  style={styles.input}
                  placeholder="sk-scira-..."
                  value={sciraApiKey}
                  onChangeText={setSciraApiKey}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.hint}>Get your key from Scira.ai</Text>
              </View>
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={saveSettings}
            disabled={isSaving}
          >
            <Ionicons
              name="checkmark-circle"
              size={20}
              color="white"
              style={styles.buttonIcon}
            />
            <Text style={styles.buttonText}>
              {isSaving ? "Saving..." : "Save Settings"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={resetToDefaults}
            disabled={isSaving}
          >
            <Ionicons
              name="refresh"
              size={20}
              color="#007bff"
              style={styles.buttonIcon}
            />
            <Text style={[styles.buttonText, styles.resetButtonText]}>
              Reset to Defaults
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle" size={20} color="#666" />
          <Text style={styles.infoText}>
            When custom API keys are enabled, the app will use your keys instead
            of the default ones. This gives you more control and avoids rate
            limits.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 10,
    color: "#333",
  },
  sectionDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 48,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  inputUnit: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ccc",
    justifyContent: "center",
    padding: 2,
  },
  toggleActive: {
    backgroundColor: "#007bff",
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  apiKeyContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
    fontStyle: "italic",
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  saveButton: {
    backgroundColor: "#007bff",
  },
  resetButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#007bff",
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  resetButtonText: {
    color: "#007bff",
  },
  infoSection: {
    flexDirection: "row",
    backgroundColor: "#e7f3ff",
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
});
