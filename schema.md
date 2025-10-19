## AsyncStorage Data Schema

This document outlines the schema of the data stored in AsyncStorage for the Cal-Tracker application.

### 1. `foodItems`

*   **Key:** `foodItems`
*   **Type:** `Array<FoodItem>`

This key stores an array of `FoodItem` objects, where each object represents a food item added by the user.

#### `FoodItem` Object Structure

| Field         | Type                  | Description                                                                 |
| :------------ | :-------------------- | :-------------------------------------------------------------------------- |
| `id`          | `string`              | A unique identifier for the food item.                                      |
| `name`        | `string`              | The name of the food item.                                                  |
| `calories`    | `number` (optional)   | The total number of calories in the food item.                              |
| `ingredients` | `Array<Ingredient>` (optional) | An array of `Ingredient` objects, each with a `name` and `calories`.        |
| `sources`     | `Array<string>` (optional)   | An array of strings that represent the sources of the food data.            |
| `loading`     | `boolean` (optional)  | A boolean that indicates whether the food data is currently being fetched.  |
| `error`       | `string` (optional)   | A string that contains an error message if the food data could not be fetched. |

### 2. `historicalData`

*   **Key:** `historicalData`
*   **Type:** `Object`

This key stores an object where the keys are dates in the format `YYYY-MM-DD` and the values are objects with a `totalCalories` property.

#### `historicalData` Object Structure

```json
{
  "YYYY-MM-DD": {
    "totalCalories": number
  }
}
```
