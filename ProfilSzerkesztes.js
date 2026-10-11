import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, Button, Alert, StyleSheet,
  ScrollView, Image, Pressable, Modal, FlatList, useWindowDimensions, KeyboardAvoidingView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import ProtectedImage from './ProtectedImage';

const IP = require('./ipcim');
const telepulesek = require('./telepulesek.json');
const varmegyeLista = [...new Set(telepulesek.map(x => x.varmegye))]
  .sort((a, b) => a.localeCompare(b, 'hu'));
const eletkorok = Array.from({ length: 63 }, (_, i) => i + 18);
const keresheto = ertek => ertek.toLocaleLowerCase('hu')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');



export default function ProfilSzerkesztes({ token, felhasznaloId, onMentve }) {
  const [lakhely, setLakhely] = useState('');
  const [eletkor, setEletkor] = useState('');
  const [profilkep, setProfilkep] = useState(null);
  const [regiKep, setRegiKep] = useState(null);
  const [kepTorles, setKepTorles] = useState(false);
  const [mentes, setMentes] = useState(false);
  const [nyitva, setNyitva] = useState(false);
  const [nyitottLista, setNyitottLista] = useState(null);
  const [valasztottVarmegye, setValasztottVarmegye] = useState('');
  const [telepulesKereses, setTelepulesKereses] = useState('');
  const zar = useRef(false);
  const [kepNagy, setKepNagy] = useState(false);
  const { width, height } = useWindowDimensions();
  const nagyKepUri = profilkep?.uri ||
    (!kepTorles && regiKep ? IP.ipcim + regiKep : null);

  const szurtTelepulesek = useMemo(() => {
    const keresett = keresheto(telepulesKereses.trim());
    return telepulesek.filter(hely =>
      hely.varmegye === valasztottVarmegye &&
      (!keresett || keresheto(hely.nev).includes(keresett))
    );
  }, [telepulesKereses, valasztottVarmegye]);

  const megnyitas = async () => {
    if (zar.current) return;
    zar.current = true;
    setMentes(true);
    try {
      const response = await fetch(
        IP.ipcim + '/profil/' + felhasznaloId,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error(await response.text());
      const profil = await response.json();
      setLakhely(profil.lakhely || '');
      setEletkor(profil.eletkor == null ? '' : String(profil.eletkor));
      setRegiKep(profil.profilkep_url || null);
      setProfilkep(null);
      setKepTorles(false);
      setNyitva(true);
    } catch (error) {
      Alert.alert('Hiba', error.message || 'Nem sikerült betölteni a profilt.');
    } finally {
      zar.current = false;
      setMentes(false);
    }
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
        setKepTorles(false);
      }
    } catch {
      Alert.alert('Hiba', 'Nem sikerült kiválasztani a képet.');
    }
  };

  const mentesProfil = async () => {
    if (zar.current) return;
    zar.current = true;
    setMentes(true);
    try {
      const response = await fetch(IP.ipcim + '/profil-szerkesztes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          lakhely: lakhely || null,
          eletkor: eletkor ? Number(eletkor) : null,
          ...(profilkep ? { profilkepBase64: profilkep.base64 } : {}),
          kepTorles
        })
      });
      if (!response.ok) throw new Error(await response.text());
      const frissitettProfil = await response.json();
      onMentve?.(frissitettProfil);
      setNyitva(false);
      Alert.alert('Mentve', 'A profiladataid frissültek.');
    } catch (error) {
      Alert.alert('Hiba', error.message || 'Nem sikerült elmenteni a profilt.');
    } finally {
      zar.current = false;
      setMentes(false);
    }
  };

  const kep = profilkep
    ? <Image source={{ uri: profilkep.uri }} style={styles.avatar} />
    : regiKep && !kepTorles
      ? <ProtectedImage uri={IP.ipcim + regiKep} token={token} style={styles.avatar} />
      : <Ionicons name="person-circle" size={100} color="#aaa" />;

  return (
    <>
      <Pressable
        disabled={mentes}
        onPress={megnyitas}
        style={styles.profilGomb}
      >
        <Ionicons name="create-outline" size={22} color="#333" />
        <Text style={styles.profilGombSzoveg}>Profil szerkesztése</Text>
      </Pressable>

      <Modal
        visible={nyitva}
        animationType="slide"
        onRequestClose={() => !mentes && setNyitva(false)}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.kartya}>
            <Text style={styles.cim}>Profil szerkesztése</Text>

            <Pressable
              onPress={() => setKepNagy(true)}
              disabled={!nagyKepUri}
              accessibilityRole="button"
              accessibilityLabel="Profilkép nagyítása"
            >
              {kep}
            </Pressable>

            <Pressable onPress={kepKivalasztasa} disabled={mentes}>
              <Text style={styles.kepFelirat}>
                {profilkep ? 'Kép cseréje' : 'Profilkép módosítása'}
              </Text>
            </Pressable>

            {(profilkep || (regiKep && !kepTorles)) && (
              <Button
                title="Profilkép eltávolítása"
                onPress={() => {
                  setProfilkep(null);
                  setKepTorles(true);
                }}
              />
            )}



            <Pressable
              style={styles.valaszto}
              onPress={() => setNyitottLista('varmegye')}
            >
              <Text style={lakhely ? styles.valasztottSzoveg : styles.helyorzo}>
                {lakhely || 'Település kiválasztása (választható)'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#555" />
            </Pressable>

            <Pressable
              style={styles.valaszto}
              onPress={() => setNyitottLista('eletkor')}
            >
              <Text style={eletkor ? styles.valasztottSzoveg : styles.helyorzo}>
                {eletkor ? `${eletkor} éves` : 'Életkor kiválasztása (18–80)'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#555" />
            </Pressable>

            <Button
              title={mentes ? 'Mentés...' : 'Mentés'}
              onPress={mentesProfil}
              disabled={mentes}
            />
            <Button
              title="Mégse"
              onPress={() => setNyitva(false)}
              disabled={mentes}
            />
          </View>
        </ScrollView>

        <Modal
          visible={kepNagy && Boolean(nagyKepUri)}
          animationType="fade"
          onRequestClose={() => setKepNagy(false)}
        >
          <View style={{
            flex: 1,
            backgroundColor: '#111',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {nagyKepUri && (
              profilkep ? (
                <Image
                  source={{ uri: nagyKepUri }}
                  resizeMode="contain"
                  style={{ width: width * 0.94, height: height * 0.8 }}
                />
              ) : (
                <ProtectedImage
                  uri={nagyKepUri}
                  token={token}
                  resizeMode="contain"
                  style={{ width: width * 0.94, height: height * 0.8 }}
                />
              )
            )}

           <Pressable
  onPress={() => {
    console.log('Saját kép nagyítás:', nagyKepUri);
    setKepNagy(true);
  }}
  disabled={!nagyKepUri}
  style={{ width: 100, height: 100 }}
  accessibilityRole="button"
  accessibilityLabel="Profilkép nagyítása"
>
  <View pointerEvents="none">
    {kep}
  </View>
</Pressable>
          </View>
        </Modal>

        <Modal
          visible={nyitottLista !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setNyitottLista(null)}
        >
          <View style={styles.modalHatter}>
            <View style={styles.modalKartya}>
              <Text style={styles.modalCim}>
                {nyitottLista === 'varmegye'
                  ? 'Vármegye kiválasztása'
                  : nyitottLista === 'telepules'
                    ? `${valasztottVarmegye} · Település`
                    : 'Életkor kiválasztása'}
              </Text>

              {nyitottLista === 'telepules' && (
                <TextInput
                  placeholder="Település keresése"
                  value={telepulesKereses}
                  onChangeText={setTelepulesKereses}
                  style={styles.input}
                />
              )}

              {nyitottLista === 'varmegye' ? (
                <FlatList
                  data={varmegyeLista}
                  keyExtractor={item => item}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.listaElem}
                      onPress={() => {
                        setValasztottVarmegye(item);
                        setTelepulesKereses('');
                        setNyitottLista('telepules');
                      }}
                    >
                      <Text>{item}</Text>
                    </Pressable>
                  )}
                />
              ) : nyitottLista === 'telepules' ? (
                <FlatList
                  data={szurtTelepulesek}
                  keyExtractor={item => `${item.varmegye}-${item.nev}`}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.listaElem}
                      onPress={() => {
                        setLakhely(item.nev);
                        setNyitottLista(null);
                        setTelepulesKereses('');
                      }}
                    >
                      <Text>{item.nev}</Text>
                    </Pressable>
                  )}
                  ListEmptyComponent={<Text>Nincs találat.</Text>}
                />
              ) : (
                <FlatList
                  data={eletkorok}
                  keyExtractor={item => String(item)}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.listaElem}
                      onPress={() => {
                        setEletkor(String(item));
                        setNyitottLista(null);
                      }}
                    >
                      <Text>{item} éves</Text>
                    </Pressable>
                  )}
                />
              )}

              <Pressable
                style={styles.listaElem}
                onPress={() => {
                  if (nyitottLista === 'eletkor') setEletkor('');
                  else {
                    setLakhely('');
                    setValasztottVarmegye('');
                    setTelepulesKereses('');
                  }
                  setNyitottLista(null);
                }}
              >
              </Pressable>

              {nyitottLista === 'telepules' && (
                <Button
                  title="Vissza a vármegyékhez"
                  onPress={() => setNyitottLista('varmegye')}
                />
              )}
              <Button title="Bezárás" onPress={() => setNyitottLista(null)} />
            </View>
          </View>
        </Modal>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  kartya: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  cim: { fontSize: 25, fontWeight: 'bold', marginBottom: 16 },
  cimke: { fontSize: 16, marginTop: 20, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#bbb', padding: 12, marginBottom: 12, borderRadius: 8 },
  profilGomb: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingVertical: 10 },
  profilGombSzoveg: { fontSize: 17, marginLeft: 10 },
  avatarResz: { alignItems: 'center', marginBottom: 14 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  kepFelirat: { color: '#2678ba', marginTop: 6 },
  nemGomb: { padding: 10, borderWidth: 1, borderColor: '#bbb', borderRadius: 20, marginRight: 8, marginBottom: 8 },
  nemAktiv: { backgroundColor: '#2678ba', borderColor: '#2678ba' },
  nemAktivSzoveg: { color: '#fff' },
  valaszto: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#bbb', borderRadius: 8, padding: 12, marginBottom: 12 },
  helyorzo: { color: '#777', flex: 1 },
  valasztottSzoveg: { fontSize: 16, flex: 1 },
  modalHatter: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 18 },
  modalKartya: { backgroundColor: '#fff', borderRadius: 12, padding: 16, height: '75%', maxWidth: 600, width: '100%', alignSelf: 'center' },
  modalCim: { fontSize: 20, fontWeight: 'bold', marginBottom: 14 },
  listaElem: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#eee' }
});