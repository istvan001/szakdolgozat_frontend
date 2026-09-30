import React, { useState } from 'react';
import { ScrollView, Text, TextInput, Button, Alert, StyleSheet, Platform } from 'react-native';
const IP = require('./ipcim');

export default function EmailAction({ route, navigation }) {
  const mode = route.params?.mode === 'verify' ? 'verify' : 'reset';
  const [email, setEmail] = useState(route.params?.email || '');
  const [kod, setKod] = useState('');
  const [jelszo, setJelszo] = useState('');
  const [jelszoUjra, setJelszoUjra] = useState('');
  const [folyamatban, setFolyamatban] = useState(false);
  const [masodikLepes, setMasodikLepes] = useState(mode === 'verify' && Boolean(route.params?.email));
  const jelzes = (cim, uzenet, kesz = false) => {
    if (Platform.OS === 'web') {
      window.alert(`${cim}: ${uzenet}`);
      if (kesz) navigation.navigate('Login');
    } else {
      Alert.alert(cim, uzenet, kesz ? [{ text: 'OK', onPress: () => navigation.navigate('Login') }] : undefined);
    }
  };
  const ker = async (url, adat, sikerUzenet, kesz = false, sikerUtan = null) => {
    if (folyamatban) return;
    setFolyamatban(true);
    try {
      const response = await fetch(IP.ipcim + url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adat)
      });
      const szoveg = await response.text();
      if (!response.ok) return jelzes('Hiba', szoveg || 'Nem sikerült a művelet.');
      if (sikerUtan) sikerUtan();
      jelzes('Sikeres', sikerUzenet, kesz);
    } catch (error) {
      jelzes('Hálózati hiba', 'Nem sikerült elérni a szervert.');
    } finally {
      setFolyamatban(false);
    }
  };
  const ujKod = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return jelzes('Hiányzó adat', 'Adj meg egy érvényes e-mail-címet.');
    ker('/kod-keres', { Email: email.trim(), tipus: mode },
      'Ha a címhez tartozik megfelelő fiók, elküldtük a 10 percig érvényes kódot.', false,
      () => { setMasodikLepes(true); setKod(''); });
  };
  const megerosites = () => {
    if (!email.trim() || !/^\d{8}$/.test(kod))
      return jelzes('Hiányzó adat', 'Add meg az e-mail-címet és a 8 számjegyű kódot.');
    if (mode === 'reset') {
      if (jelszo.length < 8 || jelszo !== jelszoUjra)
        return jelzes('Jelszóhiba', 'A két jelszó egyezzen meg, és legalább 8 karakterből álljon.');
      ker('/jelszo-visszaallitas', { Email: email.trim(), kod, ujJelszo: jelszo },
        'Az új jelszavaddal bejelentkezhetsz.', true);
    } else {
      ker('/email-megerosites', { Email: email.trim(), kod },
        'Az e-mail-címedet megerősítettük. Most már bejelentkezhetsz.', true);
    }
  };
  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.cim}>{mode === 'reset' ? 'Elfelejtett jelszó' : 'E-mail megerősítése'}</Text>
      <Text style={styles.leiras}>{masodikLepes
        ? mode === 'reset' ? 'Add meg az e-mailben kapott kódot és az új jelszavadat.' : 'Add meg az e-mailben kapott kódot.'
        : 'Add meg a regisztrációnál használt e-mail-címedet.'}</Text>
      {!masodikLepes ? <>
      <TextInput style={styles.input} placeholder="E-mail-cím" value={email} onChangeText={setEmail}
        keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
      <Button title={folyamatban ? 'Kód küldése...' : 'Kód küldése'} onPress={ujKod} disabled={folyamatban} />
      </> : <>
      <Text style={styles.leiras}>E-mail-cím: {email.trim()}</Text>
      <TextInput style={styles.input} placeholder="8 számjegyű kód" value={kod} onChangeText={setKod}
        keyboardType="number-pad" maxLength={8} />
      {mode === 'reset' && <>
        <TextInput style={styles.input} placeholder="Új jelszó (legalább 8 karakter)" value={jelszo}
          onChangeText={setJelszo} secureTextEntry autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Új jelszó újra" value={jelszoUjra}
          onChangeText={setJelszoUjra} secureTextEntry autoCapitalize="none" />
      </>}
      <Button title={mode === 'reset' ? 'Jelszó módosítása' : 'E-mail megerősítése'}
        onPress={megerosites} disabled={folyamatban} />
      <Button title="Kód újraküldése" onPress={ujKod} disabled={folyamatban} />
      <Button title="Másik e-mail-cím megadása" disabled={folyamatban}
        onPress={() => { setMasodikLepes(false); setKod(''); setJelszo(''); setJelszoUjra(''); }} />
      </>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff', gap: 12 },
  cim: { fontSize: 24, fontWeight: 'bold' },
  leiras: { fontSize: 15, color: '#555', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 9, padding: 12, fontSize: 16 }
});