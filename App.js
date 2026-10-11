import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
  SafeAreaView
} from 'react-native-safe-area-context';

import Loginpage from './Loginpage';
import Userpage from './Userpage';
import AdminSite from './AdminSite';
import Registerpage from './RegisterPage';
import Chatpage from './chatpage';
import EmailAction from './EmailAction';
import ProfilSzerkesztes from './ProfilSzerkesztes';

const Stack = createStackNavigator();

function biztonsagosOldal(Oldal) {
  return function BiztonsagosOldal(props) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: '#F5F7F8' }}
        edges={['bottom', 'left', 'right']}
      >
        <Oldal {...props} />
      </SafeAreaView>
    );
  };
}

const Login = biztonsagosOldal(Loginpage);
const User = biztonsagosOldal(Userpage);
const Admin = biztonsagosOldal(AdminSite);
const Register = biztonsagosOldal(Registerpage);
const Email = biztonsagosOldal(EmailAction);
const Profil = biztonsagosOldal(ProfilSzerkesztes);

export default function App() {
  return (
    
    <SafeAreaProvider>
      <StatusBar style="dark" hidden={false} />
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen name="Register" component={Register} />
          <Stack.Screen name="Admin" component={Admin} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="User" component={User} />
          <Stack.Screen name="Chat" component={Chatpage} />
          <Stack.Screen
            name="EmailAction"
            component={Email}
            options={{ title: 'E-mail és jelszó' }}
          />
          <Stack.Screen
            name="ProfilSzerkesztes"
            component={Profil}
            options={{ title: 'Profil szerkesztése' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}