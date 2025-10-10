import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginSelectionScreen from '../screens/LoginSelectionScreen';
import ManagementLoginScreen from '../screens/ManagementLoginScreen';
import CoAdminLoginScreen from '../screens/CoAdminLoginScreen';
import DriverLoginScreen from '../screens/DriverLoginScreen';
import StudentLoginScreen from '../screens/StudentLoginScreen';
import DriverSignupScreen from '../screens/DriverSignupScreen';
import StudentSignupScreen from '../screens/StudentSignupScreen';
import ManagementDashboard from '../screens/ManagementDashboard';
import CoAdminDashboard from '../screens/CoAdminDashboard';
import DriverDashboard from '../screens/DriverDashboard';
import StudentDashboard from '../screens/StudentDashboard';
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
import AttendanceHistoryScreen from '../screens/AttendanceHistoryScreen';
import CoAdminAttendanceHistory from '../screens/CoAdminAttendanceHistory';
import Reports from '../screens/Reports';
import StudentReportScreen from '../screens/StudentReportScreen';
import FeedbackScreen from '../screens/FeedbackScreen';

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
        name="LoginSelection" 
        component={LoginSelectionScreen} 
        options={{ title: 'Select Login Type' }}
      />
      <Stack.Screen 
        name="ManagementLogin" 
        component={ManagementLoginScreen} 
        options={{ title: 'Management Login' }}
      />
      <Stack.Screen 
        name="CoAdminLogin" 
        component={CoAdminLoginScreen} 
        options={{ title: 'Co-Admin Login' }}
      />
      <Stack.Screen 
        name="DriverLogin" 
        component={DriverLoginScreen} 
        options={{ title: 'Driver Login' }}
      />
      <Stack.Screen 
        name="StudentLogin" 
        component={StudentLoginScreen} 
        options={{ title: 'Student Login' }}
      />
      <Stack.Screen 
        name="DriverSignup" 
        component={DriverSignupScreen} 
        options={{ title: 'Driver Registration' }}
      />
      <Stack.Screen 
        name="StudentSignup" 
        component={StudentSignupScreen} 
        options={{ title: 'Student Registration' }}
      />
      <Stack.Screen 
        name="ManagementDashboard" 
        component={ManagementDashboard} 
        options={{ title: 'Management Dashboard', headerLeft: null }}
      />
      <Stack.Screen 
        name="CoAdminDashboard" 
        component={CoAdminDashboard} 
        options={{ title: 'Co-Admin Dashboard', headerLeft: null }}
      />
      <Stack.Screen 
        name="DriverDashboard" 
        component={DriverDashboard} 
        options={{ title: 'Driver Dashboard', headerLeft: null }}
      />
      <Stack.Screen 
        name="StudentDashboard" 
        component={StudentDashboard} 
        options={{ title: 'Student Dashboard', headerLeft: null }}
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
        name="AttendanceHistoryScreen" 
        component={AttendanceHistoryScreen} 
        options={{ title: 'Attendance History', headerShown: false }}
      />
      <Stack.Screen 
        name="CoAdminAttendanceHistory" 
        component={CoAdminAttendanceHistory} 
        options={{ title: 'Attendance History', headerShown: false }}
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
    </Stack.Navigator>
  );
};

export default AppNavigator;
