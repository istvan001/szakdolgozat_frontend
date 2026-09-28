import React, { useState } from 'react';
import {
  View,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  ScrollView,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useNavigation } from '@react-navigation/native';

const IP = require('./ipcim');

export default function Loginpage() {

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [jelszoLathato, setJelszoLathato] = useState(false);

  const navigation = useNavigation();

  const Login = async () => {

    try {

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

      if (response.ok) {
        const bejelentkezes = await response.json();

        navigation.navigate('User', {
          felhasznaloId: bejelentkezes.felhasznaloId,
          felhasznaloNev: bejelentkezes.felhasznaloNev,
          token: bejelentkezes.token
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

      <View style={styles.jelszoMezo}>
        <TextInput
          placeholder="Jelszó"
          secureTextEntry={!jelszoLathato}
          value={password}
          onChangeText={setPassword}
          style={styles.jelszoInput}
        />
        <Pressable
          onPress={() => setJelszoLathato(!jelszoLathato)}
          accessibilityRole="button"
          accessibilityLabel={jelszoLathato ? 'Jelszó elrejtése' : 'Jelszó megjelenítése'}
          style={styles.szemGomb}
        >
          <Ionicons name={jelszoLathato ? 'eye-off-outline' : 'eye-outline'} size={24} color="#555" />
        </Pressable>
      </View>

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
  },
  jelszoMezo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 12
  },
  jelszoInput: { flex: 1, padding: 8, minWidth: 0 },
  szemGomb: { padding: 8 }
});