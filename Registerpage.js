import React, { useState } from 'react';
import { View, TextInput, Button, Alert, StyleSheet,ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
const IP = require('./ipcim');

export default function Registerpage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const navigation = useNavigation();

  const handleRegister = async () => {
    if (!username || !password || !email) {
      Alert.alert('Hiba', 'Minden mező kitöltése kötelező');
      return;
    }

    try {
      const response = await fetch(IP.ipcim + '/szemelyfelvi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Felhasznalo: username,
          Email: email,
          Jelszo: password
        })
      });

      if (response.ok) {
        Alert.alert('Sikeres regisztráció', 'Most már bejelentkezhetsz!', [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]);
      } else {
        Alert.alert('Hiba', 'Nem sikerült regisztrálni');
      }
    } catch (error) {
      Alert.alert('Hálózati hiba', 'Nem sikerült csatlakozni a szerverhez');
    }
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
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Jelszó"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      <Button title="Regisztráció" onPress={handleRegister} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  input: { borderWidth: 1, padding: 8, marginBottom: 12, borderRadius: 5 }
});