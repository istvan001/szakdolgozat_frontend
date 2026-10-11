import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';

const IP = require('./ipcim');

function MuveletGomb({ title, onPress, disabled, masodlagos = false }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.gomb,
        masodlagos && styles.masodlagosGomb,
        (pressed || disabled) && styles.megnyomva
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

export default function EmailAction({ route, navigation }) {
  const mode = route.params?.mode === 'verify' ? 'verify' : 'reset';
  const [email, setEmail] = useState(route.params?.email || '');
  const [kod, setKod] = useState('');
  const [jelszo, setJelszo] = useState('');
  const [jelszoUjra, setJelszoUjra] = useState('');
  const [folyamatban, setFolyamatban] = useState(false);
  const fejlecMagassag = useHeaderHeight();
  const [masodikLepes, setMasodikLepes] = useState(
    mode === 'verify' && Boolean(route.params?.email)
  );

  const jelzes = (cim, uzenet, kesz = false) => {
    if (Platform.OS === 'web') {
      window.alert(`${cim}: ${uzenet}`);
      if (kesz) navigation.navigate('Login');
    } else {
      Alert.alert(
        cim,
        uzenet,
        kesz
          ? [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
          : undefined
      );
    }
  };

  const ker = async (
    url,
    adat,
    sikerUzenet,
    kesz = false,
    sikerUtan = null
  ) => {
    if (folyamatban) return;
    setFolyamatban(true);

    try {
      const response = await fetch(IP.ipcim + url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adat)
      });

      const szoveg = await response.text();

      if (!response.ok) {
        return jelzes('Hiba', szoveg || 'Nem sikerült a művelet.');
      }

      if (sikerUtan) sikerUtan();
      jelzes('Sikeres', sikerUzenet, kesz);
    } catch (error) {
      jelzes('Hálózati hiba', 'Nem sikerült elérni a szervert.');
    } finally {
      setFolyamatban(false);
    }
  };

  const ujKod = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return jelzes('Hiányzó adat', 'Adj meg egy érvényes e-mail-címet.');
    }

    ker(
      '/kod-keres',
      { Email: email.trim(), tipus: mode },
      'Ha a címhez tartozik megfelelő fiók, elküldtük a 10 percig érvényes kódot.',
      false,
      () => {
        setMasodikLepes(true);
        setKod('');
      }
    );
  };

  const megerosites = () => {
    if (!email.trim() || !/^\d{8}$/.test(kod)) {
      return jelzes(
        'Hiányzó adat',
        'Add meg az e-mail-címet és a 8 számjegyű kódot.'
      );
    }

    if (mode === 'reset') {
      if (jelszo.length < 8 || jelszo !== jelszoUjra) {
        return jelzes(
          'Jelszóhiba',
          'A két jelszó egyezzen meg, és legalább 8 karakterből álljon.'
        );
      }

      ker(
        '/jelszo-visszaallitas',
        { Email: email.trim(), kod, ujJelszo: jelszo },
        'Az új jelszavaddal bejelentkezhetsz.',
        true
      );
    } else {
      ker(
        '/email-megerosites',
        { Email: email.trim(), kod },
        'Az e-mail-címedet megerősítettük. Most már bejelentkezhetsz.',
        true
      );
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
        <View style={styles.tartalom}>
          <View style={styles.fejlec}>
            <View style={styles.logo}>
              <Ionicons
                name={
                  mode === 'reset'
                    ? 'lock-closed-outline'
                    : 'mail-outline'
                }
                size={36}
                color="#008D99"
              />
            </View>
            <Text style={styles.marka}>Randotalk</Text>
          </View>

          <View style={styles.kartya}>
            <View style={styles.lepesJelzes}>
              {[1, 2].map(szam => (
                <View
                  key={szam}
                  style={[
                    styles.lepesVonal,
                    szam <= (masodikLepes ? 2 : 1) && styles.lepesAktiv
                  ]}
                />
              ))}
            </View>

            <Text style={styles.cim}>
              {mode === 'reset'
                ? 'Elfelejtett jelszó'
                : 'E-mail megerősítése'}
            </Text>

            <Text style={styles.leiras}>
              {masodikLepes
                ? mode === 'reset'
                  ? 'Add meg az e-mailben kapott kódot és az új jelszavadat.'
                  : 'Add meg az e-mailben kapott kódot.'
                : 'Add meg a regisztrációnál használt e-mail-címedet.'}
            </Text>

            {!masodikLepes ? (
              <>
                <Text style={styles.mezoCim}>E-mail-cím</Text>

                <View style={styles.emailMezo}>
                  <Ionicons
                    name="mail-outline"
                    size={21}
                    color="#77828D"
                  />
                  <TextInput
                    style={styles.emailInput}
                    placeholder="E-mail-cím"
                    placeholderTextColor="#929CA5"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="E-mail-cím"
                  />
                </View>

                <MuveletGomb
                  title={folyamatban ? 'Kód küldése...' : 'Kód küldése'}
                  onPress={ujKod}
                  disabled={folyamatban}
                />
              </>
            ) : (
              <>
                <View style={styles.emailKartya}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#008D99"
                  />
                  <Text style={styles.emailSzoveg}>
                    {email.trim()}
                  </Text>
                </View>

                <Text style={styles.mezoCim}>Hitelesítő kód</Text>
                <TextInput
                  style={[styles.input, styles.kodInput]}
                  placeholder="8 számjegyű kód"
                  placeholderTextColor="#929CA5"
                  value={kod}
                  onChangeText={setKod}
                  keyboardType="number-pad"
                  maxLength={8}
                  accessibilityLabel="Hitelesítő kód"
                />

                {mode === 'reset' && (
                  <>
                    <Text style={styles.mezoCim}>Új jelszó</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Legalább 8 karakter"
                      placeholderTextColor="#929CA5"
                      value={jelszo}
                      onChangeText={setJelszo}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      accessibilityLabel="Új jelszó"
                    />

                    <Text style={styles.mezoCim}>Új jelszó újra</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Jelszó megerősítése"
                      placeholderTextColor="#929CA5"
                      value={jelszoUjra}
                      onChangeText={setJelszoUjra}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      accessibilityLabel="Új jelszó megerősítése"
                    />
                  </>
                )}

                <MuveletGomb
                  title={
                    folyamatban
                      ? 'Feldolgozás...'
                      : mode === 'reset'
                        ? 'Jelszó módosítása'
                        : 'E-mail megerősítése'
                  }
                  onPress={megerosites}
                  disabled={folyamatban}
                />

                <MuveletGomb
                  title="Kód újraküldése"
                  onPress={ujKod}
                  disabled={folyamatban}
                  masodlagos
                />

                <Pressable
                  disabled={folyamatban}
                  onPress={() => {
                    setMasodikLepes(false);
                    setKod('');
                    setJelszo('');
                    setJelszoUjra('');
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.szovegesGomb,
                    (pressed || folyamatban) && styles.megnyomva
                  ]}
                >
                  <Text style={styles.szovegesGombSzoveg}>
                    Másik e-mail-cím megadása
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
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
  tartalom: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center'
  },
  fejlec: {
    alignItems: 'center',
    marginBottom: 28
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF7F8',
    marginBottom: 16
  },
  marka: {
    fontSize: 30,
    fontWeight: '700',
    color: '#17212B'
  },
  kartya: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#263B45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2
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
    marginBottom: 10
  },
  leiras: {
    fontSize: 14,
    lineHeight: 21,
    color: '#77828D',
    marginBottom: 24
  },
  mezoCim: {
    fontSize: 13,
    fontWeight: '600',
    color: '#52606D',
    marginBottom: 8
  },
  emailMezo: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    paddingLeft: 14,
    borderWidth: 1,
    borderColor: '#E4EAED',
    borderRadius: 14,
    backgroundColor: '#F8FAFB',
    marginBottom: 14
  },
  emailInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    color: '#17212B'
  },
  input: {
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E4EAED',
    borderRadius: 14,
    backgroundColor: '#F8FAFB',
    fontSize: 16,
    color: '#17212B',
    marginBottom: 16
  },
  kodInput: {
    textAlign: 'center'
  },
  emailKartya: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#EAF7F8',
    marginBottom: 22
  },
  emailSzoveg: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#006C76'
  },
  gomb: {
    minHeight: 54,
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
  szovegesGomb: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 6
  },
  szovegesGombSzoveg: {
    fontSize: 13,
    fontWeight: '600',
    color: '#77828D',
    textAlign: 'center'
  },
  megnyomva: {
    opacity: 0.5
  }
});