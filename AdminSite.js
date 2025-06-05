import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, Alert } from 'react-native';
const IP = require('./ipcim');

export default function AdminSite() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    Users();
  }, []);

  const Users = async () => {
    try {
      const response = await fetch(IP.ipcim + '/szemelyek');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      Alert.alert('Hiba', 'Nem sikerült lekérni az adatokat');
    }
  };

  

     


  const Delete = async (Id) => {
    try {
      const response = await fetch(IP.ipcim + '/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Id }),
      });

      if (response.ok) {
        Alert.alert('Törölve', 'Felhasználó törölve');
        Users(); // Frissítés
      } else {
        Alert.alert('Hiba', 'Nem sikerült törölni');
      }
    } catch (error) {
      Alert.alert('Hiba', 'Hálózati hiba');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {users.map(user => (
        <View key={user.Id} style={styles.userBox}>
          <Text>{user.Felhasznalo} ({user.Email}),{user.Jelentesek}</Text>
          <Button title="Törlés" color="red" onPress={() => Delete(user.Id)} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  userBox: {
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
});