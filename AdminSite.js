import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Button, FlatList, Pressable, Alert, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
const IP = require('./ipcim');
const ALLAPOTOK = { uj: 'Új', vizsgalat: 'Vizsgálat alatt', lezart: 'Lezárt' };
export default function AdminSite({ route, navigation }) {
  const { token, felhasznaloId, felhasznaloNev } = route.params || {};
  const [ful, setFul] = useState('jelentesek');
  const [jelentesek, setJelentesek] = useState([]);
  const [users, setUsers] = useState([]);
  const [frissites, setFrissites] = useState(false);
  const [hiba, setHiba] = useState('');
  const [mentes, setMentes] = useState(null);
  const betoltesZar = useRef(false);
  const mentesZar = useRef(false);
  const keres = async (ut, body) => {
    const response = await fetch(IP.ipcim + ut, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  };
  const betoltes = useCallback(async () => {
    if (betoltesZar.current) return;
    betoltesZar.current = true; setFrissites(true); setHiba('');
    try {
      const [j, u] = await Promise.all([keres('/admin/jelentesek'), keres('/admin/felhasznalok')]);
      setJelentesek(j); setUsers(u);
    } catch (error) { setHiba(error.message || 'Nem sikerült betölteni.'); }
    finally { betoltesZar.current = false; setFrissites(false); }
  }, [token]);
  useFocusEffect(useCallback(() => { void betoltes(); }, [betoltes]));
  const allapotMentese = async (id, allapot) => {
    if (mentesZar.current) return;
    mentesZar.current = true; setMentes(id);
    try {
      await keres('/admin/jelentes-allapot', { id, allapot });
      setJelentesek(elozo => elozo.map(j => j.id === id ? { ...j, allapot } : j));
    } catch (error) { Alert.alert('Hiba', error.message); }
    finally { mentesZar.current = false; setMentes(null); }
  };
  const felhasznaloTorlese = (user) => Alert.alert(
    'Felhasználó végleges törlése',
    `${user.Felhasznalo} fiókja, beszélgetései, képei és kapcsolódó jelentései végleg törlődnek. A beszélgetések a partnereknél is eltűnnek. Folytatod?`,
    [{ text: 'Mégse', style: 'cancel' }, { text: 'Végleges törlés', style: 'destructive', onPress: async () => {
      if (mentesZar.current) return;
      mentesZar.current = true; setMentes('user-' + user.Id);
      try {
        await keres('/admin/felhasznalo-torles', { Id: user.Id });
        setUsers(elozo => elozo.filter(x => x.Id !== user.Id));
        setJelentesek(elozo => elozo.filter(x => Number(x.jelento_id) !== Number(user.Id) && Number(x.jelentett_id) !== Number(user.Id)));
        Alert.alert('Törölve', 'A felhasználó fiókját töröltük.');
      } catch (error) { Alert.alert('Hiba', error.message); }
      finally { mentesZar.current = false; setMentes(null); }
    } }]
  );
  const kijelentkezes = async () => {
    try { await keres('/logout', {}); }
    catch (error) { Alert.alert('Hiba', 'A kijelentkezés nem sikerült. Próbáld újra.'); return; }
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };
  return <View style={styles.container}>
    <Text style={styles.cim}>Admin – {felhasznaloNev}</Text>
    <View style={styles.sor}>
      <Button title="Jelentések" onPress={() => setFul('jelentesek')} />
      <Button title="Felhasználók" onPress={() => setFul('users')} />
    </View>
    <View style={styles.sor}>
      <Button title="Frissítés" onPress={betoltes} disabled={frissites} />
      <Button title="Saját chatoldal" onPress={() => navigation.navigate('User', { token, felhasznaloId, felhasznaloNev })} />
    </View>
    <Button title="Kijelentkezés" onPress={kijelentkezes} />
    {hiba ? <Text style={styles.hiba}>{hiba}</Text> : null}
    <Text style={styles.info}>A legutóbbi legfeljebb 500 elem látható.</Text>
    <FlatList data={ful === 'jelentesek' ? jelentesek : users} keyExtractor={item => String(item.id ?? item.Id)}
      refreshing={frissites} onRefresh={betoltes} alwaysBounceVertical
      ListEmptyComponent={<Text style={styles.info}>{frissites ? 'Betöltés...' : hiba ? 'Az adatok nem elérhetők.' : 'Nincs megjeleníthető elem.'}</Text>}
      renderItem={({ item }) => ful === 'users' ? <View style={styles.kartya}>
        <Text style={styles.nev}>{item.Felhasznalo}{Number(item.is_admin) === 1 ? ' (admin)' : ''}</Text>
        <Text>{item.Email}</Text><Text>Azonosító: {item.Id}</Text>
        {Number(item.is_admin) !== 1 && Number(item.Id) !== Number(felhasznaloId) ?
          <Button color="#b00020" title={mentes === 'user-' + item.Id ? 'Törlés...' : 'Felhasználó törlése'} disabled={mentes !== null} onPress={() => felhasznaloTorlese(item)} /> : null}
      </View> : <View style={styles.kartya}>
        <Text style={styles.nev}>{item.ok} – {ALLAPOTOK[item.allapot] || item.allapot}</Text>
        <Text>Jelentő: {item.jelento_nev || 'Törölt felhasználó'} (#{item.jelento_id})</Text>
        <Text>Jelentett: {item.jelentett_nev || 'Törölt felhasználó'} (#{item.jelentett_id})</Text>
        <Text>Beszélgetés: #{item.talalkozas_id}</Text>
        <Text>{item.leiras || 'Nincs külön leírás.'}</Text>
        <Text style={styles.info}>{String(item.letrehozva || '')}</Text>
        <View style={styles.sor}>{Object.entries(ALLAPOTOK).map(([key, label]) =>
          <Pressable key={key} disabled={mentes !== null || item.allapot === key} onPress={() => allapotMentese(item.id, key)}
            style={[styles.gomb, item.allapot === key && styles.kivalasztott]}>
            <Text>{label}</Text>
          </Pressable>)}</View>
        {mentes === item.id ? <Text>Mentés...</Text> : null}
      </View>} />
  </View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  cim: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  sor: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  kartya: { padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 10 },
  nev: { fontSize: 17, fontWeight: 'bold', marginBottom: 8 },
  info: { color: '#666', marginVertical: 8 },
  hiba: { color: '#b00020', marginVertical: 10 },
  gomb: { padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 6 },
  kivalasztott: { backgroundColor: '#dcefdc' }
});