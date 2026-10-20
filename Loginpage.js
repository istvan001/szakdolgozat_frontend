import React, { useState } from 'react';
import {
  View,
  TextInput,
  Alert,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';

const IP = require('./ipcim');

export default function Loginpage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [jelszoLathato, setJelszoLathato] = useState(false);
  const navigation = useNavigation();
  const fejlecMagassag = useHeaderHeight();

  const Login = async () => {
    try {
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

        navigation.navigate(bejelentkezes.admin ? 'Admin' : 'User', {
          felhasznaloId: bejelentkezes.felhasznaloId,
          felhasznaloNev: bejelentkezes.felhasznaloNev,
          token: bejelentkezes.token
        });
      } else {
        const hiba = await response.text();
        Alert.alert('Hiba', hiba || 'Hibás felhasználónév vagy jelszó');
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Hálózati hiba',
        'Nem sikerült csatlakozni a szerverhez'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F5F7F8' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={fejlecMagassag}
    >
      <ScrollView
        style={styles.oldal}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.tartalom}>
          <View style={styles.fejlec}>

            <Text style={styles.cim}>Randotalk</Text>
            <Text style={styles.alcim}>Lépj be, és folytasd a beszélgetést!</Text>
          </View>

          <View style={styles.kartya}>
            <Text style={styles.kartyaCim}>Bejelentkezés</Text>

            <Text style={styles.mezoCim}>Felhasználónév</Text>
            <View style={styles.mezo}>
              <Ionicons name="person-outline" size={21} color="#77828D" />
              <TextInput
                placeholder="Felhasználónév"
                placeholderTextColor="#929CA5"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Felhasználónév"
                style={styles.input}
              />
            </View>

            <Text style={styles.mezoCim}>Jelszó</Text>
            <View style={styles.mezo}>
              <Ionicons
                name="lock-closed-outline"
                size={21}
                color="#77828D"
              />
              <TextInput
                placeholder="Jelszó"
                placeholderTextColor="#929CA5"
                secureTextEntry={!jelszoLathato}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Jelszó"
                style={styles.input}
              />
              <Pressable
                onPress={() => setJelszoLathato(elozo => !elozo)}
                accessibilityRole="button"
                accessibilityLabel={
                  jelszoLathato
                    ? 'Jelszó elrejtése'
                    : 'Jelszó megjelenítése'
                }
                style={styles.szemGomb}
              >
                <Ionicons
                  name={jelszoLathato ? 'eye-off-outline' : 'eye-outline'}
                  size={23}
                  color="#77828D"
                />
              </Pressable>
            </View>

            <Pressable
              onPress={() => navigation.navigate('EmailAction', { mode: 'reset' })}
              accessibilityRole="button"
              style={styles.elfelejtettGomb}
            >
              <Text style={styles.elfelejtettSzoveg}>
                Elfelejtetted a jelszavad?
              </Text>
            </Pressable>

            <Pressable
              onPress={Login}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.belepesGomb,
                pressed && styles.megnyomva
              ]}
            >
              <Text style={styles.belepesSzoveg}>Bejelentkezés</Text>
              <Ionicons name="arrow-forward" size={21} color="#fff" />
            </Pressable>
          </View>

          <Text style={styles.regisztracioCim}>Még nincs fiókod?</Text>
          <Pressable
            onPress={() => navigation.navigate('Register')}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.regisztracioGomb,
              pressed && styles.megnyomva
            ]}
          >
            <Text style={styles.regisztracioSzoveg}>Regisztráció</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>

  );
}
const styles = StyleSheet.create({
  oldal: {
    flex: 1,
    backgroundColor: '#F5F7F8'
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32
  },
  tartalom: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center'
  },
  fejlec: {
    alignItems: 'center',
    marginBottom: 28
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF7F8',
    marginBottom: 16
  },
  cim: {
    fontSize: 32,
    fontWeight: '700',
    color: '#17212B'
  },
  alcim: {
    fontSize: 14,
    lineHeight: 21,
    color: '#77828D',
    textAlign: 'center',
    marginTop: 8
  },
  kartya: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#263B45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2
  },
  kartyaCim: {
    fontSize: 23,
    fontWeight: '700',
    color: '#17212B',
    marginBottom: 24
  },
  mezoCim: {
    fontSize: 13,
    fontWeight: '600',
    color: '#52606D',
    marginBottom: 8
  },
  mezo: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    paddingLeft: 14,
    borderWidth: 1,
    borderColor: '#E4EAED',
    borderRadius: 14,
    backgroundColor: '#F8FAFB',
    marginBottom: 16
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: '#17212B'
  },
  szemGomb: {
    padding: 12
  },
  elfelejtettGomb: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    marginBottom: 18
  },
  elfelejtettSzoveg: {
    fontSize: 13,
    fontWeight: '600',
    color: '#008D99'
  },
  belepesGomb: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 54,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#008D99'
  },
  belepesSzoveg: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff'
  },
  megnyomva: {
    opacity: 0.75
  },
  regisztracioCim: {
    textAlign: 'center',
    fontSize: 14,
    color: '#77828D',
    marginTop: 26,
    marginBottom: 12
  },
  regisztracioGomb: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: '#008D99',
    borderRadius: 16,
    backgroundColor: '#EAF7F8'
  },
  regisztracioSzoveg: {
    fontSize: 16,
    fontWeight: '600',
    color: '#008D99'
  }
});