import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Loginpage from './Loginpage';
import Userpage from './Userpage';
import AdminSite from './AdminSite';
import Registerpage from './Registerpage';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Register" component={Registerpage} />
        <Stack.Screen name="Admin" component={AdminSite} />
        <Stack.Screen name="Login" component={Loginpage} />
        <Stack.Screen name="User" component={Userpage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
