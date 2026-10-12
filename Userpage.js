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
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Slider from '@react-native-community/slider';
import ProfilSzerkesztes from './ProfilSzerkesztes';
import useOnlineAllapot from './useOnlineAllapot';
import { Ionicons } from '@expo/vector-icons';
import ProtectedImage from './ProtectedImage';
import PartnerAdatlap from './PartnerAdatlap';
import { ertesitesekInditasa, ertesitesekKijelentkezes, helyiErtesites } from './NotificationSupport';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';

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
  const [keresettNem, setKeresettNem] = useState('Bárki');
  const utolsoLatott = useRef(null);
  const betoltesFolyamatban = useRef(null);
  const [sajatKepNagy, setSajatKepNagy] = useState(false);
  const {
    width: ablakSzelesseg,
    height: ablakMagassag
  } = useWindowDimensions();

  const fejlecMagassag = useHeaderHeight();

  const oldalMagassag = Math.max(
    0,
    ablakMagassag - fejlecMagassag
  );
  useEffect(() => {
    let leallitva = false, stop;
    ertesitesekInditasa(token, navigation, felhasznaloId).then((eredmeny) => {
      stop = eredmeny.stop;
      console.log('Értesítési állapot:', eredmeny.allapot);
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
      setKeresettNem(adat.keresettNem ?? 'Bárki');
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
        body: JSON.stringify({ korMin: min, korMax: max, tavolsagKm: tavolsag, keresettNem })
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
  if (kereses) return;

  setKereses(true);

  try {
    const url = IP.ipcim + '/random/' + felhasznaloId;

    console.log('[Keresés] URL:', url);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const szoveg = await response.text();

    console.log('[Keresés] HTTP:', response.status);
    console.log('[Keresés] Válasz:', szoveg);

    if (!response.ok) {
      Alert.alert('Hiba', szoveg || 'Nem sikerült partnert keresni.');
      return;
    }

    const data = JSON.parse(szoveg);

    if (!Number.isInteger(Number(data.partnerId)) || Number(data.partnerId) <= 0) {
      Alert.alert('Hiba', 'A szerver válaszából hiányzik a partner azonosítója.');
      return;
    }

    navigation.navigate('Chat', {
      talalkozasId: null,
      partnerId: Number(data.partnerId),
      partnerNev: data.partnerNev,
      felhasznaloId,
      token
    });
  } catch (error) {
    console.error('[Keresés] Hiba:', error);
    Alert.alert('Hiba', error.message || 'Nem sikerült partnert keresni.');
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
    <View
      style={[
        styles.container,
        { minHeight: 0 },
        Platform.OS === 'web' && {
          height: oldalMagassag,
          maxHeight: oldalMagassag,
          overflow: 'hidden'
        }
      ]}
    >
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
        style={{ flex: 1, minHeight: 0 }}
        showsVerticalScrollIndicator
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
          <View
            style={[
              styles.oldalsav,
              {
                width: Math.min(320, ablakSzelesseg * 0.85),
                height: oldalMagassag,
                maxHeight: oldalMagassag,
                minHeight: 0,
                overflow: 'hidden'
              }
            ]}
          >
            <ScrollView
              style={{ flex: 1, minHeight: 0 }}
              contentContainerStyle={{ paddingBottom: 32 }}
              showsVerticalScrollIndicator
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
          <Modal
            visible={tiltottakNyitva}
            transparent
            animationType="fade"
            onRequestClose={() => setTiltottakNyitva(false)}
          >
            <View style={styles.beallitasHatter}>
              <View style={[
                styles.beallitasKartya,
                { height: Math.min(ablakMagassag * 0.8, 640) }
              ]}>
                <View style={styles.beallitasFejlec}>
                  <View style={styles.beallitasIkon}>
                    <Ionicons name="ban-outline" size={25} color="#008D99" />
                  </View>

                  <Pressable
                    onPress={() => setTiltottakNyitva(false)}
                    style={styles.beallitasBezaras}
                    accessibilityRole="button"
                    accessibilityLabel="Letiltott felhasználók bezárása"
                  >
                    <Ionicons name="close" size={24} color="#52606D" />
                  </Pressable>
                </View>

                <Text style={styles.beallitasCim}>Letiltott felhasználók</Text>
                <Text style={styles.beallitasLeiras}>
                  Itt kezelheted a tiltásaidat, és feloldhatod őket.
                </Text>

                {tiltottakBetoltes ? (
                  <View style={styles.tiltottBetoltes}>
                    <ActivityIndicator size="large" color="#008D99" />
                    <Text style={styles.beallitasSeged}>Betöltés...</Text>
                  </View>
                ) : (
                  <FlatList
                    style={{ flex: 1, minHeight: 0 }}
                    data={tiltottak}
                    keyExtractor={item => String(item.Id)}
                    contentContainerStyle={{ paddingBottom: 12 }}
                    ListEmptyComponent={
                      <View style={styles.tiltottUres}>
                        <View style={styles.tiltottUresIkon}>
                          <Ionicons
                            name="shield-checkmark-outline"
                            size={36}
                            color="#008D99"
                          />
                        </View>
                        <Text style={styles.tiltottUresCim}>
                          Nincs letiltott felhasználó
                        </Text>
                        <Text style={styles.tiltottUresLeiras}>
                          A letiltott felhasználók itt fognak megjelenni.
                        </Text>
                      </View>
                    }
                    renderItem={({ item }) => (
                      <View style={styles.tiltottSor}>
                        <View style={styles.tiltottAvatarKeret}>
                          {item.profilkep_url ? (
                            <ProtectedImage
                              uri={IP.ipcim + item.profilkep_url}
                              token={token}
                              style={styles.tiltottAvatar}
                            />
                          ) : (
                            <Ionicons
                              name="person-outline"
                              size={25}
                              color="#008D99"
                            />
                          )}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.tiltottNev} numberOfLines={1}>
                            {item.Felhasznalo}
                          </Text>
                          <Text style={styles.tiltottFelirat}>Letiltva</Text>
                        </View>

                        <Pressable
                          disabled={feloldasId !== null}
                          onPress={() => tiltasFeloldasa(item)}
                          accessibilityRole="button"
                          accessibilityLabel={`${item.Felhasznalo} tiltásának feloldása`}
                          style={({ pressed }) => [
                            styles.feloldasGomb,
                            (pressed || feloldasId !== null) && { opacity: 0.65 }
                          ]}
                        >
                          {feloldasId === item.Id ? (
                            <ActivityIndicator size="small" color="#008D99" />
                          ) : (
                            <Text style={styles.feloldasSzoveg}>Feloldás</Text>
                          )}
                        </Pressable>
                      </View>
                    )}
                  />
                )}

                <Pressable
                  onPress={tiltottakBetoltese}
                  disabled={tiltottakBetoltes}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.beallitasFoGomb,
                    (pressed || tiltottakBetoltes) && { opacity: 0.65 }
                  ]}
                >
                  <Ionicons name="refresh-outline" size={20} color="#fff" />
                  <Text style={styles.beallitasFoSzoveg}>Lista frissítése</Text>
                </Pressable>

                <Pressable
                  onPress={() => setTiltottakNyitva(false)}
                  accessibilityRole="button"
                  style={styles.beallitasMasodlagosGomb}
                >
                  <Text style={styles.beallitasMasodlagosSzoveg}>Bezárás</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
          <Modal
            visible={partnerBeallitasNyitva}
            transparent
            animationType="fade"
            onRequestClose={() => {
              if (!partnerBeallitasMentes) setPartnerBeallitasNyitva(false);
            }}
          >
            <KeyboardAvoidingView
              style={styles.beallitasHatter}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={[
                styles.beallitasKartya,
                {
                  height: Math.min(ablakMagassag * 0.85, 700),
                  maxHeight: ablakMagassag * 0.85,
                  minHeight: 0
                }
              ]}>
                <ScrollView
                  style={{ flex: 1, minHeight: 0 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.beallitasFejlec}>
                    <View style={styles.beallitasIkon}>
                      <Ionicons name="options-outline" size={25} color="#008D99" />
                    </View>

                    <Pressable
                      onPress={() => setPartnerBeallitasNyitva(false)}
                      disabled={partnerBeallitasMentes}
                      accessibilityRole="button"
                      accessibilityLabel="Partnerkeresési beállítások bezárása"
                      style={styles.beallitasBezaras}
                    >
                      <Ionicons name="close" size={24} color="#52606D" />
                    </Pressable>
                  </View>

                  <Text style={styles.beallitasCim}>Partnerkeresési beállítások</Text>
                  <Text style={styles.beallitasLeiras}>
                    Állítsd be, milyen korú és milyen távolságban lévő
                    beszélgetőpartnert keresel.
                  </Text>

                  {partnerBeallitasBetoltes ? (
                    <View style={{ paddingVertical: 30 }}>
                      <ActivityIndicator size="large" color="#008D99" />
                    </View>
                  ) : (
                    <>
                      <View style={styles.keresesSzekcio}>
                        <View style={styles.keresesSzekcioFejlec}>
                          <Ionicons name="people-outline" size={21} color="#008D99" />
                          <Text style={styles.keresesSzekcioCim}>Keresett nem</Text>
                        </View>

                        <Text style={styles.beallitasSeged}>
                          Válaszd ki, kivel szeretnél beszélgetni.
                        </Text>

                        <View style={styles.nemValasztoSor}>
                          {['Bárki', 'Nő', 'Férfi', 'Egyéb'].map(ertek => (
                            <Pressable
                              key={ertek}
                              onPress={() => setKeresettNem(ertek)}
                              disabled={partnerBeallitasMentes}
                              accessibilityRole="button"
                              accessibilityState={{
                                selected: keresettNem === ertek,
                                disabled: partnerBeallitasMentes
                              }}
                              style={({ pressed }) => [
                                styles.nemValasztoGomb,
                                keresettNem === ertek && styles.nemValasztoAktiv,
                                (pressed || partnerBeallitasMentes) && { opacity: 0.65 }
                              ]}
                            >
                              <Text style={[
                                styles.nemValasztoSzoveg,
                                keresettNem === ertek && styles.nemValasztoAktivSzoveg
                              ]}>
                                {ertek}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                      <View style={styles.keresesSzekcio}>
                        <View style={styles.keresesSzekcioFejlec}>
                          <Ionicons
                            name="calendar-outline"
                            size={21}
                            color="#008D99"
                          />
                          <Text style={styles.keresesSzekcioCim}>Életkor</Text>
                        </View>

                        <Text style={styles.beallitasSeged}>
                          Válassz egy 18 és 80 év közötti tartományt.
                        </Text>

                        <View style={styles.korMezok}>
                          <View style={styles.korMezoResz}>
                            <Text style={styles.korCimke}>Minimum</Text>
                            <View style={styles.korInputKeret}>
                              <TextInput
                                value={korMin}
                                onChangeText={setKorMin}
                                keyboardType="number-pad"
                                maxLength={2}
                                placeholder="18"
                                placeholderTextColor="#77828D"
                                editable={!partnerBeallitasMentes}
                                accessibilityLabel="Minimum életkor"
                                style={styles.korInput}
                              />
                              <Text style={styles.korEv}>év</Text>
                            </View>
                          </View>

                          <Text style={styles.korElvalaszto}>–</Text>

                          <View style={styles.korMezoResz}>
                            <Text style={styles.korCimke}>Maximum</Text>
                            <View style={styles.korInputKeret}>
                              <TextInput
                                value={korMax}
                                onChangeText={setKorMax}
                                keyboardType="number-pad"
                                maxLength={2}
                                placeholder="80"
                                placeholderTextColor="#77828D"
                                editable={!partnerBeallitasMentes}
                                accessibilityLabel="Maximum életkor"
                                style={styles.korInput}
                              />
                              <Text style={styles.korEv}>év</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      <View style={styles.keresesSzekcio}>
                        <View style={styles.keresesSzekcioFejlec}>
                          <Ionicons
                            name="location-outline"
                            size={21}
                            color="#008D99"
                          />
                          <Text style={styles.keresesSzekcioCim}>Távolság</Text>
                        </View>

                        <Text style={styles.beallitasSeged}>
                          Maximális távolság a profilod településétől.
                        </Text>

                        <View style={styles.tavolsagJelzes}>
                          <Text style={styles.tavolsagErtek}>{tavolsagKm}</Text>
                          <Text style={styles.tavolsagMertek}>km</Text>
                        </View>

                        <Slider
                          style={{ width: '100%', height: 44 }}
                          minimumValue={10}
                          maximumValue={500}
                          step={1}
                          value={Number(tavolsagKm)}
                          onValueChange={ertek =>
                            setTavolsagKm(String(Math.round(ertek)))
                          }
                          minimumTrackTintColor="#008D99"
                          maximumTrackTintColor="#DDE8EB"
                          thumbTintColor="#008D99"
                          disabled={partnerBeallitasMentes}
                          accessibilityLabel="Maximális keresési távolság"
                        />

                        <View style={styles.tavolsagHatarok}>
                          <Text style={styles.tavolsagHatarSzoveg}>10 km</Text>
                          <Text style={styles.tavolsagHatarSzoveg}>500 km</Text>
                        </View>
                      </View>

                      <View style={styles.keresesInfo}>
                        <Ionicons
                          name="information-circle-outline"
                          size={20}
                          color="#008D99"
                        />
                        <Text style={styles.keresesInfoSzoveg}>
                          A távolság a profilban megadott település középpontjától
                          számított közelítő légvonal. Koordinátaadatok:
                          GeoNames (CC BY 4.0).
                        </Text>
                      </View>
                    </>
                  )}
                </ScrollView>

                <Pressable
                  onPress={partnerBeallitasMentese}
                  disabled={partnerBeallitasBetoltes || partnerBeallitasMentes}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.beallitasFoGomb,
                    (pressed || partnerBeallitasBetoltes || partnerBeallitasMentes) &&
                    { opacity: 0.65 }
                  ]}
                >
                  {partnerBeallitasMentes ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Ionicons name="checkmark-outline" size={22} color="#fff" />
                  )}
                  <Text style={styles.beallitasFoSzoveg}>
                    {partnerBeallitasMentes ? 'Mentés...' : 'Beállítások mentése'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setPartnerBeallitasNyitva(false)}
                  disabled={partnerBeallitasMentes}
                  accessibilityRole="button"
                  style={styles.beallitasMasodlagosGomb}
                >
                  <Text style={styles.beallitasMasodlagosSzoveg}>Mégse</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
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
  beallitasHatter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(23,33,43,0.55)'
  },
  beallitasKartya: {
    width: '100%',
    maxWidth: 520,
    flexShrink: 1,
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#fff'
  },
  beallitasFejlec: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  beallitasIkon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF7F8'
  },
  beallitasBezaras: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7F8'
  },
  beallitasCim: {
    fontSize: 23,
    fontWeight: '700',
    color: '#17212B'
  },
  beallitasLeiras: {
    fontSize: 14,
    lineHeight: 22,
    color: '#77828D',
    marginTop: 8,
    marginBottom: 22
  },
  beallitasSeged: {
    fontSize: 13,
    lineHeight: 20,
    color: '#77828D',
    marginTop: 8
  },
  beallitasFoGomb: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    padding: 14,
    marginTop: 16,
    borderRadius: 15,
    backgroundColor: '#008D99'
  },
  beallitasFoSzoveg: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  },
  beallitasMasodlagosGomb: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 10,
    borderRadius: 13,
    backgroundColor: '#EAF7F8'
  },
  beallitasMasodlagosSzoveg: {
    color: '#008D99',
    fontSize: 14,
    fontWeight: '600'
  },
  tiltottBetoltes: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  tiltottUres: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 12
  },
  tiltottUresIkon: {
    width: 78,
    height: 78,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF7F8',
    marginBottom: 18
  },
  tiltottUresCim: {
    fontSize: 17,
    fontWeight: '700',
    color: '#17212B',
    textAlign: 'center'
  },
  tiltottUresLeiras: {
    fontSize: 14,
    lineHeight: 22,
    color: '#77828D',
    textAlign: 'center',
    marginTop: 8
  },
  tiltottSor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: '#F5F7F8'
  },
  tiltottAvatarKeret: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EAF7F8',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tiltottAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23
  },
  tiltottNev: {
    fontSize: 15,
    fontWeight: '700',
    color: '#17212B'
  },
  tiltottFelirat: {
    fontSize: 12,
    color: '#77828D',
    marginTop: 4
  },
  feloldasGomb: {
    minWidth: 72,
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF7F8'
  },
  feloldasSzoveg: {
    color: '#008D99',
    fontSize: 13,
    fontWeight: '700'
  },
  keresesSzekcio: {
    padding: 16,
    borderRadius: 17,
    backgroundColor: '#F5F7F8',
    marginBottom: 14
  },
  keresesSzekcioFejlec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  keresesSzekcioCim: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17212B'
  },
  korMezok: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16
  },
  korMezoResz: {
    flex: 1
  },
  korCimke: {
    fontSize: 12,
    fontWeight: '600',
    color: '#77828D',
    marginBottom: 7
  },
  korInputKeret: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E8EC',
    borderRadius: 13,
    backgroundColor: '#fff',
    paddingHorizontal: 12
  },
  korInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '700',
    color: '#17212B'
  },
  korEv: {
    fontSize: 13,
    color: '#77828D'
  },
  korElvalaszto: {
    fontSize: 20,
    color: '#77828D',
    marginTop: 20
  },
  tavolsagJelzes: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
    marginBottom: 6
  },
  tavolsagErtek: {
    fontSize: 38,
    fontWeight: '700',
    color: '#008D99'
  },
  tavolsagMertek: {
    fontSize: 18,
    fontWeight: '600',
    color: '#008D99'
  },
  tavolsagHatarok: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  tavolsagHatarSzoveg: {
    fontSize: 12,
    color: '#77828D'
  },
  keresesInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 13,
    backgroundColor: '#EAF7F8'
  },
  keresesInfoSzoveg: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: '#52606D'
  },
  nemValasztoSor: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14
  },
  nemValasztoGomb: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E4EAED',
    backgroundColor: '#F8FAFB'
  },
  nemValasztoAktiv: {
    backgroundColor: '#008D99',
    borderColor: '#008D99'
  },
  nemValasztoSzoveg: {
    color: '#52606D',
    fontSize: 14,
    fontWeight: '600'
  },
  nemValasztoAktivSzoveg: {
    color: '#fff'
  },
});