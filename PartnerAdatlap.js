import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProtectedImage from './ProtectedImage';
const IP = require('./ipcim');
export default function PartnerAdatlap({ partnerId, token, kepUrl, fejlec = false, children }) {
  const [nyitva, setNyitva] = useState(false);
  const [nagyKep, setNagyKep] = useState(false);
  const [profil, setProfil] = useState(null);
  const [betoltes, setBetoltes] = useState(false);
  const [hiba, setHiba] = useState('');
  const keresszam = useRef(0);
  const { width, height } = useWindowDimensions();
  useEffect(() => {
    setProfil(null); setHiba(''); setNyitva(false); setNagyKep(false);
    if (!fejlec) return;
    let aktiv = true;
    fetch(IP.ipcim + '/profil/' + partnerId, { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => { if (response.ok) { const adat = await response.json(); if (aktiv) setProfil(adat); } })
      .catch(() => {});
    return () => { aktiv = false; keresszam.current++; };
  }, [partnerId, token, fejlec]);
  const megnyitas = async event => {
    event?.stopPropagation?.();
    setNyitva(true); setBetoltes(true); setHiba('');
    const aktualisKeres = ++keresszam.current;
    try {
      const response = await fetch(IP.ipcim + '/profil/' + partnerId, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(await response.text());
      const adat = await response.json();
      if (aktualisKeres === keresszam.current) setProfil(adat);
    } catch (error) { if (aktualisKeres === keresszam.current) setHiba(error.message || 'Nem sikerült betölteni az adatlapot.'); }
    finally { if (aktualisKeres === keresszam.current) setBetoltes(false); }
  };
  const bezaras = () => { keresszam.current++; setNyitva(false); setNagyKep(false); setBetoltes(false); };
  const kep = profil?.profilkep_url || kepUrl;
  return <>
    <Pressable onPress={megnyitas} accessibilityRole="button" accessibilityLabel="Partner adatlapjának megnyitása" style={fejlec ? styles.fejlec : undefined}>
      {kep ? <ProtectedImage uri={IP.ipcim + kep} token={token} style={styles.avatar} /> : <Ionicons name="person-circle" size={52} color="#aaa" />}
      {children ? <View style={{ marginLeft: 10, flexShrink: 1 }}>{children}</View> : null}
    </Pressable>
    <Modal visible={nyitva} transparent animationType="fade" onRequestClose={() => nagyKep ? setNagyKep(false) : bezaras()}>
      {nagyKep && kep ? <View style={styles.nagyHatter}>
        <Pressable onPress={() => setNagyKep(false)} style={styles.bezaras} accessibilityRole="button"><Text style={{ color: '#fff', fontSize: 18 }}>✕ Bezárás</Text></Pressable>
        <ProtectedImage uri={IP.ipcim + kep} token={token} resizeMode="contain" style={{ width: width * 0.94, height: height * 0.8 }} />
      </View> : <View style={styles.hatter}>
        <View style={[styles.kartya, { maxHeight: height * 0.85 }]}>
          <Pressable onPress={bezaras} style={{ alignSelf: 'flex-end', padding: 8 }} accessibilityRole="button"><Text>✕ Bezárás</Text></Pressable>
          <ScrollView contentContainerStyle={{ padding: 12 }}>
            {betoltes ? <ActivityIndicator size="large" /> : hiba ? <Text style={{ color: '#b00020' }}>{hiba}</Text> : profil ? <>
              <Pressable onPress={() => { if (kep) setNagyKep(true); }} disabled={!kep} accessibilityRole="button" accessibilityLabel="Profilkép nagyítása" style={{ alignSelf: 'center' }}>
                {kep ? <ProtectedImage uri={IP.ipcim + kep} token={token} style={styles.profilKep} resizeMode="cover" /> : <Ionicons name="person-circle" size={120} color="#aaa" />}
              </Pressable>
              <Text style={styles.nev}>{profil.Felhasznalo}</Text>
              <Text style={styles.adat}>Nem: {profil.nem || 'Nincs megadva'}</Text>
              <Text style={styles.adat}>Lakhely: {profil.lakhely || 'Nincs megadva'}</Text>
              <Text style={styles.adat}>Életkor: {profil.eletkor != null ? `${profil.eletkor} év` : 'Nincs megadva'}</Text>
            </> : null}
          </ScrollView>
        </View>
      </View>}
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  fejlec: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  hatter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.5)' },
  kartya: { backgroundColor: '#fff', borderRadius: 12, padding: 12, width: '100%', maxWidth: 420 },
  profilKep: { width: 120, height: 120, borderRadius: 60 },
  nev: { fontSize: 23, fontWeight: 'bold', textAlign: 'center', marginVertical: 16 },
  adat: { fontSize: 17, marginBottom: 12 },
  nagyHatter: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  bezaras: { position: 'absolute', top: 45, right: 20, padding: 10, zIndex: 1 }
});