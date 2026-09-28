import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, Button, Alert, StyleSheet,
  ScrollView, Image, Pressable, Platform, Modal, FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
const IP = require('./ipcim');
const telepulesek = require('./telepulesek.json');
const varmegyeLista = [...new Set(telepulesek.map((hely) => hely.varmegye))]
  .sort((a, b) => a.localeCompare(b, 'hu'));

const nemek = ['Nő', 'Férfi', 'Egyéb', 'Nem szeretném megadni'];
const eletkorok = Array.from({ length: 63 }, (_, index) => index + 18);
const keresheto = (ertek) => ertek.toLocaleLowerCase('hu').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function Registerpage() {
  const navigation = useNavigation();
  const [lepes, setLepes] = useState(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordMegerosites, setPasswordMegerosites] = useState('');
  const [jelszoLathato, setJelszoLathato] = useState(false);
  const [megerositesLathato, setMegerositesLathato] = useState(false);
  const [nem, setNem] = useState('');
  const [lakhely, setLakhely] = useState('');
  const [eletkor, setEletkor] = useState('');
  const [profilkep, setProfilkep] = useState(null);
  const [mentes, setMentes] = useState(false);
  const [sikeres, setSikeres] = useState(false);
  const [nyitottLista, setNyitottLista] = useState(null);
  const [valasztottVarmegye, setValasztottVarmegye] = useState('');
  const [telepulesKereses, setTelepulesKereses] = useState('');
  const szurtTelepulesek = useMemo(() => {
    const keresett = keresheto(telepulesKereses.trim());
    return telepulesek.filter((hely) =>
      hely.varmegye === valasztottVarmegye &&
      (!keresett || keresheto(hely.nev).includes(keresett))
    );
  }, [telepulesKereses, valasztottVarmegye]);

  const tovabb = () => {
    if (!username.trim() || !email.trim() || !password) {
      Alert.alert('Hiányzó adat', 'Add meg a felhasználónevet, az e-mail-címet és a jelszót.');
      return;
    }
    if (password !== passwordMegerosites) {
      Alert.alert('Jelszóhiba', 'A két jelszó nem egyezik meg.');
      return;
    }
    setLepes(2);
  };

  const kepKivalasztasa = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
        base64: true
      });
      if (!result.canceled && result.assets?.[0]?.base64) {
        setProfilkep(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Hiba', 'Nem sikerült kiválasztani a képet.');
    }
  };

  const handleRegister = async () => {
    if (!password || password !== passwordMegerosites) {
      Alert.alert('Jelszóhiba', 'A két jelszó nem egyezik meg.');
      setLepes(1);
      return;
    }
    const kor = eletkor.trim() ? Number(eletkor) : null;
    if (kor !== null && (!Number.isInteger(kor) || kor < 18 || kor > 80)) {
      Alert.alert('Hibás életkor', '18 és 80 közötti életkort válassz.');
      return;
    }
    if (mentes || sikeres) return;
    setMentes(true);
    try {
      const response = await fetch(IP.ipcim + '/szemelyfelvi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Felhasznalo: username.trim(),
          Email: email.trim(),
          Jelszo: password,
          nem: nem === 'Nem szeretném megadni' ? null : (nem || null),
          lakhely: lakhely.trim() || null,
          eletkor: kor,
          profilkepBase64: profilkep?.base64 || null
        })
      });
      if (!response.ok) {
        const hiba = await response.text();
        Alert.alert('Hiba', hiba || 'Nem sikerült regisztrálni.');
        return;
      }
      setSikeres(true);
      if (Platform.OS === 'web') {
        window.alert('Sikeres regisztráció! Most már bejelentkezhetsz.');
        navigation.navigate('Login');
      } else {
        Alert.alert('Sikeres regisztráció', 'Most már bejelentkezhetsz!', [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]);
      }
    } catch (error) {
      Alert.alert('Hálózati hiba', 'Nem sikerült csatlakozni a szerverhez.');
    } finally {
      setMentes(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.kartya}>
        <Text style={styles.cim}>{lepes === 1 ? 'Regisztráció' : 'Adatok rólad'}</Text>
        <Text style={styles.leiras}>
          {lepes === 1 ? '1 / 2 · Belépési adatok' : '2 / 2 · A profiladatok megadása választható'}
        </Text>
        {lepes === 1 ? (
          <>
            <TextInput placeholder="Felhasználónév" value={username} onChangeText={setUsername} style={styles.input} autoCapitalize="none" />
            <TextInput placeholder="E-mail-cím" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
            <View style={styles.jelszoMezo}>
              <TextInput placeholder="Jelszó" secureTextEntry={!jelszoLathato} value={password} onChangeText={setPassword} style={styles.jelszoInput} />
              <Pressable onPress={() => setJelszoLathato(!jelszoLathato)} accessibilityRole="button" accessibilityLabel={jelszoLathato ? 'Jelszó elrejtése' : 'Jelszó megjelenítése'} style={styles.szemGomb}>
                <Ionicons name={jelszoLathato ? 'eye-off-outline' : 'eye-outline'} size={24} color="#555" />
              </Pressable>
            </View>
            <View style={styles.jelszoMezo}>
              <TextInput placeholder="Jelszó újra" secureTextEntry={!megerositesLathato} value={passwordMegerosites} onChangeText={setPasswordMegerosites} style={styles.jelszoInput} />
              <Pressable onPress={() => setMegerositesLathato(!megerositesLathato)} accessibilityRole="button" accessibilityLabel={megerositesLathato ? 'Megerősítő jelszó elrejtése' : 'Megerősítő jelszó megjelenítése'} style={styles.szemGomb}>
                <Ionicons name={megerositesLathato ? 'eye-off-outline' : 'eye-outline'} size={24} color="#555" />
              </Pressable>
            </View>
            {passwordMegerosites && password !== passwordMegerosites ? <Text style={styles.hiba}>A két jelszó nem egyezik meg.</Text> : null}
            <Button title="Tovább" onPress={tovabb} disabled={!username.trim() || !email.trim() || !password || password !== passwordMegerosites} />
          </>
        ) : (
          <>
            <Pressable style={styles.avatarResz} onPress={kepKivalasztasa} accessibilityRole="button" accessibilityLabel="Profilkép kiválasztása">
              {profilkep ? (
                <Image source={{ uri: profilkep.uri }} style={styles.avatar} />
              ) : (
                <Ionicons name="person-circle" size={100} color="#aaa" />
              )}
              <Text style={styles.kepFelirat}>{profilkep ? 'Kép cseréje' : 'Profilkép hozzáadása (választható)'}</Text>
            </Pressable>
            {profilkep && <Button title="Profilkép eltávolítása" onPress={() => setProfilkep(null)} />}
            <Text style={styles.cimke}>Nem (választható)</Text>
            <View style={styles.nemek}>
              {nemek.map((ertek) => (
                <Pressable key={ertek} style={[styles.nemGomb, nem === ertek && styles.nemAktiv]} onPress={() => setNem(ertek)}>
                  <Text style={nem === ertek && styles.nemAktivSzoveg}>{ertek}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.valaszto} onPress={() => setNyitottLista('varmegye')} accessibilityRole="button">
              <Text style={lakhely ? styles.valasztottSzoveg : styles.helyorzo}>{lakhely || 'Település kiválasztása (választható)'}</Text>
              <Ionicons name="chevron-down" size={20} color="#555" />
            </Pressable>
            <Pressable style={styles.valaszto} onPress={() => setNyitottLista('eletkor')} accessibilityRole="button">
              <Text style={eletkor ? styles.valasztottSzoveg : styles.helyorzo}>{eletkor ? `${eletkor} éves` : 'Életkor kiválasztása (18–80, választható)'}</Text>
              <Ionicons name="chevron-down" size={20} color="#555" />
            </Pressable>
            <View style={styles.gombok}>
              <Button title="Vissza" onPress={() => setLepes(1)} disabled={mentes} />
              <Button title={mentes ? 'Mentés...' : 'Regisztráció befejezése'} onPress={handleRegister} disabled={mentes || sikeres} />
            </View>
          </>
        )}
      </View>
      <Modal visible={nyitottLista !== null} transparent animationType="slide" onRequestClose={() => setNyitottLista(null)}>
        <View style={styles.modalHatter}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setNyitottLista(null)} />
          <View style={styles.modalKartya}>
            <Text style={styles.modalCim}>
              {nyitottLista === 'varmegye' ? 'Vármegye kiválasztása' :
                nyitottLista === 'telepules' ? `${valasztottVarmegye} · Település` : 'Életkor kiválasztása'}
            </Text>
            {nyitottLista === 'telepules' && (
              <TextInput
                placeholder="Település keresése"
                value={telepulesKereses}
                onChangeText={setTelepulesKereses}
                style={styles.input}
                autoFocus
              />
            )}
            <Pressable style={styles.listaElem} onPress={() => {
              if (nyitottLista !== 'eletkor') {
                setLakhely('');
                setValasztottVarmegye('');
                setTelepulesKereses('');
              }
              else setEletkor('');
              setNyitottLista(null);
            }}>
              <Text>Nem szeretném megadni</Text>
            </Pressable>
            {nyitottLista === 'varmegye' ? (
              <FlatList
                data={varmegyeLista}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <Pressable style={styles.listaElem} onPress={() => {
                    setValasztottVarmegye(item);
                    setTelepulesKereses('');
                    setNyitottLista('telepules');
                  }}>
                    <Text>{item}</Text>
                  </Pressable>
                )}
              />
            ) : nyitottLista === 'telepules' ? (
              <FlatList
                data={szurtTelepulesek}
                keyExtractor={(item) => `${item.varmegye}-${item.nev}`}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={20}
                renderItem={({ item }) => (
                  <Pressable style={styles.listaElem} onPress={() => {
                    setLakhely(item.nev);
                    setNyitottLista(null);
                    setTelepulesKereses('');
                  }}>
                    <Text>{item.nev}</Text>
                  </Pressable>
                )}
                ListEmptyComponent={<Text style={styles.uresLista}>Nincs találat.</Text>}
              />
            ) : (
              <FlatList
                data={eletkorok}
                keyExtractor={(item) => String(item)}
                renderItem={({ item }) => (
                  <Pressable style={styles.listaElem} onPress={() => { setEletkor(String(item)); setNyitottLista(null); }}>
                    <Text>{item} éves</Text>
                  </Pressable>
                )}
              />
            )}
            {nyitottLista === 'telepules' && <Button title="Vissza a vármegyékhez" onPress={() => setNyitottLista('varmegye')} />}
            <Button title="Bezárás" onPress={() => setNyitottLista(null)} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  kartya: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  cim: { fontSize: 25, fontWeight: 'bold', marginBottom: 8 },
  leiras: { color: '#666', marginBottom: 22 },
  cimke: { fontSize: 16, marginTop: 20, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#bbb', padding: 12, marginBottom: 12, borderRadius: 8, fontSize: 16 },
  jelszoMezo: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#bbb', borderRadius: 8, marginBottom: 12 },
  jelszoInput: { flex: 1, padding: 12, fontSize: 16, minWidth: 0 },
  szemGomb: { padding: 12 },
  hiba: { color: '#b00020', marginBottom: 12 },
  valaszto: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#bbb', borderRadius: 8, padding: 12, marginBottom: 12 },
  helyorzo: { color: '#777', flex: 1 },
  valasztottSzoveg: { fontSize: 16, flex: 1 },
  modalHatter: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 18 },
  modalKartya: { backgroundColor: '#fff', borderRadius: 12, padding: 16, height: '75%', maxWidth: 600, width: '100%', alignSelf: 'center' },
  modalCim: { fontSize: 20, fontWeight: 'bold', marginBottom: 14 },
  listaElem: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#eee' },
  uresLista: { textAlign: 'center', marginTop: 20, color: '#777' },
  avatarResz: { alignItems: 'center', marginBottom: 14 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  kepFelirat: { color: '#2678ba', marginTop: 6 },
  nemek: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  nemGomb: { padding: 10, borderWidth: 1, borderColor: '#bbb', borderRadius: 20, marginRight: 8, marginBottom: 8 },
  nemAktiv: { backgroundColor: '#2678ba', borderColor: '#2678ba' },
  nemAktivSzoveg: { color: '#fff' },
  gombok: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }
});