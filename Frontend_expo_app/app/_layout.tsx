import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, TouchableOpacity, StyleSheet } from 'react-native';
import 'react-native-reanimated';
import { SocketProvider } from '../context/SocketContext';
import { Colors } from '../constants/theme';
import WorkspaceChatbot from '../components/workspace/WorkspaceChatbot';
import { Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { useSegments } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'login',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme || 'dark'];
  const [isChatOpen, setIsChatOpen] = useState(false);
  const segments = useSegments();
  
  // Hide on login screen
  const isAuthScreen = segments[0] === 'login';

  return (
    <SocketProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerStyle: { backgroundColor: colorScheme === 'dark' ? '#161925' : '#ffffff' }, headerTintColor: colorScheme === 'dark' ? '#ebedf5' : '#18181b' }}>
        <Stack.Screen name="login" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
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
        
        {/* Global Floating Chatbot */}
        {!isAuthScreen && (
          <>
            <TouchableOpacity
              style={[styles.fab, { backgroundColor: theme.primary }]}
              onPress={() => setIsChatOpen(true)}
            >
              <Sparkles size={24} color="#fff" />
            </TouchableOpacity>

            <WorkspaceChatbot
              theme={theme}
              isVisible={isChatOpen}
              onClose={() => setIsChatOpen(false)}
            />
          </>
        )}
      </ThemeProvider>
    </SocketProvider>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 110, // Raised to avoid covering the bottom tab bar
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  }
});
