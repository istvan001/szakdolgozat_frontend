import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Modal,
  FlatList,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import ProtectedImage from './ProtectedImage';

const IP = require('./ipcim');
const telepulesek = require('./telepulesek.json');

const varmegyeLista = [...new Set(telepulesek.map(x => x.varmegye))]
  .sort((a, b) => a.localeCompare(b, 'hu'));

const eletkorok = Array.from({ length: 63 }, (_, i) => i + 18);

const keresheto = ertek => ertek.toLocaleLowerCase('hu')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

export default function ProfilSzerkesztes({
  token,
  felhasznaloId,
  onMentve
}) {
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
  const [kepNagy, setKepNagy] = useState(false);

  const zar = useRef(false);
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
      setKepNagy(false);
      setNyitottLista(null);
      setNyitva(true);
    } catch (error) {
      Alert.alert(
        'Hiba',
        error.message || 'Nem sikerült betölteni a profilt.'
      );
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
      Alert.alert(
        'Hiba',
        error.message || 'Nem sikerült elmenteni a profilt.'
      );
    } finally {
      zar.current = false;
      setMentes(false);
    }
  };

  const kep = profilkep
    ? <Image source={{ uri: profilkep.uri }} style={styles.avatar} />
    : regiKep && !kepTorles
      ? (
        <ProtectedImage
          uri={IP.ipcim + regiKep}
          token={token}
          style={styles.avatar}
        />
      )
      : <Ionicons name="person-outline" size={54} color="#008D99" />;

  return (
    <>
      <Pressable
        disabled={mentes}
        onPress={megnyitas}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.profilGomb,
          (pressed || mentes) && styles.halvany
        ]}
      >
        <View style={styles.menuIkon}>
          <Ionicons name="create-outline" size={22} color="#008D99" />
        </View>
        <Text style={styles.profilGombSzoveg}>Profil szerkesztése</Text>
        {mentes ? (
          <ActivityIndicator color="#008D99" />
        ) : (
          <Ionicons name="chevron-forward" size={18} color="#77828D" />
        )}
      </Pressable>

      <Modal
        visible={nyitva}
        animationType="slide"
        onRequestClose={() => !mentes && setNyitva(false)}
      >
        <SafeAreaView style={styles.oldal}>
          <KeyboardAvoidingView
            style={styles.kitolt}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              contentContainerStyle={styles.container}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.kartya}>
                <View style={styles.fejlec}>
                  <View style={styles.fejlecIkon}>
                    <Ionicons
                      name="person-outline"
                      size={25}
                      color="#008D99"
                    />
                  </View>
                  <Pressable
                    onPress={() => setNyitva(false)}
                    disabled={mentes}
                    accessibilityRole="button"
                    accessibilityLabel="Profil szerkesztésének bezárása"
                    style={styles.bezaroGomb}
                  >
                    <Ionicons name="close" size={24} color="#52606D" />
                  </Pressable>
                </View>

                <Text style={styles.cim}>Profil szerkesztése</Text>
                <Text style={styles.leiras}>
                  Frissítsd a képedet és a személyes adataidat.
                </Text>

                <View style={styles.avatarResz}>
                  <Pressable
                    onPress={() => setKepNagy(true)}
                    disabled={!nagyKepUri}
                    accessibilityRole="button"
                    accessibilityLabel="Profilkép nagyítása"
                    style={styles.avatarKeret}
                  >
                    <View pointerEvents="none">
                      {kep}
                    </View>
                    {nagyKepUri ? (
                      <View style={styles.nagyitasJel}>
                        <Ionicons name="expand-outline" size={16} color="#fff" />
                      </View>
                    ) : null}
                  </Pressable>

                  <Pressable
                    onPress={kepKivalasztasa}
                    disabled={mentes}
                    accessibilityRole="button"
                    style={styles.kepGomb}
                  >
                    <Ionicons name="camera-outline" size={19} color="#008D99" />
                    <Text style={styles.kepFelirat}>
                      {profilkep ? 'Kép cseréje' : 'Profilkép módosítása'}
                    </Text>
                  </Pressable>

                  {(profilkep || (regiKep && !kepTorles)) && (
                    <Pressable
                      disabled={mentes}
                      accessibilityRole="button"
                      onPress={() => {
                        setProfilkep(null);
                        setKepTorles(true);
                      }}
                      style={styles.kepTorlesGomb}
                    >
                      <Ionicons name="trash-outline" size={16} color="#B74444" />
                      <Text style={styles.kepTorlesSzoveg}>
                        Profilkép eltávolítása
                      </Text>
                    </Pressable>
                  )}
                </View>

                <Text style={styles.cimke}>Település</Text>
                <Pressable
                  style={styles.valaszto}
                  disabled={mentes}
                  onPress={() => setNyitottLista('varmegye')}
                  accessibilityRole="button"
                >
                  <Ionicons name="location-outline" size={21} color="#008D99" />
                  <Text style={[
                    styles.valasztottSzoveg,
                    !lakhely && styles.helyorzo
                  ]}>
                    {lakhely || 'Település kiválasztása'}
                  </Text>
                  <Ionicons name="chevron-down" size={19} color="#77828D" />
                </Pressable>

                <Text style={styles.cimke}>Életkor</Text>
                <Pressable
                  style={styles.valaszto}
                  disabled={mentes}
                  onPress={() => setNyitottLista('eletkor')}
                  accessibilityRole="button"
                >
                  <Ionicons name="calendar-outline" size={21} color="#008D99" />
                  <Text style={[
                    styles.valasztottSzoveg,
                    !eletkor && styles.helyorzo
                  ]}>
                    {eletkor ? `${eletkor} éves` : 'Életkor kiválasztása (18–80)'}
                  </Text>
                  <Ionicons name="chevron-down" size={19} color="#77828D" />
                </Pressable>

                <Pressable
                  onPress={mentesProfil}
                  disabled={mentes}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.foGomb,
                    (pressed || mentes) && styles.halvany
                  ]}
                >
                  {mentes ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Ionicons name="checkmark-outline" size={22} color="#fff" />
                  )}
                  <Text style={styles.foGombSzoveg}>
                    {mentes ? 'Mentés...' : 'Változtatások mentése'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setNyitva(false)}
                  disabled={mentes}
                  accessibilityRole="button"
                  style={styles.masodlagosGomb}
                >
                  <Text style={styles.masodlagosSzoveg}>Mégse</Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>

        <Modal
          visible={kepNagy && Boolean(nagyKepUri)}
          animationType="fade"
          onRequestClose={() => setKepNagy(false)}
        >
          <SafeAreaView style={styles.nagyKepHatter}>
            <View style={styles.nagyKepFejlec}>
              <Pressable
                onPress={() => setKepNagy(false)}
                accessibilityRole="button"
                accessibilityLabel="Nagy kép bezárása"
                style={styles.nagyKepBezaras}
              >
                <Ionicons name="close" size={24} color="#fff" />
                <Text style={styles.nagyKepSzoveg}>Bezárás</Text>
              </Pressable>
            </View>
            <View style={styles.nagyKepTartalom}>
              {nagyKepUri && (
                profilkep ? (
                  <Image
                    source={{ uri: nagyKepUri }}
                    resizeMode="contain"
                    style={{ width: width * 0.94, height: height * 0.75 }}
                  />
                ) : (
                  <ProtectedImage
                    uri={nagyKepUri}
                    token={token}
                    resizeMode="contain"
                    style={{ width: width * 0.94, height: height * 0.75 }}
                  />
                )
              )}
            </View>
          </SafeAreaView>
        </Modal>

        <Modal
          visible={nyitottLista !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setNyitottLista(null)}
        >
          <KeyboardAvoidingView
            style={styles.modalHatter}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={[
              styles.modalKartya,
              { height: Math.min(height * 0.75, 620) }
            ]}>
              <View style={styles.listaFejlec}>
                <Text style={styles.modalCim}>
                  {nyitottLista === 'varmegye'
                    ? 'Vármegye kiválasztása'
                    : nyitottLista === 'telepules'
                      ? `${valasztottVarmegye} · Település`
                      : 'Életkor kiválasztása'}
                </Text>
                <Pressable
                  onPress={() => setNyitottLista(null)}
                  style={styles.bezaroGomb}
                  accessibilityRole="button"
                  accessibilityLabel="Lista bezárása"
                >
                  <Ionicons name="close" size={23} color="#52606D" />
                </Pressable>
              </View>

              {nyitottLista === 'telepules' && (
                <View style={styles.kereso}>
                  <Ionicons name="search-outline" size={21} color="#008D99" />
                  <TextInput
                    placeholder="Település keresése"
                    placeholderTextColor="#77828D"
                    value={telepulesKereses}
                    onChangeText={setTelepulesKereses}
                    style={styles.input}
                    autoCorrect={false}
                  />
                </View>
              )}

              {nyitottLista === 'varmegye' ? (
                <FlatList
                  style={styles.kitolt}
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
                      <Text style={styles.listaSzoveg}>{item}</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="#77828D"
                      />
                    </Pressable>
                  )}
                />
              ) : nyitottLista === 'telepules' ? (
                <FlatList
                  style={styles.kitolt}
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
                      <Text style={styles.listaSzoveg}>{item.nev}</Text>
                      {lakhely === item.nev && (
                        <Ionicons name="checkmark" size={20} color="#008D99" />
                      )}
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.uresLista}>Nincs találat.</Text>
                  }
                />
              ) : (
                <FlatList
                  style={styles.kitolt}
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
                      <Text style={styles.listaSzoveg}>{item} éves</Text>
                      {Number(eletkor) === item && (
                        <Ionicons name="checkmark" size={20} color="#008D99" />
                      )}
                    </Pressable>
                  )}
                />
              )}

              <Pressable
                style={styles.masodlagosGomb}
                onPress={() => {
                  if (nyitottLista === 'eletkor') {
                    setEletkor('');
                  } else {
                    setLakhely('');
                    setValasztottVarmegye('');
                    setTelepulesKereses('');
                  }
                  setNyitottLista(null);
                }}
              >
                <Text style={styles.masodlagosSzoveg}>Nincs megadva</Text>
              </Pressable>

              {nyitottLista === 'telepules' && (
                <Pressable
                  style={styles.masodlagosGomb}
                  onPress={() => setNyitottLista('varmegye')}
                >
                  <Text style={styles.masodlagosSzoveg}>
                    Vissza a vármegyékhez
                  </Text>
                </Pressable>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  kitolt: { flex: 1 },
  halvany: { opacity: 0.65 },
  oldal: { flex: 1, backgroundColor: '#F5F7F8' },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20
  },
  kartya: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24
  },
  fejlec: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  fejlecIkon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#EAF7F8',
    alignItems: 'center',
    justifyContent: 'center'
  },
  bezaroGomb: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F5F7F8',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cim: { fontSize: 26, fontWeight: '700', color: '#17212B' },
  leiras: {
    fontSize: 14,
    lineHeight: 22,
    color: '#77828D',
    marginTop: 8,
    marginBottom: 24
  },
  profilGomb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10
  },
  menuIkon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EAF7F8',
    alignItems: 'center',
    justifyContent: 'center'
  },
  profilGombSzoveg: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#17212B'
  },
  avatarResz: { alignItems: 'center', marginBottom: 26 },
  avatarKeret: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EAF7F8',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatar: { width: 112, height: 112, borderRadius: 56 },
  nagyitasJel: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#008D99',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  kepGomb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#EAF7F8'
  },
  kepFelirat: { color: '#008D99', fontSize: 14, fontWeight: '600' },
  kepTorlesGomb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    marginTop: 4
  },
  kepTorlesSzoveg: { color: '#B74444', fontSize: 13 },
  cimke: {
    fontSize: 14,
    fontWeight: '600',
    color: '#52606D',
    marginBottom: 8
  },
  valaszto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E1E8EC',
    borderRadius: 14,
    backgroundColor: '#F8FAFB',
    padding: 15,
    marginBottom: 20,
    minHeight: 54
  },
  valasztottSzoveg: { fontSize: 15, flex: 1, color: '#17212B' },
  helyorzo: { color: '#77828D' },
  foGomb: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
    padding: 14,
    borderRadius: 15,
    backgroundColor: '#008D99',
    marginTop: 8
  },
  foGombSzoveg: { color: '#fff', fontSize: 16, fontWeight: '700' },
  masodlagosGomb: {
    minHeight: 46,
    padding: 12,
    marginTop: 10,
    borderRadius: 13,
    backgroundColor: '#EAF7F8',
    alignItems: 'center',
    justifyContent: 'center'
  },
  masodlagosSzoveg: { color: '#008D99', fontSize: 14, fontWeight: '600' },
  modalHatter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(23,33,43,0.55)',
    padding: 20
  },
  modalKartya: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    maxWidth: 520,
    width: '100%',
    flexShrink: 1
  },
  listaFejlec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16
  },
  modalCim: { flex: 1, fontSize: 20, fontWeight: '700', color: '#17212B' },
  kereso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F7F8',
    borderRadius: 13,
    paddingHorizontal: 12,
    marginBottom: 12
  },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: '#17212B' },
  listaElem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F4'
  },
  listaSzoveg: { flex: 1, fontSize: 15, color: '#17212B' },
  uresLista: { color: '#77828D', textAlign: 'center', padding: 24 },
  nagyKepHatter: { flex: 1, backgroundColor: '#111' },
  nagyKepFejlec: { alignItems: 'flex-end', padding: 16 },
  nagyKepBezaras: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10
  },
  nagyKepSzoveg: { color: '#fff', fontSize: 16 },
  nagyKepTartalom: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});