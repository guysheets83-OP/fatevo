import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { getDb } from './src/db';
import type { RootStackParamList } from './src/navigation';
import ListsScreen from './src/screens/ListsScreen';
import OptionEditScreen from './src/screens/OptionEditScreen';
import ResultScreen from './src/screens/ResultScreen';
import SetDetailScreen from './src/screens/SetDetailScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  // Initialize the on-device database (creates schema on first launch).
  useEffect(() => {
    getDb();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        initialRouteName="Lists"
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen
          name="Lists"
          component={ListsScreen}
          options={{
            title: 'Fatevo',
            headerTitleStyle: { fontSize: 26, fontWeight: '800', color: colors.ink },
          }}
        />
        <Stack.Screen name="SetDetail" component={SetDetailScreen} options={{ title: 'Options' }} />
        <Stack.Screen name="OptionEdit" component={OptionEditScreen} options={{ title: 'Option' }} />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{
            title: 'Fate decides…',
            headerBackVisible: false,
            gestureEnabled: false,
            headerTitleAlign: 'center',
            headerTitleStyle: { fontSize: 26, fontWeight: '800', color: colors.accent },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
