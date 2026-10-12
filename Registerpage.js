import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Platform,
  Modal,
  FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';

const IP = require('./ipcim');
const telepulesek = require('./telepulesek.json');


const varmegyeLista = [...new Set(telepulesek.map(hely => hely.varmegye))]
  .sort((a, b) => a.localeCompare(b, 'hu'));

const nemek = ['Nő', 'Férfi', 'Egyéb'];
const eletkorok = Array.from({ length: 63 }, (_, index) => index + 18);

const keresheto = ertek => ertek
  .toLocaleLowerCase('hu')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

function Button({ title, onPress, disabled }) {
  const masodlagos =
    title.startsWith('Vissza') ||
    title === 'Bezárás' ||
    title === 'Új kód küldése' ||
    title === 'Belépési adatok módosítása' ||
    title === 'Profilkép eltávolítása';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.gomb,
        masodlagos && styles.masodlagosGomb,
        (pressed || disabled) && { opacity: 0.5 }
      ]}
    >
      <Text
        style={[
          styles.gombSzoveg,
          masodlagos && styles.masodlagosGombSzoveg
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export default function Registerpage() {
  const navigation = useNavigation();
  const [lepes, setLepes] = useState(1);
  const [kod, setKod] = useState('');
  const [regisztracioId, setRegisztracioId] = useState(null);
  const [igazolasToken, setIgazolasToken] = useState(null);
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
  const fejlecMagassag = useHeaderHeight();


  const szurtTelepulesek = useMemo(() => {
    const keresett = keresheto(telepulesKereses.trim());

    return telepulesek.filter(hely =>
      hely.varmegye === valasztottVarmegye &&
      (!keresett || keresheto(hely.nev).includes(keresett))
    );
  }, [telepulesKereses, valasztottVarmegye]);

  const jelzes = (cim, szoveg) => {
    if (Platform.OS === 'web') {
      window.alert(`${cim}: ${szoveg}`);
    } else {
      Alert.alert(cim, szoveg);
    }
  };

  const tovabb = async () => {
    if (mentes) return;

    if (!username.trim() || !email.trim() || !password) {
      jelzes(
        'Hiányzó adat',
        'Add meg a felhasználónevet, az e-mail-címet és a jelszót.'
      );
      return;
    }

    if (password !== passwordMegerosites) {
      jelzes('Jelszóhiba', 'A két jelszó nem egyezik meg.');
      return;
    }

    setMentes(true);

    try {
      const response = await fetch(IP.ipcim + '/regisztracio-kod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Felhasznalo: username.trim(),
          Email: email.trim(),
          Jelszo: password,
          JelszoUjra: passwordMegerosites
        })
      });

      if (!response.ok) {
        jelzes('Hiba', await response.text());
        return;
      }

      const adat = await response.json();
      setRegisztracioId(adat.regisztracioId);
      setIgazolasToken(null);
      setKod('');
      setLepes(2);
    } catch (error) {
      jelzes('Hálózati hiba', 'Nem sikerült elérni a szervert.');
    } finally {
      setMentes(false);
    }
  };

  const kodEllenorzes = async () => {
    if (mentes) return;
    setMentes(true);

    try {
      const response = await fetch(IP.ipcim + '/regisztracio-ellenorzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regisztracioId, kod })
      });

      if (!response.ok) {
        jelzes('Hiba', await response.text());
        return;
      }

      const adat = await response.json();
      setIgazolasToken(adat.igazolasToken);
      setLepes(3);
    } catch (error) {
      jelzes('Hálózati hiba', 'Nem sikerült elérni a szervert.');
    } finally {
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
      }
    } catch (error) {
      jelzes('Hiba', 'Nem sikerült kiválasztani a képet.');
    }
  };

  const handleRegister = async () => {
    if (mentes || sikeres) return;

    if (!password || password !== passwordMegerosites) {
      jelzes('Jelszóhiba', 'A két jelszó nem egyezik meg.');
      setLepes(1);
      return;
    }

    if (!nemek.includes(nem)) {
      jelzes('Hiányzó adat', 'Válaszd ki a nemedet.');
      return;
    }

    if (!lakhely.trim()) {
      jelzes('Hiányzó adat', 'Válaszd ki a településedet.');
      return;
    }

    if (!eletkor.trim()) {
      jelzes('Hiányzó adat', 'Válaszd ki az életkorodat.');
      return;
    }

    const kor = Number(eletkor);

    if (!Number.isInteger(kor) || kor < 18 || kor > 80) {
      jelzes('Hibás életkor', '18 és 80 közötti életkort válassz.');
      return;
    }

    setMentes(true);

    try {
      const response = await fetch(IP.ipcim + '/szemelyfelvi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Felhasznalo: username.trim(),
          Email: email.trim(),
          Jelszo: password,
          regisztracioId,
          igazolasToken,
          nem,
          lakhely: lakhely.trim(),
          eletkor: kor,
          profilkepBase64: profilkep?.base64 || null
        })
      });

      if (!response.ok) {
        const hiba = await response.text();
        jelzes('Hiba', hiba || 'Nem sikerült regisztrálni.');
        return;
      }

      setSikeres(true);

      if (Platform.OS === 'web') {
        window.alert('Sikeres regisztráció! Most már bejelentkezhetsz.');
        navigation.navigate('Login');
      } else {
        Alert.alert('Sikeres regisztráció', 'Most már bejelentkezhetsz.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]);
      }
    } catch (error) {
      jelzes('Hálózati hiba', 'Nem sikerült csatlakozni a szerverhez.');
    } finally {
      setMentes(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F5F7F8' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={fejlecMagassag}
      keyboardDismissMode="on-drag"
    >
      <ScrollView
        style={styles.oldal}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.kartya}>
          <View style={styles.fejlec}>
            <View style={styles.logo}>
              <Ionicons name="person-add-outline" size={32} color="#008D99" />
            </View>
            <Text style={styles.marka}>Randotalk</Text>
          </View>

          <View style={styles.lepesJelzes}>
            {[1, 2, 3].map(szam => (
              <View
                key={szam}
                style={[
                  styles.lepesVonal,
                  szam <= lepes && styles.lepesAktiv
                ]}
              />
            ))}
          </View>

          <Text style={styles.cim}>
            {lepes === 1
              ? 'Regisztráció'
              : lepes === 2
                ? 'E-mail megerősítése'
                : 'Adatok rólad'}
          </Text>

          <Text style={styles.leiras}>
            {lepes === 1
              ? '1 / 3 · Belépési adatok'
              : lepes === 2
                ? '2 / 3 · Hitelesítő kód'
                : '3 / 3 · A nem, a település és az életkor megadása kötelező'}
          </Text>

          {lepes === 1 ? (
            <>
              <TextInput
                placeholder="Felhasználónév"
                placeholderTextColor="#929CA5"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Felhasználónév"
              />

              <TextInput
                placeholder="E-mail-cím"
                placeholderTextColor="#929CA5"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="E-mail-cím"
              />

              <View style={styles.jelszoMezo}>
                <TextInput
                  placeholder="Jelszó"
                  placeholderTextColor="#929CA5"
                  secureTextEntry={!jelszoLathato}
                  value={password}
                  onChangeText={setPassword}
                  style={styles.jelszoInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Jelszó"
                />
                <Pressable
                  onPress={() => setJelszoLathato(!jelszoLathato)}
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
                    size={24}
                    color="#77828D"
                  />
                </Pressable>
              </View>

              <View style={styles.jelszoMezo}>
                <TextInput
                  placeholder="Jelszó újra"
                  placeholderTextColor="#929CA5"
                  secureTextEntry={!megerositesLathato}
                  value={passwordMegerosites}
                  onChangeText={setPasswordMegerosites}
                  style={styles.jelszoInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Jelszó megerősítése"
                />
                <Pressable
                  onPress={() => setMegerositesLathato(!megerositesLathato)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    megerositesLathato
                      ? 'Megerősítő jelszó elrejtése'
                      : 'Megerősítő jelszó megjelenítése'
                  }
                  style={styles.szemGomb}
                >
                  <Ionicons
                    name={megerositesLathato ? 'eye-off-outline' : 'eye-outline'}
                    size={24}
                    color="#77828D"
                  />
                </Pressable>
              </View>

              {passwordMegerosites && password !== passwordMegerosites ? (
                <Text style={styles.hiba}>A két jelszó nem egyezik meg.</Text>
              ) : null}

              <Button
                title={mentes ? 'Kód küldése...' : 'Tovább'}
                onPress={tovabb}
                disabled={
                  mentes ||
                  !username.trim() ||
                  !email.trim() ||
                  !password ||
                  password !== passwordMegerosites
                }
              />
            </>
          ) : lepes === 2 ? (
            <>
              <Text style={styles.leiras}>
                Elküldtük a 8 számjegyű kódot erre a címre: {email.trim()}.
                {' '}A kód 10 percig érvényes.
              </Text>

              <TextInput
                placeholder="Hitelesítő kód"
                placeholderTextColor="#929CA5"
                value={kod}
                onChangeText={setKod}
                style={styles.input}
                keyboardType="number-pad"
                maxLength={8}
                accessibilityLabel="Hitelesítő kód"
              />

              <Button
                title={mentes ? 'Ellenőrzés...' : 'Tovább'}
                onPress={kodEllenorzes}
                disabled={mentes || !/^\d{8}$/.test(kod)}
              />

              <Button
                title="Új kód küldése"
                onPress={tovabb}
                disabled={mentes}
              />

              <Button
                title="Belépési adatok módosítása"
                onPress={() => {
                  setIgazolasToken(null);
                  setLepes(1);
                }}
                disabled={mentes}
              />
            </>
          ) : (
            <>
              <Pressable
                style={styles.avatarResz}
                onPress={kepKivalasztasa}
                accessibilityRole="button"
                accessibilityLabel="Profilkép kiválasztása"
              >
                {profilkep ? (
                  <Image source={{ uri: profilkep.uri }} style={styles.avatar} />
                ) : (
                  <Ionicons name="person-circle" size={100} color="#8CBCC1" />
                )}
                <Text style={styles.kepFelirat}>
                  {profilkep
                    ? 'Kép cseréje'
                    : 'Profilkép hozzáadása (választható)'}
                </Text>
              </Pressable>

              {profilkep && (
                <Button
                  title="Profilkép eltávolítása"
                  onPress={() => setProfilkep(null)}
                />
              )}

              <Text style={styles.cimke}>Nem (kötelező)</Text>

              <View style={styles.nemek}>
                {nemek.map(ertek => (
                  <Pressable
                    key={ertek}
                    style={[
                      styles.nemGomb,
                      nem === ertek && styles.nemAktiv
                    ]}
                    onPress={() => setNem(ertek)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: nem === ertek }}
                  >
                    <Text
                      style={[
                        styles.nemSzoveg,
                        nem === ertek && styles.nemAktivSzoveg
                      ]}
                    >
                      {ertek}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={styles.valaszto}
                onPress={() => setNyitottLista('varmegye')}
                accessibilityRole="button"
              >
                <Text
                  style={lakhely ? styles.valasztottSzoveg : styles.helyorzo}
                >
                  {lakhely || 'Település kiválasztása (kötelező)'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#77828D" />
              </Pressable>

              <Pressable
                style={styles.valaszto}
                onPress={() => setNyitottLista('eletkor')}
                accessibilityRole="button"
              >
                <Text
                  style={eletkor ? styles.valasztottSzoveg : styles.helyorzo}
                >
                  {eletkor
                    ? `${eletkor} éves`
                    : 'Életkor kiválasztása (18–80, kötelező)'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#77828D" />
              </Pressable>

              <View style={styles.gombok}>
                <Button
                  title="Vissza"
                  onPress={() => setLepes(1)}
                  disabled={mentes}
                />
                <Button
                  title={mentes ? 'Mentés...' : 'Regisztráció befejezése'}
                  onPress={handleRegister}
                  disabled={mentes || sikeres}
                />
              </View>
            </>
          )}
        </View>

        <Modal
          visible={nyitottLista !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setNyitottLista(null)}
        >
          <View style={styles.modalHatter}>
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={() => setNyitottLista(null)}
              accessibilityLabel="Lista bezárása"
            />
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
                  placeholderTextColor="#929CA5"
                  value={telepulesKereses}
                  onChangeText={setTelepulesKereses}
                  style={styles.input}
                  autoFocus
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
                      <Text style={styles.listaSzoveg}>{item}</Text>
                    </Pressable>
                  )}
                />
              ) : nyitottLista === 'telepules' ? (
                <FlatList
                  data={szurtTelepulesek}
                  keyExtractor={item => `${item.varmegye}-${item.nev}`}
                  keyboardShouldPersistTaps="handled"
                  initialNumToRender={20}
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
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.uresLista}>Nincs találat.</Text>
                  }
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
                      <Text style={styles.listaSzoveg}>{item} éves</Text>
                    </Pressable>
                  )}
                />
              )}

              {nyitottLista === 'telepules' && (
                <Button
                  title="Vissza a vármegyékhez"
                  onPress={() => setNyitottLista('varmegye')}
                />
              )}

              <Button
                title="Bezárás"
                onPress={() => setNyitottLista(null)}
              />
            </View>
          </View>
        </Modal>
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
  kartya: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#263B45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2
  },
  fejlec: {
    alignItems: 'center',
    marginBottom: 24
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF7F8',
    marginBottom: 12
  },
  marka: {
    fontSize: 27,
    fontWeight: '700',
    color: '#17212B'
  },
  lepesJelzes: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24
  },
  lepesVonal: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E4EAED'
  },
  lepesAktiv: {
    backgroundColor: '#008D99'
  },
  cim: {
    fontSize: 23,
    fontWeight: '700',
    color: '#17212B',
    marginBottom: 8
  },
  leiras: {
    fontSize: 14,
    lineHeight: 21,
    color: '#77828D',
    marginBottom: 22
  },
  cimke: {
    fontSize: 14,
    fontWeight: '600',
    color: '#52606D',
    marginTop: 16,
    marginBottom: 10
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#E4EAED',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    borderRadius: 14,
    fontSize: 16,
    color: '#17212B',
    backgroundColor: '#F8FAFB'
  },
  jelszoMezo: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#E4EAED',
    borderRadius: 14,
    marginBottom: 14,
    backgroundColor: '#F8FAFB'
  },
  jelszoInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#17212B'
  },
  szemGomb: {
    padding: 12
  },
  hiba: {
    color: '#B00020',
    fontSize: 13,
    marginBottom: 12
  },
  gomb: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#008D99'
  },
  gombSzoveg: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center'
  },
  masodlagosGomb: {
    backgroundColor: '#EAF7F8'
  },
  masodlagosGombSzoveg: {
    color: '#008D99'
  },
  valaszto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#E4EAED',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    backgroundColor: '#F8FAFB'
  },
  helyorzo: {
    flex: 1,
    fontSize: 14,
    color: '#77828D',
    marginRight: 8
  },
  valasztottSzoveg: {
    flex: 1,
    fontSize: 16,
    color: '#17212B',
    marginRight: 8
  },
  modalHatter: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(23,33,43,0.45)',
    padding: 24
  },
  modalKartya: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    height: '75%',
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center'
  },
  modalCim: {
    fontSize: 20,
    fontWeight: '700',
    color: '#17212B',
    marginBottom: 18
  },
  listaElem: {
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EAF0F2'
  },
  listaSzoveg: {
    fontSize: 15,
    color: '#17212B'
  },
  uresLista: {
    textAlign: 'center',
    marginTop: 20,
    color: '#77828D'
  },
  avatarResz: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: '#EAF7F8'
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50
  },
  kepFelirat: {
    color: '#008D99',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10
  },
  nemek: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14
  },
  nemGomb: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E4EAED',
    borderRadius: 22,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#F8FAFB'
  },
  nemSzoveg: {
    color: '#52606D'
  },
  nemAktiv: {
    backgroundColor: '#008D99',
    borderColor: '#008D99'
  },
  nemAktivSzoveg: {
    color: '#fff'
  },
  gombok: {
    marginTop: 8
  }
});