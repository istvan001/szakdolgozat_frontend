import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Alert,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const IP = require('./ipcim');

const ALLAPOTOK = {
  uj: 'Új',
  vizsgalat: 'Vizsgálat alatt',
  lezart: 'Lezárt'
};

const normalizalas = ertek => String(ertek || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

export default function AdminSite({ route, navigation }) {
  const { token, felhasznaloId, felhasznaloNev } = route.params || {};
  const [ful, setFul] = useState('jelentesek');
  const [jelentesek, setJelentesek] = useState([]);
  const [users, setUsers] = useState([]);
  const [felhasznaloKereses, setFelhasznaloKereses] = useState('');
  const [frissites, setFrissites] = useState(false);
  const [hiba, setHiba] = useState('');
  const [mentes, setMentes] = useState(null);
  const betoltesZar = useRef(false);
  const mentesZar = useRef(false);

  const keres = async (ut, body) => {
    const response = await fetch(IP.ipcim + ut, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });

    if (!response.ok) throw new Error(await response.text());
    return response.json();
  };

  const betoltes = useCallback(async () => {
    if (betoltesZar.current) return;

    betoltesZar.current = true;
    setFrissites(true);
    setHiba('');

    try {
      const [j, u] = await Promise.all([
        keres('/admin/jelentesek'),
        keres('/admin/felhasznalok')
      ]);

      setJelentesek(j);
      setUsers(u);
    } catch (error) {
      setHiba(error.message || 'Nem sikerült betölteni.');
    } finally {
      betoltesZar.current = false;
      setFrissites(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => {
    void betoltes();
  }, [betoltes]));

  const allapotMentese = async (id, allapot) => {
    if (mentesZar.current) return;

    mentesZar.current = true;
    setMentes(id);

    try {
      await keres('/admin/jelentes-allapot', { id, allapot });

      setJelentesek(elozo => elozo.map(j =>
        j.id === id ? { ...j, allapot } : j
      ));
    } catch (error) {
      Alert.alert('Hiba', error.message);
    } finally {
      mentesZar.current = false;
      setMentes(null);
    }
  };

  const felhasznaloTorlese = user => Alert.alert(
    'Felhasználó végleges törlése',
    `${user.Felhasznalo} fiókja, beszélgetései, képei és kapcsolódó jelentései végleg törlődnek. A beszélgetések a partnereknél is eltűnnek. Folytatod?`,
    [
      { text: 'Mégse', style: 'cancel' },
      {
        text: 'Végleges törlés',
        style: 'destructive',
        onPress: async () => {
          if (mentesZar.current) return;

          mentesZar.current = true;
          setMentes('user-' + user.Id);

          try {
            await keres('/admin/felhasznalo-torles', { Id: user.Id });

            setUsers(elozo => elozo.filter(x => x.Id !== user.Id));
            setJelentesek(elozo => elozo.filter(x =>
              Number(x.jelento_id) !== Number(user.Id) &&
              Number(x.jelentett_id) !== Number(user.Id)
            ));

            Alert.alert('Törölve', 'A felhasználó fiókját töröltük.');
          } catch (error) {
            Alert.alert('Hiba', error.message);
          } finally {
            mentesZar.current = false;
            setMentes(null);
          }
        }
      }
    ]
  );

  const kijelentkezes = async () => {
    try {
      await keres('/logout', {});
    } catch (error) {
      Alert.alert('Hiba', 'A kijelentkezés nem sikerült. Próbáld újra.');
      return;
    }

    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const adminUzenet = user => {
    navigation.navigate('Chat', {
      talalkozasId: null,
      partnerId: Number(user.Id),
      partnerNev: user.Felhasznalo,
      felhasznaloId,
      token
    });
  };

  const keresett = normalizalas(felhasznaloKereses.trim());

  const szurtUsers = users.filter(user =>
    normalizalas(user.Felhasznalo).includes(keresett) ||
    normalizalas(user.Email).includes(keresett) ||
    String(user.Id).includes(keresett)
  );

  const fejlec = (
    <>
      <View style={styles.fejlec}>
        <View style={styles.logo}>
          <Ionicons
            name="shield-checkmark-outline"
            size={28}
            color="#008D99"
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.cim}>Adminisztráció</Text>
          <Text style={styles.alcim}>{felhasznaloNev}</Text>
        </View>
      </View>

      <View style={styles.fulek}>
        {[
          ['jelentesek', 'Jelentések', 'flag-outline'],
          ['users', 'Felhasználók', 'people-outline']
        ].map(([key, label, ikon]) => (
          <Pressable
            key={key}
            onPress={() => setFul(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: ful === key }}
            style={[styles.ful, ful === key && styles.aktivFul]}
          >
            <Ionicons
              name={ikon}
              size={19}
              color={ful === key ? '#fff' : '#77828D'}
            />
            <Text
              style={[
                styles.fulSzoveg,
                ful === key && styles.aktivFulSzoveg
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.eszkoztar}>
        <Pressable
          onPress={betoltes}
          disabled={frissites}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.eszkozGomb,
            (pressed || frissites) && styles.halvany
          ]}
        >
          <Ionicons name="refresh-outline" size={19} color="#008D99" />
          <Text style={styles.eszkozSzoveg}>
            {frissites ? 'Frissítés...' : 'Frissítés'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('User', {
            token,
            felhasznaloId,
            felhasznaloNev,
            adminNezet: true
          })}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.eszkozGomb,
            pressed && styles.halvany
          ]}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={19}
            color="#008D99"
          />
          <Text style={styles.eszkozSzoveg}>Saját chatoldal</Text>
        </Pressable>

        <Pressable
          onPress={kijelentkezes}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.eszkozGomb,
            styles.kilepesGomb,
            pressed && styles.halvany
          ]}
        >
          <Ionicons name="log-out-outline" size={19} color="#B00020" />
          <Text style={styles.kilepesSzoveg}>Kijelentkezés</Text>
        </Pressable>
      </View>

      {hiba ? (
        <View style={styles.hibaKartya}>
          <Ionicons
            name="alert-circle-outline"
            size={21}
            color="#B00020"
          />
          <Text style={styles.hiba}>{hiba}</Text>
        </View>
      ) : null}

      <Text style={styles.listaCim}>
        {ful === 'jelentesek' ? 'Jelentések' : 'Felhasználók'}
      </Text>
      <Text style={styles.info}>
        A legutóbbi legfeljebb 500 elem látható.
      </Text>

      {ful === 'users' && (
        <View style={styles.kereso}>
          <Ionicons name="search-outline" size={21} color="#77828D" />
          <TextInput
            value={felhasznaloKereses}
            onChangeText={setFelhasznaloKereses}
            placeholder="Név, e-mail vagy azonosító..."
            placeholderTextColor="#929CA5"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Felhasználó keresése"
            style={styles.keresoInput}
          />
          {felhasznaloKereses !== '' && (
            <Pressable
              onPress={() => setFelhasznaloKereses('')}
              accessibilityRole="button"
              accessibilityLabel="Keresés törlése"
              style={{ padding: 8 }}
            >
              <Ionicons
                name="close-circle"
                size={21}
                color="#77828D"
              />
            </Pressable>
          )}
        </View>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={styles.lista}
        data={ful === 'jelentesek' ? jelentesek : szurtUsers}
        keyExtractor={item => String(item.id ?? item.Id)}
        extraData={mentes}
        refreshing={frissites}
        onRefresh={betoltes}
        alwaysBounceVertical
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={fejlec}
        ListEmptyComponent={
          <View style={styles.uresKartya}>
            <Ionicons
              name={ful === 'jelentesek' ? 'flag-outline' : 'people-outline'}
              size={34}
              color="#8CBCC1"
            />
            <Text style={styles.uresSzoveg}>
              {frissites
                ? 'Betöltés...'
                : hiba
                  ? 'Az adatok nem elérhetők.'
                  : ful === 'users' && keresett
                    ? 'Nincs a keresésnek megfelelő felhasználó.'
                    : 'Nincs megjeleníthető elem.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => ful === 'users' ? (
          <View style={styles.kartya}>
            <View style={styles.kartyaFejlec}>
              <View style={styles.avatar}>
                <Ionicons
                  name="person-outline"
                  size={23}
                  color="#008D99"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.nev}>{item.Felhasznalo}</Text>
                <Text style={styles.azonosito}>
                  Azonosító: #{item.Id}
                </Text>
              </View>

              {Number(item.is_admin) === 1 && (
                <View style={styles.adminJelzes}>
                  <Text style={styles.adminSzoveg}>Admin</Text>
                </View>
              )}
            </View>

            <Text style={styles.adat}>{item.Email}</Text>

            {Number(item.Id) !== Number(felhasznaloId) && (
              <Pressable
                onPress={() => adminUzenet(item)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.uzenetGomb,
                  pressed && styles.halvany
                ]}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={19}
                  color="#fff"
                />
                <Text style={styles.uzenetGombSzoveg}>
                  Üzenet írása
                </Text>
              </Pressable>
            )}

            {Number(item.is_admin) !== 1 &&
              Number(item.Id) !== Number(felhasznaloId) && (
                <Pressable
                  disabled={mentes !== null}
                  onPress={() => felhasznaloTorlese(item)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.torlesGomb,
                    (pressed || mentes !== null) && styles.halvany
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color="#B00020"
                  />
                  <Text style={styles.torlesSzoveg}>
                    {mentes === 'user-' + item.Id
                      ? 'Törlés...'
                      : 'Felhasználó törlése'}
                  </Text>
                </Pressable>
              )}
          </View>
        ) : (
          <View style={styles.kartya}>
            <View style={styles.jelentesFejlec}>
              <Text style={[styles.nev, { flex: 1 }]}>{item.ok}</Text>

              <View
                style={[
                  styles.allapotJelzes,
                  item.allapot === 'uj' && styles.ujJelzes,
                  item.allapot === 'vizsgalat' && styles.vizsgalatJelzes
                ]}
              >
                <Text style={styles.allapotSzoveg}>
                  {ALLAPOTOK[item.allapot] || item.allapot}
                </Text>
              </View>
            </View>

            <Text style={styles.adat}>
              Jelentő: {item.jelento_nev || 'Törölt felhasználó'}
              {' '}(#{item.jelento_id})
            </Text>
            <Text style={styles.adat}>
              Jelentett: {item.jelentett_nev || 'Törölt felhasználó'}
              {' '}(#{item.jelentett_id})
            </Text>
            <Text style={styles.azonosito}>
              Beszélgetés: #{item.talalkozas_id}
            </Text>

            <View style={styles.leirasKartya}>
              <Text style={styles.leiras}>
                {item.leiras || 'Nincs külön leírás.'}
              </Text>
            </View>

            <Text style={styles.datum}>
              {String(item.letrehozva || '')}
            </Text>

            <View style={styles.allapotGombok}>
              {Object.entries(ALLAPOTOK).map(([key, label]) => (
                <Pressable
                  key={key}
                  disabled={mentes !== null || item.allapot === key}
                  onPress={() => allapotMentese(item.id, key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.allapot === key }}
                  style={({ pressed }) => [
                    styles.allapotGomb,
                    item.allapot === key && styles.kivalasztott,
                    (pressed || mentes !== null) && styles.halvany
                  ]}
                >
                  <Text
                    style={[
                      styles.allapotGombSzoveg,
                      item.allapot === key && styles.kivalasztottSzoveg
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {mentes === item.id && (
              <Text style={styles.info}>Mentés...</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F8'
  },
  lista: {
    flexGrow: 1,
    padding: 20,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center'
  },
  fejlec: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF7F8',
    marginRight: 14
  },
  cim: {
    fontSize: 23,
    fontWeight: '700',
    color: '#17212B'
  },
  alcim: {
    fontSize: 14,
    color: '#77828D',
    marginTop: 5
  },
  fulek: {
    flexDirection: 'row',
    padding: 5,
    gap: 5,
    borderRadius: 18,
    backgroundColor: '#EAF0F2',
    marginBottom: 16
  },
  ful: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderRadius: 14
  },
  aktivFul: {
    backgroundColor: '#008D99'
  },
  fulSzoveg: {
    fontSize: 14,
    fontWeight: '600',
    color: '#52606D'
  },
  aktivFulSzoveg: {
    color: '#fff'
  },
  eszkoztar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20
  },
  eszkozGomb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EAF7F8'
  },
  eszkozSzoveg: {
    fontSize: 13,
    fontWeight: '600',
    color: '#008D99'
  },
  kilepesGomb: {
    backgroundColor: '#FCEDEF'
  },
  kilepesSzoveg: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B00020'
  },
  listaCim: {
    fontSize: 21,
    fontWeight: '700',
    color: '#17212B'
  },
  info: {
    fontSize: 12,
    lineHeight: 18,
    color: '#77828D',
    marginTop: 8,
    marginBottom: 16
  },
  kereso: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    minHeight: 52,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E4EAED',
    borderRadius: 16,
    backgroundColor: '#fff'
  },
  keresoInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 14,
    fontSize: 15,
    color: '#17212B'
  },
  kartya: {
    padding: 18,
    marginBottom: 14,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#263B45',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2
  },
  kartyaFejlec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF7F8'
  },
  nev: {
    fontSize: 17,
    fontWeight: '700',
    color: '#17212B'
  },
  adat: {
    fontSize: 14,
    lineHeight: 21,
    color: '#52606D',
    marginBottom: 6
  },
  azonosito: {
    fontSize: 12,
    color: '#77828D',
    marginTop: 5
  },
  adminJelzes: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#EAF7F8'
  },
  adminSzoveg: {
    fontSize: 11,
    fontWeight: '700',
    color: '#008D99'
  },
  uzenetGomb: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 13,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#008D99'
  },
  uzenetGombSzoveg: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff'
  },
  torlesGomb: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 13,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#FCEDEF'
  },
  torlesSzoveg: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B00020'
  },
  jelentesFejlec: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16
  },
  allapotJelzes: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#EAF7F8'
  },
  ujJelzes: {
    backgroundColor: '#FCEDEF'
  },
  vizsgalatJelzes: {
    backgroundColor: '#FFF3DB'
  },
  allapotSzoveg: {
    fontSize: 11,
    fontWeight: '600',
    color: '#52606D'
  },
  leirasKartya: {
    padding: 14,
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFB'
  },
  leiras: {
    fontSize: 14,
    lineHeight: 21,
    color: '#52606D'
  },
  datum: {
    fontSize: 11,
    color: '#77828D',
    marginVertical: 12
  },
  allapotGombok: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  allapotGomb: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#EAF0F2'
  },
  allapotGombSzoveg: {
    fontSize: 12,
    fontWeight: '600',
    color: '#52606D'
  },
  kivalasztott: {
    backgroundColor: '#008D99'
  },
  kivalasztottSzoveg: {
    color: '#fff'
  },
  hibaKartya: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FCEDEF',
    marginBottom: 18
  },
  hiba: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#B00020'
  },
  uresKartya: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    backgroundColor: '#fff'
  },
  uresSzoveg: {
    textAlign: 'center',
    fontSize: 14,
    color: '#77828D',
    marginTop: 12
  },
  halvany: {
    opacity: 0.5
  }
});