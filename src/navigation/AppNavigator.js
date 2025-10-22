import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from '../screens/WelcomeScreen';
import UnifiedLoginScreen from '../screens/UnifiedLoginScreen';
import ManagementDashboard from '../screens/ManagementDashboard';
import BusInchargeDashboard from '../screens/BusInchargeDashboard';
import DriverDashboard from '../screens/DriverDashboard';
import StudentDashboard from '../screens/StudentDashboard';
import StudentProfileScreen from '../screens/StudentProfileScreen';
import MapScreen from '../screens/MapScreen';
import BusManagement from '../screens/BusManagement';
import BusDetails from '../screens/BusDetails';
import BusLiveTrackingScreen from '../screens/BusLiveTrackingScreen';
import DriverManagement from '../screens/DriverManagement';
import DriverDetails from '../screens/DriverDetails';
import ReportsAnalytics from '../screens/ReportsAnalytics';
import StudentManagement from '../screens/StudentManagement';
import RouteManagement from '../screens/RouteManagement';
import NavigationTestScreen from '../screens/NavigationTestScreen';
import AttendanceView from '../screens/AttendanceView';
import Reports from '../screens/Reports';
import StudentReportScreen from '../screens/StudentReportScreen';
import StudentReportHistoryScreen from '../screens/StudentReportHistoryScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import BusInchargeManagement from '../screens/BusInchargeManagement';
import BusInchargeProfileScreen from '../screens/BusInchargeProfileScreen';
import DriverProfileScreen from '../screens/DriverProfileScreen';
import BusInchargeDetails from '../screens/BusInchargeDetails';
import BusEditScreen from '../screens/BusEditScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator 
      initialRouteName="Welcome"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFD700', // Yellow theme
        },
        headerTintColor: '#2E7D32', // Green theme
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Login" 
        component={UnifiedLoginScreen} 
        options={{ title: 'Login', headerShown: false }}
      />
      <Stack.Screen 
        name="ManagementDashboard" 
        component={ManagementDashboard} 
        options={{ title: 'Management Dashboard', headerShown: false }}
      />
      <Stack.Screen 
        name="CoAdminManagement" 
        component={BusInchargeManagement} 
        options={{ title: 'Bus Incharge Management', headerShown: false }}
      />
      <Stack.Screen 
        name="CoAdminDetails" 
        component={BusInchargeDetails} 
        options={{ title: 'Bus Incharge Details', headerShown: false }}
      />
      <Stack.Screen 
        name="CoAdminDashboard" 
        component={BusInchargeDashboard} 
        options={{ title: 'Bus Incharge Dashboard', headerShown: false }}
      />
      <Stack.Screen 
        name="DriverDashboard" 
        component={DriverDashboard} 
        options={{ title: 'Driver Dashboard', headerShown: false }}
      />
      <Stack.Screen 
        name="StudentDashboard" 
        component={StudentDashboard} 
        options={{ title: 'Student Dashboard', headerLeft: null, headerShown: false }}
      />
      <Stack.Screen 
        name="StudentProfile" 
        component={StudentProfileScreen} 
        options={{ title: 'Profile', headerShown: false }}
      />
      <Stack.Screen 
        name="MapScreen" 
        component={MapScreen} 
        options={{ title: 'Live Bus Tracking', headerShown: false }}
      />
      <Stack.Screen 
        name="BusManagement" 
        component={BusManagement} 
        options={{ title: 'Bus Management', headerShown: false }}
      />
      <Stack.Screen 
        name="BusDetails" 
        component={BusDetails} 
        options={{ title: 'Bus Details', headerShown: false }}
      />
      <Stack.Screen 
        name="BusEdit" 
        component={BusEditScreen} 
        options={{ title: 'Edit Bus Details', headerShown: false }}
      />
      <Stack.Screen 
        name="BusLiveTracking" 
        component={BusLiveTrackingScreen} 
        options={{ title: 'Live Bus Tracking', headerShown: false }}
      />
      <Stack.Screen 
        name="DriverManagement" 
        component={DriverManagement} 
        options={{ title: 'Driver Management', headerShown: false }}
      />
      <Stack.Screen 
        name="DriverDetails" 
        component={DriverDetails} 
        options={{ title: 'Driver Details', headerShown: false }}
      />
      <Stack.Screen 
        name="ReportsAnalytics" 
        component={ReportsAnalytics} 
        options={{ title: 'Reports & Analytics', headerShown: false }}
      />
      <Stack.Screen 
        name="StudentManagement" 
        component={StudentManagement} 
        options={{ title: 'Student Management', headerShown: false }}
      />
      <Stack.Screen 
        name="RouteManagement" 
        component={RouteManagement} 
        options={{ title: 'Route Management', headerShown: false }}
      />
      <Stack.Screen 
        name="NavigationTest" 
        component={NavigationTestScreen} 
        options={{ title: 'Navigation Test', headerShown: false }}
      />
      <Stack.Screen 
        name="AttendanceView" 
        component={AttendanceView} 
        options={{ title: 'Attendance View', headerShown: false }}
      />
      <Stack.Screen 
        name="FeedbackScreen" 
        component={FeedbackScreen} 
        options={{ title: 'Feedback & Complaints', headerShown: false }}
      />
      <Stack.Screen 
        name="Reports" 
        component={Reports} 
        options={{ title: 'Reports', headerShown: false }}
      />
      <Stack.Screen 
        name="StudentReportScreen" 
        component={StudentReportScreen} 
        options={{ title: 'Submit Report', headerShown: false }}
      />
      <Stack.Screen 
        name="StudentReportHistoryScreen" 
        component={StudentReportHistoryScreen} 
        options={{ title: 'Report History', headerShown: false }}
      />
      <Stack.Screen 
        name="CoAdminProfile" 
        component={BusInchargeProfileScreen} 
        options={{ title: 'Bus Incharge Profile', headerShown: false }}
      />
      <Stack.Screen 
        name="DriverProfile" 
        component={DriverProfileScreen} 
        options={{ title: 'Driver Profile', headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
