import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import 'react-native-reanimated';

export const unstable_settings = {
  initialRouteName: 'login',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerStyle: { backgroundColor: colorScheme === 'dark' ? '#161925' : '#ffffff' }, headerTintColor: colorScheme === 'dark' ? '#ebedf5' : '#18181b' }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="paper/[id]" options={{ title: 'Paper Details', headerBackTitle: 'Back' }} />
        <Stack.Screen name="workspace/[id]" options={{ title: 'Workspace Details', headerBackTitle: 'Back' }} />
        <Stack.Screen name="admin/dashboard" options={{ title: 'Admin Dashboard', headerBackTitle: 'Back' }} />
        <Stack.Screen name="admin/users" options={{ title: 'Manage Users', headerBackTitle: 'Back' }} />
        <Stack.Screen name="admin/monitoring" options={{ title: 'System Monitoring', headerBackTitle: 'Back' }} />
        <Stack.Screen name="admin/authors" options={{ title: 'Manage Authors', headerBackTitle: 'Back' }} />
        <Stack.Screen name="admin/journals" options={{ title: 'Manage Journals', headerBackTitle: 'Back' }} />
        <Stack.Screen name="admin/keywords" options={{ title: 'Manage Keywords', headerBackTitle: 'Back' }} />
        <Stack.Screen name="admin/topics" options={{ title: 'Manage Topics', headerBackTitle: 'Back' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
