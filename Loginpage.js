import React, { useState } from 'react';
import {
  View,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  ScrollView
} from 'react-native';

import { useNavigation } from '@react-navigation/native';

const IP = require('./ipcim');

export default function Loginpage() {

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const navigation = useNavigation();

  const Login = async () => {

    try {

      // Admin hozzáférés
      if (username === 'admin' && password === 'admin') {
        navigation.navigate('Admin');
        return;
      }

      // Felhasználó ellenőrzése
      const response = await fetch(IP.ipcim + '/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Felhasznalo: username,
          Jelszo: password
        })
      });

      const users = await response.json();

      const foundUser = users.find(
        u =>
          u.Felhasznalo === username &&
          u.Jelszo === password
      );

      if (foundUser) {

        console.log('Bejelentkezett felhasználó:', foundUser);

        navigation.navigate('User', {
          felhasznaloId: foundUser.Id,
          felhasznaloNev: foundUser.Felhasznalo
        });
      } else {

        Alert.alert(
          'Hiba',
          'Hibás felhasználónév vagy jelszó'
        );

      }

    } catch (error) {

      console.error(error);

      Alert.alert(
        'Hálózati hiba',
        'Nem sikerült csatlakozni a szerverhez'
      );

    }
  };

  const Register = () => {
    navigation.navigate('Register');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      <TextInput
        placeholder="Felhasználónév"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />

      <TextInput
        placeholder="Jelszó"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      <Button
        title="Bejelentkezés"
        onPress={Login}
      />

      <Button
        title="Regisztráció"
        onPress={Register}
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20
  },

  input: {
    borderWidth: 1,
    padding: 8,
    marginBottom: 12,
    borderRadius: 5
  }
});