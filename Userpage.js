import React, { useState, useCallback, useLayoutEffect, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Button,
  Alert,
  Modal,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  ScrollView
} from 'react-native';
import Slider from '@react-native-community/slider';
import ProfilSzerkesztes from './ProfilSzerkesztes';
import useOnlineAllapot from './useOnlineAllapot';
import { Ionicons } from '@expo/vector-icons';
import ProtectedImage from './ProtectedImage';
import PartnerAdatlap from './PartnerAdatlap';
import { ertesitesekInditasa, ertesitesekKijelentkezes, helyiErtesites } from './NotificationSupport';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';

const IP = require('./ipcim');
export default function User({ route, navigation }) {
  const { felhasznaloId, felhasznaloNev, token } = route.params;
  const adminNezet = route.params?.adminNezet === true;
  const authHeaders = { Authorization: `Bearer ${token}` };
  const [kereses, setKereses] = useState(false);
  const [frissites, setFrissites] = useState(false);
  const frissitesFolyamatban = useRef(false);
  const [beszelgetesek, setBeszelgetesek] = useState([]);
  const fokuszban = useIsFocused();
  const onlineAllapotok = useOnlineAllapot(
    token,
    beszelgetesek.map(item => item.partnerId),
    fokuszban
  );
  const [profil, setProfil] = useState(null);
  const [oldalsavNyitva, setOldalsavNyitva] = useState(false);
  const [ertesitesAllapot, setErtesitesAllapot] = useState('');
  const [tiltottakNyitva, setTiltottakNyitva] = useState(false);
  const [tiltottak, setTiltottak] = useState([]);
  const [tiltottakBetoltes, setTiltottakBetoltes] = useState(false);
  const [feloldasId, setFeloldasId] = useState(null);
  const [partnerBeallitasNyitva, setPartnerBeallitasNyitva] = useState(false);
  const [partnerBeallitasBetoltes, setPartnerBeallitasBetoltes] = useState(false);
  const [partnerBeallitasMentes, setPartnerBeallitasMentes] = useState(false);
  const [korMin, setKorMin] = useState('18');
  const [korMax, setKorMax] = useState('80');
  const [tavolsagKm, setTavolsagKm] = useState('50');
  const utolsoLatott = useRef(null);
  const betoltesFolyamatban = useRef(null);
  const [sajatKepNagy, setSajatKepNagy] = useState(false);
  const {
    width: ablakSzelesseg,
    height: ablakMagassag
  } = useWindowDimensions();
  useEffect(() => {
    let leallitva = false, stop;
    ertesitesekInditasa(token, navigation, felhasznaloId).then((eredmeny) => {
      stop = eredmeny.stop;
      if (leallitva) stop(); else setErtesitesAllapot(eredmeny.allapot);
    }).catch((error) => {
      console.error('Értesítési hiba:', error);
      if (!leallitva) setErtesitesAllapot('Nem sikerült beállítani az értesítéseket.');
    });
    return () => { leallitva = true; if (stop) stop(); };
  }, [token, felhasznaloId, navigation]);
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Randotalk',
      headerLeft: () => (
      <Pressable
          onPress={() => setOldalsavNyitva(true)}
          style={styles.fejlecAvatarGomb}
          accessibilityRole="button"
          accessibilityLabel="Profil és menü megnyitása"
        >
          {profil?.profilkep_url ? (
            <ProtectedImage uri={IP.ipcim + profil.profilkep_url} token={token} style={styles.fejlecAvatar} />
          ) : (
            <Ionicons name="person-circle" size={36} color="#888" />
          )}
        </Pressable>
      )
    });
  }, [navigation, profil?.profilkep_url]);
  const [profilTorlesFolyamatban, setProfilTorlesFolyamatban] = useState(false);
  const profilTorlesZar = useRef(false);
  const sajatProfilTorlese = () => Alert.alert(
    'Profil végleges törlése',
    'A fiókod, beszélgetéseid, képeid és kapcsolódó jelentéseid végleg törlődnek. A beszélgetések a partnereidnél is eltűnnek. Biztosan törlöd a profilodat?',
    [{ text: 'Mégse', style: 'cancel' }, {
      text: 'Végleges törlés', style: 'destructive', onPress: async () => {
        if (profilTorlesZar.current) return;
        profilTorlesZar.current = true;
        setProfilTorlesFolyamatban(true);
        try {
          const response = await fetch(IP.ipcim + '/sajat-fiok-torles', { method: 'POST', headers: authHeaders });
          if (!response.ok) throw new Error(await response.text());
          setOldalsavNyitva(false);
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          Alert.alert('Profil törölve', 'A fiókodat töröltük.');
        } catch (error) {
          Alert.alert('Törlés sikertelen', error.message || 'Próbáld újra később.');
          profilTorlesZar.current = false;
          setProfilTorlesFolyamatban(false);
        }
      }
    }]
  );
  const tiltottakBetoltese = async () => {
    setTiltottakBetoltes(true);
    try {
      const response = await fetch(IP.ipcim + '/tiltottak', { headers: authHeaders });
      if (!response.ok) throw new Error(await response.text());
      setTiltottak(await response.json());
    } catch (error) {
      Alert.alert('Hiba', error.message || 'Nem sikerült betölteni a tiltott felhasználókat.');
    } finally { setTiltottakBetoltes(false); }
  };

  const tiltottakMegnyitasa = async () => {
    setTiltottakNyitva(true);
    await tiltottakBetoltese();
  };

  const tiltasFeloldasa = (item) => Alert.alert(
    'Tiltás feloldása',
    `Feloldod ${item.Felhasznalo} tiltását? Ezután újra megjelenhet partnerként.`,
    [{ text: 'Mégse', style: 'cancel' }, {
      text: 'Feloldás', onPress: async () => {
        setFeloldasId(item.Id);
        try {
          const response = await fetch(IP.ipcim + '/tiltas-feloldasa', {
            method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ partnerId: item.Id })
          });
          if (!response.ok) throw new Error(await response.text());
          setTiltottak(elozo => elozo.filter(x => Number(x.Id) !== Number(item.Id)));
        } catch (error) { Alert.alert('Hiba', error.message || 'Nem sikerült feloldani a tiltást.'); }
        finally { setFeloldasId(null); }
      }
    }]
  );

  const partnerBeallitasMegnyitasa = async () => {
    setPartnerBeallitasNyitva(true);
    setPartnerBeallitasBetoltes(true);
    try {
      const response = await fetch(IP.ipcim + '/partner-beallitasok', { headers: authHeaders });
      if (!response.ok) throw new Error(await response.text());
      const adat = await response.json();
      setKorMin(String(adat.korMin ?? 18));
      setKorMax(String(adat.korMax ?? 80));
      setTavolsagKm(String(adat.tavolsagKm ?? 50));
    } catch (error) {
      Alert.alert('Hiba', error.message || 'Nem sikerült betölteni a keresési beállításokat.');
    } finally { setPartnerBeallitasBetoltes(false); }
  };

  const partnerBeallitasMentese = async () => {
    const min = Number(korMin), max = Number(korMax), tavolsag = Number(tavolsagKm);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 18 || max > 80 || min > max) {
      Alert.alert('Hibás korhatár', '18 és 80 év közötti tartományt adj meg, a minimum ne legyen nagyobb a maximumnál.');
      return;
    }
    if (!Number.isInteger(tavolsag) || tavolsag < 10 || tavolsag > 500) {
      Alert.alert('Hibás távolság', '10 és 500 km közötti távolságot válassz.');
      return;
    }

    setPartnerBeallitasMentes(true);
    try {
      const response = await fetch(IP.ipcim + '/partner-beallitasok', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ korMin: min, korMax: max, tavolsagKm: tavolsag })
      });
      if (!response.ok) throw new Error(await response.text());
      setPartnerBeallitasNyitva(false);
      Alert.alert('Mentve', 'A partnerkeresési beállításaidat elmentettük.');
    } catch (error) {
      Alert.alert('Hiba', error.message || 'Nem sikerült elmenteni a beállításokat.');
    } finally { setPartnerBeallitasMentes(false); }
  };



  const kijelentkezes = async () => {
    setOldalsavNyitva(false);
    try { await ertesitesekKijelentkezes(token); }
    catch (error) { console.error('Értesítési token törlési hiba:', error); }
    try {
      await fetch(IP.ipcim + '/logout', { method: 'POST', headers: authHeaders });
    } catch (error) {
      console.error('Kijelentkezési hálózati hiba:', error);
    }
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };
  const profilBetoltese = async () => {
    try {
      const response = await fetch(IP.ipcim + '/profil/' + felhasznaloId, { headers: authHeaders });
      if (response.ok) {
        const adat = await response.json();
        console.log('Saját profil:', adat);
        setProfil(adat);
      } else {
        console.error('Saját profil lekérési hiba:', response.status);
      }
    } catch (error) {
      console.error('Profil betöltési hiba:', error);
    }
  };
  // --------------------------------------------------
  // KORÁBBI BESZÉLGETÉSEK BETÖLTÉSE
  // --------------------------------------------------
  const beszelgetesekBetoltese = () => {
    if (betoltesFolyamatban.current) return betoltesFolyamatban.current;
    betoltesFolyamatban.current = (async () => {
      try {
        const response = await fetch(
          IP.ipcim + '/beszelgetesek/' + felhasznaloId,
          { headers: authHeaders }
        );
        if (!response.ok) {
          console.log(
            'Beszélgetések lekérése sikertelen'
          );
          return;
        }
        const data = await response.json();
        console.log(
          'Korábbi beszélgetések:',
          data
        );
        setBeszelgetesek(data);
        if (utolsoLatott.current && navigation.isFocused()) {
          for (const item of data) {
            if (Number(item.olvasatlan) > 0 && Number(item.utolsoKuldoId) !== Number(felhasznaloId) &&
              Number(item.utolsoUzenetId) > Number(utolsoLatott.current[item.talalkozasId] || 0))
              void helyiErtesites(item).catch((error) => console.error('Helyi értesítési hiba:', error));
          }
        }
        utolsoLatott.current = Object.fromEntries(data.map((item) => [item.talalkozasId, item.utolsoUzenetId]));
      } catch (error) {
        console.error(
          'Beszélgetések betöltési hiba:',
          error
        );
      } finally { betoltesFolyamatban.current = null; }
    })();
    return betoltesFolyamatban.current;
  };
  const oldalFrissitese = async () => {
    if (frissitesFolyamatban.current) return;
    frissitesFolyamatban.current = true;
    setFrissites(true);
    try {
      await Promise.all([beszelgetesekBetoltese(), profilBetoltese()]);
    } finally {
      frissitesFolyamatban.current = false;
      setFrissites(false);
    }
  };
  // --------------------------------------------------
  // MINDEN ALKALOMMAL FRISSÍTJÜK A LISTÁT,
  // AMIKOR VISSZALÉPÜNK A USER OLDALRA
  // --------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      beszelgetesekBetoltese();
      profilBetoltese();
      const timer = setInterval(beszelgetesekBetoltese, 5000);
      return () => clearInterval(timer);
    }, [felhasznaloId, token])
  );
  // --------------------------------------------------
  // VÉLETLENSZERŰ PARTNER KERESÉSE
  // --------------------------------------------------
  const partnerKereses = async () => {
    try {
      setKereses(true);
      const response = await fetch(
        IP.ipcim + '/random/' + felhasznaloId,
        { headers: authHeaders }
      );
      if (!response.ok) {
        const hiba = await response.text();
        Alert.alert(
          'Hiba',
          hiba
        );
        return;
      }
      const data = await response.json();
      console.log(
        'Talált partner:',
        data
      );
      // ------------------------------------------------
      // RÖGTÖN MEGNYITJUK A CHATET
      // ------------------------------------------------
      navigation.navigate('Chat', {
        // Új beszélgetésnél még nincs talalkozas ID
        talalkozasId: null,
        partnerId: data.partnerId,
        partnerNev: data.partnerNev,
        felhasznaloId: felhasznaloId,
        token
      });
    } catch (error) {
      console.error(
        'Partner keresési hiba:',
        error
      );
      Alert.alert(
        'Hiba',
        'Nem sikerült partnert keresni.'
      );
    } finally {
      setKereses(false);
    }
  };
  // --------------------------------------------------
  // KORÁBBI BESZÉLGETÉS MEGNYITÁSA
  // --------------------------------------------------
  const beszelgetesMegnyitasa = (item) => {
    navigation.navigate('Chat', {
      talalkozasId: item.talalkozasId,
      partnerId: item.partnerId,
      partnerNev: item.partnerNev,
      felhasznaloId: felhasznaloId,
      token
    });
  };
  // --------------------------------------------------
  // KÉPERNYŐ
  // --------------------------------------------------
  return (
    <View style={styles.container}>
      {/* -------------------------------------------- */}
      {/* PARTNER KERESÉSE */}
      {/* -------------------------------------------- */}
      {adminNezet ? (
      <Pressable
    onPress={() => navigation.navigate('Admin', {
      token,
      felhasznaloId,
      felhasznaloNev
    })}
    accessibilityRole="button"
    style={({ pressed }) => [
      styles.searchButton,
      pressed && { opacity: 0.75 }
    ]}
  >
    <Ionicons name="arrow-back" size={23} color="#fff" />
    <Text style={styles.searchButtonText}>Vissza az admin oldalra</Text>
  </Pressable>
) : (
  <Pressable
    onPress={partnerKereses}
    disabled={kereses}
    accessibilityRole="button"
    style={({ pressed }) => [
      styles.searchButton,
      (pressed || kereses) && { opacity: 0.75 }
    ]}
  >
    {kereses ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Ionicons name="search-outline" size={24} color="#fff" />
    )}
    <Text style={styles.searchButtonText}>
      {kereses ? 'Keresés...' : 'Partner keresése'}
    </Text>
  </Pressable>
)}
      {/* -------------------------------------------- */}
      {/* KORÁBBI BESZÉLGETÉSEK */}
      {/* -------------------------------------------- */}
      <Text style={styles.beszelgetesTitle}>Beszélgetések</Text>
      <FlatList
        extraData={onlineAllapotok}
        refreshing={frissites}
        onRefresh={oldalFrissitese}
        alwaysBounceVertical
        data={beszelgetesek}
        keyExtractor={(item) =>
          item.talalkozasId.toString()
        }
        ListEmptyComponent={
          <Text style={styles.nincsBeszelgetes}>
            Még nincs korábbi beszélgetés.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.beszelgetes,
              pressed &&
              styles.beszelgetesPressed
            ]}
            onPress={() =>
              beszelgetesMegnyitasa(item)
            }
          >
            <View style={styles.partnerInfo}>
              <View style={styles.partnerFejlec}>
                <PartnerAdatlap
                  partnerId={item.partnerId}
                  token={token}
                  kepUrl={item.partnerKepUrl}
                  online={onlineAllapotok[item.partnerId] === true}
                />
                <View style={styles.partnerSzovegek}>
                  {/* PARTNER NEVE */}
                  <View style={styles.partnerNevSor}>
                    <Text style={styles.partnerNev} numberOfLines={1}>
                      {item.partnerNev}
                    </Text>
                    {Number(item.olvasatlan) > 0 && (
                      <View style={styles.olvasatlanJelzes}>
                        <Text style={styles.olvasatlanSzam}>
                          {item.olvasatlan}
                        </Text>
                      </View>
                    )}
                  </View>
                  {/* LEGUTOLSÓ ÜZENET */}
                  <Text style={styles.utolsoUzenet} numberOfLines={1}>
                    {item.utolsoUzenet}
                    {Number(item.utolsoKuldoId) === Number(felhasznaloId) &&
                      Number(item.utolsoOlvasott) === 1 &&
                      Number(item.utolsoVisszavont) !== 1
                      ? ' – Látta'
                      : ''}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        )}
      />
      {oldalsavNyitva && (
        <View style={styles.oldalsavReteg}>
          <Pressable
            style={styles.oldalsavHatter}
            onPress={() => setOldalsavNyitva(false)}
            accessibilityLabel="Menü bezárása"
          />
          <View style={[styles.oldalsav, { width: Math.min(320, ablakSzelesseg * 0.85) }]}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable onPress={() => setOldalsavNyitva(false)} style={styles.bezarasGomb}>
                <Ionicons name="close" size={26} color="#333" />
              </Pressable>
              <View style={styles.oldalsavProfil}>
                {profil?.profilkep_url ? (
                  <Pressable
                    onPress={() => setSajatKepNagy(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Saját profilkép nagyítása"
                    style={styles.profilKep}
                  >
                    <ProtectedImage
                      uri={IP.ipcim + profil.profilkep_url}
                      token={token}
                      style={styles.profilKep}
                    />
                  </Pressable>
                ) : (
                  <Ionicons name="person-circle" size={90} color="#aaa" />
                )}

                <Text style={styles.oldalsavNev}>
                  {profil?.Felhasznalo || felhasznaloNev}
                </Text>
              </View>
              <View style={{ paddingLeft: 15 }}>
                <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 10 }}>
                  <Text style={styles.oldalsavCim}>Profiladatok</Text>
                  <Text style={styles.adatSor}>Nem: {profil?.nem || 'Nincs megadva'}</Text>
                  <Text style={styles.adatSor}>Lakhely: {profil?.lakhely || 'Nincs megadva'}</Text>
                  <Text style={styles.adatSor}>Életkor: {profil?.eletkor ? `${profil.eletkor} év` : 'Nincs megadva'}</Text>
                  <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 10 }}>
                    <Text style={{}}></Text>
                    <ProfilSzerkesztes
                      token={token}
                      felhasznaloId={felhasznaloId}
                      onMentve={setProfil}
                    />
                    <Pressable onPress={partnerBeallitasMegnyitasa} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
                      <Ionicons name="options-outline" size={22} color="#333" />
                      <Text style={{ fontSize: 17, marginLeft: 10 }}>Partnerkeresési beállítások</Text>
                    </Pressable>
                    <Pressable onPress={tiltottakMegnyitasa} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
                      <Ionicons name="ban-outline" size={22} color="#333" />
                      <Text style={{ fontSize: 17, marginLeft: 10 }}>Letiltott felhasználók</Text>
                    </Pressable>
                  </View>
                  <Pressable style={styles.kijelentkezesGomb} onPress={kijelentkezes}>
                    <Ionicons name="log-out-outline" size={22} color="#b00020" />
                    <Text style={styles.kijelentkezesSzoveg}>Kijelentkezés</Text>
                  </Pressable>
                  <Pressable
                    onPress={sajatProfilTorlese}
                    disabled={profilTorlesFolyamatban}
                    accessibilityRole="button"
                    accessibilityLabel="Saját profil végleges törlése"
                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingVertical: 10, opacity: profilTorlesFolyamatban ? 0.5 : 1 }}
                  >
                    <Ionicons name="trash-outline" size={22} color="#b00020" />
                    <Text style={styles.kijelentkezesSzoveg}>{profilTorlesFolyamatban ? 'Törlés...' : 'Profil törlése'}</Text>
                  </Pressable>

                </View>

              </View>
            </ScrollView>
          </View>
          <Modal visible={tiltottakNyitva} transparent animationType="slide" onRequestClose={() => setTiltottakNyitva(false)}>
            <View style={{ flex: 1, justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <View style={{ maxHeight: '80%', backgroundColor: '#fff', borderRadius: 12, padding: 18 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Letiltott felhasználók</Text>
                {tiltottakBetoltes ? <Text style={{ padding: 12 }}>Betöltés...</Text> : (
                  <FlatList data={tiltottak} keyExtractor={item => String(item.Id)}
                    ListEmptyComponent={<Text style={{ paddingVertical: 14, color: '#666' }}>Nincs letiltott felhasználó.</Text>}
                    renderItem={({ item }) => (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                        <Text style={{ flex: 1, fontSize: 16 }}>{item.Felhasznalo}</Text>
                        <Pressable disabled={feloldasId !== null} onPress={() => tiltasFeloldasa(item)} style={{ padding: 8 }}>
                          <Text style={{ color: '#2678ba' }}>{feloldasId === item.Id ? 'Feloldás...' : 'Feloldás'}</Text>
                        </Pressable>
                      </View>
                    )} />
                )}
                <Button title="Frissítés" onPress={tiltottakBetoltese} disabled={tiltottakBetoltes} />
                <Button title="Bezárás" onPress={() => setTiltottakNyitva(false)} />
              </View>
            </View>
          </Modal>
          <Modal visible={partnerBeallitasNyitva} transparent animationType="slide" onRequestClose={() => setPartnerBeallitasNyitva(false)}>
            <View style={{ flex: 1, justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <View style={{ maxHeight: '88%', backgroundColor: '#fff', borderRadius: 12, padding: 18 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 14 }}>Partnerkeresési beállítások</Text>
                {partnerBeallitasBetoltes ? <Text style={{ paddingVertical: 18 }}>Betöltés...</Text> : <>
                  <Text style={{ marginBottom: 6 }}>Életkor (18–80 év)</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                    <TextInput value={korMin} onChangeText={setKorMin} keyboardType="number-pad" maxLength={2} placeholder="18" style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, width: 75 }} />
                    <Text style={{ marginHorizontal: 12 }}>–tól</Text>
                    <TextInput value={korMax} onChangeText={setKorMax} keyboardType="number-pad" maxLength={2} placeholder="80" style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, width: 75 }} />
                    <Text style={{ marginLeft: 12 }}>éves korig</Text>
                  </View>
                  <Text style={{ marginBottom: 6 }}>
                    Maximális távolság a profilod településétől
                  </Text>

                  <Text style={{
                    textAlign: 'center',
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: '#2678ba',
                    marginBottom: 6
                  }}>
                    {tavolsagKm} km
                  </Text>

                  <Slider
                    style={{ width: '100%', height: 44 }}
                    minimumValue={10}
                    maximumValue={500}
                    step={1}
                    value={Number(tavolsagKm)}
                    onValueChange={ertek => setTavolsagKm(String(Math.round(ertek)))}
                    minimumTrackTintColor="#2678ba"
                    maximumTrackTintColor="#ddd"
                    thumbTintColor="#2678ba"
                    disabled={partnerBeallitasMentes}
                    accessibilityLabel="Maximális keresési távolság"
                  />

                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 12
                  }}>
                    <Text style={{ color: '#666' }}>10 km</Text>
                    <Text style={{ color: '#666' }}>500 km</Text>
                  </View>
                  <Text style={{ color: '#666', fontSize: 12, marginBottom: 12 }}>
                    A távolság a profilban megadott település középpontjától számított közelítő légvonal. Koordinátaadatok: GeoNames (CC BY 4.0).
                  </Text>
                </>}
                <Button title={partnerBeallitasMentes ? 'Mentés...' : 'Mentés'} onPress={partnerBeallitasMentese} disabled={partnerBeallitasBetoltes || partnerBeallitasMentes} />
                <Button title="Mégse" onPress={() => setPartnerBeallitasNyitva(false)} disabled={partnerBeallitasMentes} />
              </View>
            </View>
          </Modal>
        </View>
      )}

      <Modal
        visible={sajatKepNagy && Boolean(profil?.profilkep_url)}
        animationType="fade"
        onRequestClose={() => setSajatKepNagy(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: '#111',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {profil?.profilkep_url && (
            <ProtectedImage
              uri={IP.ipcim + profil.profilkep_url}
              token={token}
              resizeMode="contain"
              style={{
                width: ablakSzelesseg * 0.94,
                height: ablakMagassag * 0.8
              }}
            />
          )}

          <Pressable
            onPress={() => setSajatKepNagy(false)}
            accessibilityRole="button"
            accessibilityLabel="Nagy kép bezárása"
            style={{
              position: 'absolute',
              top: 50,
              right: 20,
              padding: 12
            }}
          >
            <Text style={{ color: '#fff', fontSize: 18 }}>
              ✕ Bezárás
            </Text>
          </Pressable>
        </View>
      </Modal>

    </View>

  );
}
// ==================================================
// STÍLUSOK
// ==================================================
const styles = StyleSheet.create({
  fejlecAvatarGomb: { marginLeft: 14, padding: 3 },
  fejlecAvatar: { width: 36, height: 36, borderRadius: 18 },
  oldalsavReteg: {
    position: 'absolute', left: -20, right: -20, top: 0, bottom: 0,
    flexDirection: 'row', zIndex: 20
  },
  oldalsavHatter: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  oldalsav: { backgroundColor: '#fff', height: '100%', padding: 20, elevation: 8 },
  bezarasGomb: { alignSelf: 'flex-end', padding: 4 },
  oldalsavProfil: { alignItems: 'center', paddingVertical: 15 },
  oldalsavNev: { fontSize: 22, fontWeight: 'bold', marginTop: 8 },
  oldalsavCim: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 12 },
  adatSor: { fontSize: 16, marginBottom: 12 },
  kijelentkezesGomb: {
    flexDirection: 'row', alignItems: 'center', marginTop: 28,
    borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 18
  },
  kijelentkezesSzoveg: { color: '#b00020', fontSize: 17, marginLeft: 10 },
  // ----------------------------------------------
  // FŐ KONTÉNER
  // ----------------------------------------------
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },
  // ----------------------------------------------
  // ÜDVÖZLÉS
  // ----------------------------------------------
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    marginTop: 30,
    marginBottom: 10
  },
  // ----------------------------------------------
  // FELHASZNÁLÓ NEVE
  // ----------------------------------------------
  sajatnev: {
    fontSize: 23,
    marginBottom: 5
  },
  profilKartya: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    marginTop: 10
  },
  profilKep: { width: 76, height: 76, borderRadius: 38 },
  profilAdatok: { marginLeft: 12, flex: 1 },
  profilSor: { color: '#777', marginTop: 5 },
  // ----------------------------------------------
  // PARTNER KERESÉSE GOMB
  // ----------------------------------------------
  searchButton: {
    marginTop: 20,
    marginBottom: 20
  },
  // ----------------------------------------------
  // KORÁBBI BESZÉLGETÉSEK CÍME
  // ----------------------------------------------
  beszelgetesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 15
  },
  // ----------------------------------------------
  // EGY BESZÉLGETÉS
  // ----------------------------------------------
  beszelgetes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#fff'
  },
  // ----------------------------------------------
  // MEGNYOMOTT BESZÉLGETÉS
  // ----------------------------------------------
  beszelgetesPressed: {
    opacity: 0.6
  },
  // ----------------------------------------------
  // PARTNER INFORMÁCIÓ
  // ----------------------------------------------
  partnerInfo: {
    flex: 1
  },
  partnerFejlec: { flexDirection: 'row', alignItems: 'center' },
  partnerKep: { width: 52, height: 52, borderRadius: 26 },
  partnerSzovegek: { flex: 1, marginLeft: 10 },
  // ----------------------------------------------
  // PARTNER NEVE
  // ----------------------------------------------
  partnerNev: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5
  },
  // ----------------------------------------------
  // LEGUTOLSÓ ÜZENET
  // ----------------------------------------------
  utolsoUzenet: {
    fontSize: 14,
    color: '#777',
    marginTop: 2
  },
  // ----------------------------------------------
  // HA NINCS BESZÉLGETÉS
  // ----------------------------------------------
  nincsBeszelgetes: {
    textAlign: 'center',
    marginTop: 20,
    color: '#777'
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F7F8'
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 26,
    borderRadius: 18,
    backgroundColor: '#008D99'
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },
  beszelgetesTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#17212B',
    marginBottom: 16
  },
  beszelgetes: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#263B45',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2
  },
  beszelgetesPressed: {
    backgroundColor: '#EAF7F8'
  },
  partnerSzovegek: {
    flex: 1,
    marginLeft: 14
  },
  partnerNevSor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  partnerNev: {
    flex: 1,
    marginRight: 10,
    fontSize: 18,
    fontWeight: '700',
    color: '#17212B'
  },
  utolsoUzenet: {
    fontSize: 14,
    lineHeight: 21,
    color: '#77828D'
  },
  olvasatlanJelzes: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 7,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#008D99'
  },
  olvasatlanSzam: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  nincsBeszelgetes: {
    textAlign: 'center',
    marginTop: 32,
    padding: 24,
    fontSize: 15,
    lineHeight: 23,
    color: '#77828D'
  },
  oldalsav: {
    backgroundColor: '#fff',
    height: '100%',
    padding: 20,
    elevation: 8,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24
  },
  oldalsavProfil: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: '#EAF7F8',
    marginLeft: 10,

  },
  oldalsavNev: {
    fontSize: 22,
    fontWeight: '700',
    color: '#17212B',
    marginTop: 12
  },
  oldalsavCim: {
    fontSize: 18,
    fontWeight: '700',
    color: '#008D99',
    marginTop: 20,
    marginBottom: 14
  },
  adatSor: {
    fontSize: 16,
    lineHeight: 23,
    color: '#52606D',
    marginBottom: 12
  },
});