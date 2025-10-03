import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { authService } from '../services/authService';
import { COLORS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

const AuthStatus = ({ navigation }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const user = await authService.getCurrentUser();
    const authenticated = await authService.isAuthenticated();
    
    setCurrentUser(user);
    setIsAuthenticated(authenticated);
  };

  const handleLogout = async () => {
    const success = await authService.logout();
    if (success) {
      setCurrentUser(null);
      setIsAuthenticated(false);
      navigation.navigate('Welcome');
    }
  };

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Ionicons 
            name={currentUser.role === 'driver' ? 'car' : 'school'} 
            size={20} 
            color={COLORS.white} 
          />
        </View>
        <View style={styles.details}>
          <Text style={styles.name}>{currentUser.name}</Text>
          <Text style={styles.role}>{currentUser.role.toUpperCase()}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out" size={20} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  role: {
    fontSize: 11,
    color: COLORS.gray,
  },
  logoutButton: {
    padding: 5,
  },
});

export default AuthStatus;
