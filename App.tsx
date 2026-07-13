import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AssistantScreen } from './src/screens/AssistantScreen';
import { BudgetScreen } from './src/screens/BudgetScreen';
import { DeparturesScreen } from './src/screens/DeparturesScreen';
import { TrainsScreen } from './src/screens/TrainsScreen';
import { TravelersScreen } from './src/screens/TravelersScreen';
import { TripScreen } from './src/screens/TripScreen';
import { darkPalette, lightPalette } from './src/theme';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Trip: 'reorder-three',
  Trains: 'train-outline',
  Board: 'time-outline',
  People: 'people-outline',
  Budget: 'wallet-outline',
  Ask: 'chatbubbles-outline',
};

export default function App() {
  const scheme = useColorScheme();
  const p = scheme === 'dark' ? darkPalette : lightPalette;
  const navTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: p.paper,
      card: p.paper,
      border: p.hair,
      text: p.ink,
      primary: p.signal,
    },
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: { backgroundColor: p.paper, borderTopColor: p.hair },
            tabBarActiveTintColor: p.signalText,
            tabBarInactiveTintColor: p.muted,
            tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={ICONS[route.name] ?? 'ellipse'} color={color} size={size} />
            ),
          })}
        >
          <Tab.Screen name="Trip" component={TripScreen} />
          <Tab.Screen name="Trains" component={TrainsScreen} />
          <Tab.Screen name="Board" component={DeparturesScreen} />
          <Tab.Screen name="People" component={TravelersScreen} />
          <Tab.Screen name="Budget" component={BudgetScreen} />
          <Tab.Screen name="Ask" component={AssistantScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
