import React, { useState, useCallback, useLayoutEffect, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Button,
  Alert,
  StyleSheet,
  FlatList,
  Pressable,
  useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProtectedImage from './ProtectedImage';
import PartnerAdatlap from './PartnerAdatlap';
import { ertesitesekInditasa, ertesitesekKijelentkezes, helyiErtesites } from './NotificationSupport';
import { useFocusEffect } from '@react-navigation/native';
const IP = require('./ipcim');
export default function User({ route, navigation }) {
  const { felhasznaloId, felhasznaloNev, token } = route.params;
  const authHeaders = { Authorization: `Bearer ${token}` };
  const [kereses, setKereses] = useState(false);
  const [frissites, setFrissites] = useState(false);
  const frissitesFolyamatban = useRef(false);
  const [beszelgetesek, setBeszelgetesek] = useState([]);
  const [profil, setProfil] = useState(null);
  const [oldalsavNyitva, setOldalsavNyitva] = useState(false);
  const [ertesitesAllapot, setErtesitesAllapot] = useState('');
  const utolsoLatott = useRef(null);
  const betoltesFolyamatban = useRef(null);
  const { width: ablakSzelesseg } = useWindowDimensions();
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
    [{ text: 'Mégse', style: 'cancel' }, { text: 'Végleges törlés', style: 'destructive', onPress: async () => {
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
    } }]
  );
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
      if (response.ok) setProfil(await response.json());
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
      <View style={styles.searchButton}>
        <Button
          title={
            kereses
              ? 'Keresés...'
              : 'Keresés...'
          }
          onPress={partnerKereses}
          disabled={kereses}
        />
      </View>
      {/* -------------------------------------------- */}
      {/* KORÁBBI BESZÉLGETÉSEK */}
      {/* -------------------------------------------- */}
      <FlatList
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
                <PartnerAdatlap partnerId={item.partnerId} token={token} kepUrl={item.partnerKepUrl} />
                <View style={styles.partnerSzovegek}>
              {/* PARTNER NEVE */}
              <Text style={styles.partnerNev}>
                {item.partnerNev}
                {Number(item.olvasatlan) > 0 ? `  🔴 ${item.olvasatlan}` : ''}
              </Text>
              {/* LEGUTOLSÓ ÜZENET */}
              <Text style={styles.utolsoUzenet}>
                {item.utolsoUzenet}
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
            <Pressable onPress={() => setOldalsavNyitva(false)} style={styles.bezarasGomb}>
              <Ionicons name="close" size={26} color="#333" />
            </Pressable>
            <View style={styles.oldalsavProfil}>
              {profil?.profilkep_url ? (
                <ProtectedImage uri={IP.ipcim + profil.profilkep_url} token={token} style={styles.profilKep} />
              ) : (
                <Ionicons name="person-circle" size={90} color="#aaa" />
              )}
              <Text style={styles.oldalsavNev}>{profil?.Felhasznalo || felhasznaloNev}</Text>
            </View>
            <View style={{paddingLeft:15 }}>
            <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 10 }}>
            <Text style={styles.oldalsavCim}>Profiladatok</Text>
            <Text style={styles.adatSor}>Nem: {profil?.nem || 'Nincs megadva'}</Text>
            <Text style={styles.adatSor}>Lakhely: {profil?.lakhely || 'Nincs megadva'}</Text>
            <Text style={styles.adatSor}>Életkor: {profil?.eletkor ? `${profil.eletkor} év` : 'Nincs megadva'}</Text>
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
          </View>
        </View>
      )}
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
  }
});