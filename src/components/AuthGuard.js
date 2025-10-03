import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { authService } from '../services/authService';
import { COLORS } from '../utils/constants';

const AuthGuard = ({ children, navigation, requiredRole = null }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const authenticated = await authService.isAuthenticated();
      const currentUser = await authService.getCurrentUser();
      
      if (authenticated && currentUser) {
        setIsAuthenticated(true);
        setUserRole(currentUser.role);
        
        // Check if user has required role
        if (requiredRole && currentUser.role !== requiredRole) {
          Alert.alert(
            'Access Denied',
            `This area is restricted to ${requiredRole}s only.`,
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack()
              }
            ]
          );
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
        Alert.alert(
          'Authentication Required',
          'Please login to access this feature.',
          [
            {
              text: 'Login',
              onPress: () => navigation.navigate('Welcome')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null; // Will be handled by navigation redirect
  }

  return children;
};

export default AuthGuard;
