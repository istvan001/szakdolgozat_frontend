import React from 'react';
import { View, Text } from 'react-native';
const IP = require('./ipcim');

export default function Userpage() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Sikeres bejelentkezés!</Text>
    </View>
  );
}