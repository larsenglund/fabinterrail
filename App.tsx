import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AssistantScreen } from './src/screens/AssistantScreen';
import { BudgetScreen } from './src/screens/BudgetScreen';
import { DeparturesScreen } from './src/screens/DeparturesScreen';
import { TrainsScreen } from './src/screens/TrainsScreen';
import { TravelersScreen } from './src/screens/TravelersScreen';
import { TripScreen } from './src/screens/TripScreen';
import { colors } from './src/theme';

const Tab = createBottomTabNavigator();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.card,
    border: colors.border,
    text: colors.text,
    primary: colors.primary,
  },
};

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Trip: 'map',
  Trains: 'train',
  Departures: 'time',
  Travelers: 'people',
  Budget: 'wallet',
  Assistant: 'chatbubbles',
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={theme}>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textDim,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={ICONS[route.name] ?? 'ellipse'} color={color} size={size} />
            ),
          })}
        >
          <Tab.Screen name="Trip" component={TripScreen} />
          <Tab.Screen name="Trains" component={TrainsScreen} />
          <Tab.Screen name="Departures" component={DeparturesScreen} />
          <Tab.Screen name="Travelers" component={TravelersScreen} />
          <Tab.Screen name="Budget" component={BudgetScreen} />
          <Tab.Screen name="Assistant" component={AssistantScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
