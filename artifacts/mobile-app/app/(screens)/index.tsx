import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a3fbd' }}>
        <ActivityIndicator color="#ffffff" size="large" />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;
  if (user.role === 'hrms_employee') return <Redirect href="/(hrms)" />;
  return <Redirect href="/(tabs)" />;
}
