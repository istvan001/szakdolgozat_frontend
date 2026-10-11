import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  Button,
  FlatList,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  AppState,
  useWindowDimensions,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import ProtectedImage from './ProtectedImage';
import PartnerAdatlap from './PartnerAdatlap';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  aktivChatBeallitasa,
  helyiErtesites
} from './NotificationSupport';
import { useHeaderHeight } from '@react-navigation/elements';
import { TextInputWrapper } from 'expo-paste-input';
import useOnlineAllapot from './useOnlineAllapot';
import {
  SafeAreaView,
  useSafeAreaInsets
} from 'react-native-safe-area-context';

const IP = require('./ipcim');

export default function Chat({ route, navigation }) {
  const {
    talalkozasId,
    partnerId,
    partnerNev,
    felhasznaloId,
    token
  } = route.params;
const [visszavonasFolyamatban, setVisszavonasFolyamatban] = useState(false);
const visszavonasZar = useRef(false);
  const insets = useSafeAreaInsets();
  const fokuszban = useIsFocused();
  const onlineAllapotok = useOnlineAllapot(token, [partnerId], fokuszban);
  const [appAktiv, setAppAktiv] = useState(
    AppState.currentState === 'active'
  );
const [reakcioFolyamatban, setReakcioFolyamatban] = useState(false);
const reakcioZar = useRef(false);
  const {
    width: ablakSzelesseg,
    height: ablakMagassag
  } = useWindowDimensions();

  const navigacioFejlecMagassag = useHeaderHeight();
  const [megnyitottKep, setMegnyitottKep] = useState(null);
  const [jelentesNyitva, setJelentesNyitva] = useState(false);
  const [jelentesOk, setJelentesOk] = useState('Zaklatás');
  const [jelentesLeiras, setJelentesLeiras] = useState('');
  const [muveletFolyamatban, setMuveletFolyamatban] = useState(false);
  const [chatFejlecMagassag, setChatFejlecMagassag] = useState(90);
  const [kuldesSavMagassag, setKuldesSavMagassag] = useState(70);
  const [aktualisTalalkozasId, setAktualisTalalkozasId] = useState(
    talalkozasId || null
  );
  const [uzenet, setUzenet] = useState('');
  const [kuldesFolyamatban, setKuldesFolyamatban] = useState(false);
  const [uzenetek, setUzenetek] = useState([]);
  const [partnerIr, setPartnerIr] = useState(false);
  const [valaszUzenet, setValaszUzenet] = useState(null);
  const [valaszMenu, setValaszMenu] = useState(null);
  const [kiemeltUzenetId, setKiemeltUzenetId] = useState(null);

  const muveletZar = useRef(false);
  const kuldesZar = useRef(false);
  const billentyuKepZar = useRef(false);
  const ws = useRef(null);
  const listaRef = useRef(null);
  const inputRef = useRef(null);
  const sajatGepelesIdozito = useRef(null);
  const partnerGepelesIdozito = useRef(null);
  const utolsoGepelesKuldes = useRef(0);
  const gepelesAktiv = useRef(false);
  const chatAktiv = useRef(false);
  const webPoziciok = useRef(new Map());
  const automatikusGorgetes = useRef(true);
  const ugrasCel = useRef(null);
  const ugrasTimer = useRef(null);
  const kiemelesTimer = useRef(null);

  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      setAppAktiv(state === 'active');
    });
    return () => listener.remove();
  }, []);

  const biztonsagiMuvelet = async (utvonal, adatok) => {
    if (muveletZar.current) return;

    muveletZar.current = true;
    setMuveletFolyamatban(true);

    try {
      const response = await fetch(IP.ipcim + utvonal, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(adatok)
      });

      if (!response.ok) throw new Error(await response.text());

      if (utvonal === '/tiltas') {
        navigation.goBack();
      } else {
        setJelentesNyitva(false);
        setJelentesLeiras('');
        Alert.alert(
          'Jelentés elküldve',
          'A jelentésedet rögzítettük. A tiltás külön választható.'
        );
      }
    } catch (error) {
      Alert.alert('Hiba', error.message || 'Nem sikerült menteni.');
    } finally {
      muveletZar.current = false;
      setMuveletFolyamatban(false);
    }
  };

  const partnerTiltasa = () => Alert.alert(
    'Partner tiltása',
    'Tiltás után nem tudtok új üzenetet küldeni egymásnak, és a beszélgetés eltűnik a listából. Letiltod?',
    [
      { text: 'Mégse', style: 'cancel' },
      {
        text: 'Tiltás',
        style: 'destructive',
        onPress: () => biztonsagiMuvelet('/tiltas', { partnerId })
      }
    ]
  );

  const gepelesKuldes = ir => {
    const socket = ws.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({
      type: 'typing',
      partnerId: Number(partnerId),
      ir
    }));
  };

  const gepelesLeallitasa = () => {
    clearTimeout(sajatGepelesIdozito.current);
    if (gepelesAktiv.current) gepelesKuldes(false);
    gepelesAktiv.current = false;
    utolsoGepelesKuldes.current = 0;
  };

  const partnerGepelesTorlese = () => {
    clearTimeout(partnerGepelesIdozito.current);
    setPartnerIr(false);
  };

  const uzenetValtozas = szoveg => {
    setUzenet(szoveg);
    clearTimeout(sajatGepelesIdozito.current);

    if (!szoveg.trim() || !chatAktiv.current) {
      gepelesLeallitasa();
      return;
    }

    const most = Date.now();

    if (!gepelesAktiv.current ||
        most - utolsoGepelesKuldes.current >= 1000) {
      gepelesKuldes(true);
      utolsoGepelesKuldes.current = most;
    }

    gepelesAktiv.current = true;
    sajatGepelesIdozito.current = setTimeout(
      gepelesLeallitasa,
      2000
    );
  };

  useEffect(() => {
    chatAktiv.current = fokuszban && appAktiv;

    if (!chatAktiv.current) {
      gepelesLeallitasa();
      partnerGepelesTorlese();
    }

    return () => {
      chatAktiv.current = false;
      gepelesLeallitasa();
      clearTimeout(partnerGepelesIdozito.current);
    };
  }, [fokuszban, appAktiv, partnerId, token]);

  useEffect(() => {
    aktivChatBeallitasa(
      fokuszban && appAktiv ? aktualisTalalkozasId : null
    );
    return () => aktivChatBeallitasa(null);
  }, [fokuszban, appAktiv, aktualisTalalkozasId]);

  useEffect(() => {
    if (!fokuszban || !appAktiv ||
        !aktualisTalalkozasId || !uzenetek.length) return;

    const maxId = Math.max(
      ...uzenetek.map(item => Number(item.id) || 0)
    );

    if (!maxId) return;

    fetch(IP.ipcim + '/uzenetek-olvasott', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        talalkozasId: aktualisTalalkozasId,
        utolsoUzenetId: maxId
      })
    }).then(response => {
      if (!response.ok) {
        console.error('Olvasottság mentése sikertelen:', response.status);
      }
    }).catch(error => {
      console.error('Olvasottság hálózati hiba:', error);
    });
  }, [fokuszban, appAktiv, aktualisTalalkozasId, uzenetek, token]);

  const idezetSzoveg = item => {
    if (item?.kep_url) {
      return /\.gif(?:\?|$)/i.test(item.kep_url) ? 'GIF' : 'Kép';
    }
    return item?.uzenet || 'Az üzenet nem érhető el';
  };

  const kuldoNev = item => (
    Number(item?.kuldo_id) === Number(felhasznaloId)
      ? 'Te'
      : partnerNev
  );

  const valaszKivalasztasa = item => {
    const aktualis = uzenetek.find(
  u => Number(u.id) === Number(item.id)
);

if (Number(aktualis?.visszavont) === 1) return;
    if (kuldesZar.current) return;
    setValaszUzenet(item);
    setValaszMenu(null);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const eredetiUzenethez = id => {
    const index = uzenetek.findIndex(
      item => Number(item.id) === Number(id)
    );

    if (index < 0) {
      Alert.alert('Üzenet', 'Az eredeti üzenet már nem érhető el.');
      return;
    }

    automatikusGorgetes.current = false;
    clearTimeout(ugrasTimer.current);
    clearTimeout(kiemelesTimer.current);
    setKiemeltUzenetId(Number(id));

    kiemelesTimer.current = setTimeout(() => {
      setKiemeltUzenetId(null);
    }, 2500);

    if (Platform.OS === 'web') {
      listaRef.current?.scrollTo({
        y: Math.max(
          0,
          (webPoziciok.current.get(Number(id)) || 0) - 20
        ),
        animated: true
      });
    } else {
      ugrasCel.current = { index, probalkozas: 0 };
      listaRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5
      });
    }
  };

  const ugrasSikertelen = info => {
    const cel = ugrasCel.current;

    if (!cel || cel.index !== info.index ||
        cel.probalkozas >= 8) return;

    cel.probalkozas++;

    listaRef.current?.scrollToOffset({
      offset: Math.max(0, info.averageItemLength * info.index),
      animated: false
    });

    clearTimeout(ugrasTimer.current);

    ugrasTimer.current = setTimeout(() => {
      if (ugrasCel.current === cel) {
        listaRef.current?.scrollToIndex({
          index: cel.index,
          animated: true,
          viewPosition: 0.5
        });
      }
    }, 200);
  };

  useEffect(() => () => {
    clearTimeout(ugrasTimer.current);
    clearTimeout(kiemelesTimer.current);
  }, []);

  const listaAljaraGorgetes = (
    animalt = true,
    kesleltetes = 200
  ) => {
    setTimeout(() => {
      if (!listaRef.current || !automatikusGorgetes.current) return;
      listaRef.current.scrollToEnd({ animated: animalt });
    }, kesleltetes);
  };

  const uzenetekBetoltese = async betoltendoTalalkozasId => {
    if (!betoltendoTalalkozasId) return;

    try {
      const response = await fetch(
        IP.ipcim + '/uzenetek/' + betoltendoTalalkozasId,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        console.log('Üzenetek lekérése sikertelen');
        return;
      }

      setUzenetek(await response.json());
    } catch (error) {
      console.error('Üzenetek betöltési hiba:', error);
    }
  };

  useEffect(() => {
    if (!fokuszban || !appAktiv || !aktualisTalalkozasId) return;

    uzenetekBetoltese(aktualisTalalkozasId);

    const timer = setInterval(() => {
      uzenetekBetoltese(aktualisTalalkozasId);
    }, 5000);

    return () => clearInterval(timer);
  }, [aktualisTalalkozasId, fokuszban, appAktiv, token]);

  useEffect(() => {
    const wsUrl = IP.ipcim.replace(/^http/, 'ws');
    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'register', token }));
    };

    socket.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'messageWithdrawn') {
  if (Number(data.talalkozasId) === Number(talalkozasId) ||
      Number(data.talalkozasId) === Number(aktualisChatIdRef.current)) {
    visszavonasFrissitese(data.uzenetId);
  }
  return;
}
        if (data.type === 'reaction') {
  if (Number(data.talalkozasId) === Number(talalkozasId) ||
      Number(data.talalkozasId) === Number(aktualisChatIdRef.current)) {
    reakcioFrissitese(data.uzenetId, data.reakcio);
  }
  return;
}
        if (data.type === 'typing') {
          if (Number(data.partnerId) !== Number(partnerId) ||
              !chatAktiv.current) return;

          clearTimeout(partnerGepelesIdozito.current);
          setPartnerIr(data.ir === true);

          if (data.ir === true) {
            partnerGepelesIdozito.current = setTimeout(() => {
              setPartnerIr(false);
            }, 3500);
          }
          return;
        }

        if (data.type !== 'newMessage' || !data.message) return;
        const incomingMessage = data.message;

        if (Number(incomingMessage.kuldo_id) !== Number(partnerId)) {
          void helyiErtesites({
            talalkozasId: data.talalkozasId,
            partnerId: incomingMessage.kuldo_id
          }).catch(error => {
            console.error('Helyi értesítési hiba:', error);
          });
          return;
        }

        partnerGepelesTorlese();
        automatikusGorgetes.current = true;
        setAktualisTalalkozasId(elozo => elozo || data.talalkozasId);

        setUzenetek(elozo => (
          elozo.some(item => Number(item.id) === Number(incomingMessage.id))
            ? elozo
            : [...elozo, incomingMessage]
        ));

        listaAljaraGorgetes(true, 300);
      } catch (error) {
        console.error('WebSocket üzenet feldolgozási hiba:', error);
      }
    };

    socket.onerror = error => {
      console.error('WebSocket hiba:', error);
    };

    socket.onclose = () => {
      gepelesAktiv.current = false;
      clearTimeout(sajatGepelesIdozito.current);
      partnerGepelesTorlese();
    };

    return () => {
      gepelesLeallitasa();
      clearTimeout(partnerGepelesIdozito.current);
      socket.close();
      if (ws.current === socket) ws.current = null;
    };
  }, [felhasznaloId, partnerId, token]);

  const kepKivalasztasa = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
        base64: true
      });

      if (!result.canceled && result.assets?.[0]?.base64) {
        await uzenetKuldese(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Kép kiválasztási hiba:', error);
      Alert.alert('Hiba', 'Nem sikerült kiválasztani a képet.');
    }
  };

  const billentyuKepFogadasa = async esemeny => {
    if (esemeny.type === 'text') return;

    if (esemeny.type !== 'images') {
      Alert.alert('Nem támogatott', 'Ezt a tartalmat nem lehet elküldeni.');
      return;
    }

    if (kuldesZar.current || billentyuKepZar.current) return;

    if (esemeny.uris?.length !== 1) {
      Alert.alert('Képküldés', 'Egyszerre egy képet vagy GIF-et küldj.');
      return;
    }

    billentyuKepZar.current = true;

    try {
      const fajl = new File(esemeny.uris[0]);

      if (!fajl.exists) {
        throw new Error('A billentyűzetből érkező fájl nem olvasható.');
      }
      if (fajl.size > 4 * 1024 * 1024) {
        throw new Error('Legfeljebb 4 MB-os kép vagy GIF küldhető.');
      }

      const base64 = await fajl.base64();
      const gif = base64.startsWith('R0lGODlh') ||
        base64.startsWith('R0lGODdh');
      const jpeg = base64.startsWith('/9j/');

      if (!gif && !jpeg) {
        throw new Error(
          'Ez a fájl nem GIF vagy JPEG. A PNG és WebP matricák küldése még nincs támogatva.'
        );
      }

      await uzenetKuldese(base64, gif ? 'gif' : 'jpeg');
    } catch (error) {
      console.error('Billentyűzet képfogadási hiba:', error);
      Alert.alert('Küldési hiba', error.message || 'Nem sikerült elküldeni.');
    } finally {
      billentyuKepZar.current = false;
    }
  };

  const uzenetKuldese = async (
    kepBase64 = null,
    kepFormat = 'jpeg'
  ) => {
    if (kuldesZar.current) return;

    const kivalasztottValasz = valaszUzenet;
    const megtisztitottUzenet = kepBase64 ? '' : uzenet.trim();

    if (!megtisztitottUzenet && !kepBase64) return;

    kuldesZar.current = true;
    setKuldesFolyamatban(true);
    gepelesLeallitasa();

    try {
      const response = await fetch(IP.ipcim + '/uzenet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          felhasznaloId,
          partnerId,
          uzenet: megtisztitottUzenet,
          valaszUzenetId: kivalasztottValasz
            ? Number(kivalasztottValasz.id)
            : null,
          ...(kepBase64 ? { kepBase64, kepFormat } : {})
        })
      });

      if (!response.ok) {
        Alert.alert('Hiba', await response.text());
        return;
      }

      const data = await response.json();

      if (data.talalkozasId) {
        setAktualisTalalkozasId(elozo => elozo || data.talalkozasId);
      }

      const sajatUzenet = {
        id: data.uzenetId,
        aktualis_id: data.talalkozasId,
        kuldo_id: felhasznaloId,
        uzenet: megtisztitottUzenet,
        kep_url: data.kepUrl || null,
        valasz_uzenet_id: data.valasz_uzenet_id || null,
        valasz: data.valasz || null
      };

      automatikusGorgetes.current = true;

      setUzenetek(elozo => (
        elozo.some(item => Number(item.id) === Number(data.uzenetId))
          ? elozo
          : [...elozo, sajatUzenet]
      ));

      setValaszUzenet(elozo => (
        elozo?.id === kivalasztottValasz?.id ? null : elozo
      ));

      if (!kepBase64) setUzenet('');
      listaAljaraGorgetes(true, 400);
    } catch (error) {
      console.error('Üzenetküldési hiba:', error);
      Alert.alert('Hiba', 'Nem sikerült elküldeni az üzenetet.');
    } finally {
      kuldesZar.current = false;
      setKuldesFolyamatban(false);
    }
  };

  const reakcioFrissitese = (uzenetId, reakcio) => {
  setUzenetek(elozo => elozo.map(item => (
   Number(item.id) === Number(uzenetId) &&
Number(item.visszavont) !== 1
      ? { ...item, reakcio }
      : item
  )));
};

const reakcioKuldes = async (item, emoji) => {
  if (!item || reakcioZar.current ||
      Number(item.kuldo_id) === Number(felhasznaloId)) return;

  const aktualis = uzenetek.find(
    u => Number(u.id) === Number(item.id)
  ) || item;

  const azonosReakcio =
    Number(aktualis.reakcio?.felhasznaloId) === Number(felhasznaloId) &&
    aktualis.reakcio?.emoji === emoji;

  reakcioZar.current = true;
  setReakcioFolyamatban(true);

  try {
    const response = await fetch(IP.ipcim + '/uzenet-reakcio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        uzenetId: Number(item.id),
        emoji: azonosReakcio ? null : emoji
      })
    });

    if (!response.ok) throw new Error(await response.text());

    const adat = await response.json();
    reakcioFrissitese(adat.uzenetId, adat.reakcio);
    setValaszMenu(null);
  } catch (error) {
    Alert.alert('Hiba', error.message || 'Nem sikerült reagálni.');
  } finally {
    reakcioZar.current = false;
    setReakcioFolyamatban(false);
  }
};

const visszavonasFrissitese = uzenetId => {
  setUzenetek(elozo => elozo.map(item => {
    const eredeti = Number(item.id) === Number(uzenetId);
    const erreValaszol =
      Number(item.valasz_uzenet_id) === Number(uzenetId);

    if (eredeti) {
      return {
        ...item,
        visszavont: 1,
        uzenet: '',
        kep_url: null,
        reakcio: null,
        valasz: null
      };
    }

    return erreValaszol ? { ...item, valasz: null } : item;
  }));

  setValaszUzenet(elozo => (
    Number(elozo?.id) === Number(uzenetId) ? null : elozo
  ));

  setValaszMenu(elozo => (
    Number(elozo?.id) === Number(uzenetId) ? null : elozo
  ));
};

const uzenetVisszavonasa = async item => {
  if (!item || visszavonasZar.current ||
      Number(item.kuldo_id) !== Number(felhasznaloId)) return;

  visszavonasZar.current = true;
  setVisszavonasFolyamatban(true);

  try {
    const response = await fetch(IP.ipcim + '/uzenet-visszavonas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        uzenetId: Number(item.id)
      })
    });

    if (!response.ok) throw new Error(await response.text());

    const adat = await response.json();
    visszavonasFrissitese(adat.uzenetId);
    setValaszMenu(null);
  } catch (error) {
    Alert.alert(
      'Hiba',
      error.message || 'Nem sikerült visszavonni az üzenetet.'
    );
  } finally {
    visszavonasZar.current = false;
    setVisszavonasFolyamatban(false);
  }
};
  const utolsoSajatUzenetId = uzenetek.reduce((utolso, item) => {
  if (Number(item.kuldo_id) !== Number(felhasznaloId) ||
      Number(item.visszavont) === 1) return utolso;
  return Math.max(utolso, Number(item.id) || 0);
}, 0);
  const uzenetMegjelenitese = ({ item }) => {
    const sajat = Number(item.kuldo_id) === Number(felhasznaloId);
    if (Number(item.visszavont) === 1) {
  return (
    <View
      style={[
        styles.uzenetSor,
        sajat ? styles.sajatSor : styles.partnerSor
      ]}
    >
      <View
        style={[
          styles.uzenetBuborek,
          styles.visszavontBuborek
        ]}
      >
        <Text style={styles.visszavontSzoveg}>
          Az üzenetet visszavonták
        </Text>
      </View>
    </View>
  );
}

    return (
      <View
        style={[
          styles.uzenetSor,
          sajat ? styles.sajatSor : styles.partnerSor
        ]}
      >
        <Pressable
          onLongPress={() => {
            if (!kuldesZar.current) setValaszMenu(item);
          }}
          delayLongPress={350}
          style={[
            styles.uzenetBuborek,
            sajat ? styles.sajatBuborek : styles.partnerBuborek,
            kiemeltUzenetId === Number(item.id) && styles.kiemeltBuborek
          ]}
        >
          {item.valasz_uzenet_id != null && (
            <Pressable
              style={styles.idezet}
              onPress={() => eredetiUzenethez(item.valasz_uzenet_id)}
              accessibilityRole="button"
              accessibilityLabel="Ugrás az eredeti üzenethez"
            >
              <Text style={styles.idezetNev}>
                {item.valasz ? kuldoNev(item.valasz) : 'Eredeti üzenet'}
              </Text>
              <Text style={styles.idezetSzoveg} numberOfLines={2}>
                {idezetSzoveg(item.valasz)}
              </Text>
            </Pressable>
          )}

          {item.kep_url ? (
            <Pressable
              onPress={() => setMegnyitottKep(IP.ipcim + item.kep_url)}
              onLongPress={() => {
                if (!kuldesZar.current) setValaszMenu(item);
              }}
              delayLongPress={350}
              accessibilityRole="button"
              accessibilityLabel="Kép megnyitása nagy méretben"
            >
              <ProtectedImage
                uri={IP.ipcim + item.kep_url}
                token={token}
                style={styles.uzenetKep}
                resizeMode="contain"
              />
            </Pressable>
          ) : null}

          {item.uzenet ? (
            <Text
              style={[
                styles.uzenetSzoveg,
                sajat ? styles.sajatSzoveg : styles.partnerSzoveg
              ]}
            >
              {item.uzenet}
            </Text>
          ) : null}
          {item.reakcio && (
  <Pressable
    disabled={sajat || reakcioFolyamatban}
    onPress={() => reakcioKuldes(item, item.reakcio.emoji)}
    style={styles.reakcioJelzes}
    accessibilityRole="button"
    accessibilityLabel={
      sajat
        ? 'A partnered reakciója'
        : 'Reakció eltávolítása'
    }
  >
    <Text style={{ fontSize: 18 }}>{item.reakcio.emoji}</Text>
  </Pressable>
)}
                </Pressable>
        {sajat &&
         Number(item.id) === utolsoSajatUzenetId &&
         Number(item.olvasott) === 1 && (
          <Text style={styles.lattta}>Látta</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        Platform.OS === 'web' && {
          height: ablakMagassag - navigacioFejlecMagassag
        }
      ]}
      edges={['bottom']}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? 90 : insets.bottom + 48
        }
      >
        <View
          style={styles.header}
          onLayout={event => {
            setChatFejlecMagassag(event.nativeEvent.layout.height);
          }}
        >
          <PartnerAdatlap
            partnerId={partnerId}
            token={token}
            fejlec
            online={onlineAllapotok[partnerId] === true}
          >
            <Text style={styles.partnerNev}>{partnerNev}</Text>
          </PartnerAdatlap>

          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <Pressable
              onPress={partnerTiltasa}
              disabled={muveletFolyamatban}
              style={{ marginRight: 20, paddingVertical: 5 }}
            >
              <Text style={{ color: '#b00020' }}>Tiltás</Text>
            </Pressable>
            <Pressable
              onPress={() => setJelentesNyitva(true)}
              disabled={muveletFolyamatban || !aktualisTalalkozasId}
              style={{ paddingVertical: 5 }}
            >
              <Text
                style={{ color: aktualisTalalkozasId ? '#555' : '#aaa' }}
              >
                Jelentés
              </Text>
            </Pressable>
          </View>
        </View>

        {Platform.OS === 'web' ? (
          <ScrollView
            ref={listaRef}
            style={{
              height: Math.max(
                120,
                ablakMagassag - navigacioFejlecMagassag -
                chatFejlecMagassag - kuldesSavMagassag - 12
              ),
              flexGrow: 0,
              flexShrink: 0
            }}
            contentContainerStyle={styles.listaTartalom}
            onContentSizeChange={() => listaAljaraGorgetes(false, 0)}
            keyboardShouldPersistTaps="handled"
          >
            {uzenetek.map((item, index) => (
              <View
                key={item.id ?? index}
                onLayout={event => {
                  webPoziciok.current.set(
                    Number(item.id),
                    event.nativeEvent.layout.y
                  );
                }}
              >
                {uzenetMegjelenitese({ item })}
              </View>
            ))}
          </ScrollView>
        ) : (
          <FlatList
            ref={listaRef}
            data={uzenetek}
            extraData={kiemeltUzenetId}
            style={styles.lista}
            contentContainerStyle={styles.listaTartalom}
            keyExtractor={(item, index) => (
              item.id != null ? item.id.toString() : index.toString()
            )}
            renderItem={uzenetMegjelenitese}
            onScrollToIndexFailed={ugrasSikertelen}
            onContentSizeChange={() => listaAljaraGorgetes(false, 0)}
            onLayout={() => listaAljaraGorgetes(false, 0)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            showsVerticalScrollIndicator
          />
        )}

        <View
          style={styles.kuldesContainer}
          onLayout={event => {
            setKuldesSavMagassag(event.nativeEvent.layout.height);
          }}
        >
          <View style={{ width: '100%' }}>
            {valaszUzenet && (
              <View style={styles.valaszSav}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.idezetNev}>
                    Válasz: {kuldoNev(valaszUzenet)}
                  </Text>
                  <Text style={styles.idezetSzoveg} numberOfLines={2}>
                    {idezetSzoveg(valaszUzenet)}
                  </Text>
                </View>
                <Pressable
                  disabled={kuldesFolyamatban}
                  onPress={() => setValaszUzenet(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Válasz megszakítása"
                  style={{ padding: 10 }}
                >
                  <Text style={{ fontSize: 20 }}>✕</Text>
                </Pressable>
              </View>
            )}

            {partnerIr && fokuszban && appAktiv && (
              <Text
                style={{ color: '#777', fontSize: 12, marginBottom: 5 }}
              >
                {partnerNev} éppen ír…
              </Text>
            )}

            <View
              style={{ flexDirection: 'row', alignItems: 'flex-end' }}
            >
              <Pressable
  onPress={kepKivalasztasa}
  disabled={kuldesFolyamatban}
  accessibilityRole="button"
  accessibilityLabel="Kép kiválasztása"
  style={({ pressed }) => [
    styles.kepGomb,
    (pressed || kuldesFolyamatban) && { opacity: 0.5 }
  ]}
>
  <Ionicons name="image-outline" size={25} color="#008D99" />
</Pressable>

              <View style={{ flex: 1 }}>
                <TextInputWrapper onPaste={billentyuKepFogadasa}>
                  <TextInput
                    ref={inputRef}
                    style={[styles.input, { flex: 0 }]}
                    value={uzenet}
                    onChangeText={uzenetValtozas}
                    onBlur={gepelesLeallitasa}
                    placeholder="Írj egy üzenetet..."
                    placeholderTextColor="#777"
                    multiline
                    textAlignVertical="center"
                  />
                </TextInputWrapper>
              </View>

             <Pressable
  onPress={() => uzenetKuldese()}
  disabled={kuldesFolyamatban}
  accessibilityRole="button"
  accessibilityLabel="Üzenet küldése"
  style={({ pressed }) => [
    styles.kuldesGomb,
    (pressed || kuldesFolyamatban) && { opacity: 0.5 }
  ]}
>
  <Ionicons name="send" size={21} color="#fff" />
</Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={Boolean(valaszMenu)}
        transparent
        animationType="fade"
        onRequestClose={() => setValaszMenu(null)}
      >
        <View style={styles.valaszMenuHatter}>
          <View style={styles.valaszMenuKartya}>
            <Text style={styles.idezetNev}>
              {valaszMenu ? kuldoNev(valaszMenu) : ''}
            </Text>
            <Text numberOfLines={3} style={{ marginVertical: 12 }}>
              {idezetSzoveg(valaszMenu)}
            </Text>
            {valaszMenu &&
  Number(valaszMenu.kuldo_id) !== Number(felhasznaloId) && (
    <View style={styles.reakcioValaszto}>
      {['❤️', '😂', '😮', '😢', '👍'].map(emoji => {
        const aktualis = uzenetek.find(
          item => Number(item.id) === Number(valaszMenu.id)
        );

        const kivalasztott =
          aktualis?.reakcio?.emoji === emoji &&
          Number(aktualis?.reakcio?.felhasznaloId) ===
            Number(felhasznaloId);

        return (
          <Pressable
            key={emoji}
            disabled={reakcioFolyamatban}
            onPress={() => reakcioKuldes(valaszMenu, emoji)}
            accessibilityRole="button"
            accessibilityLabel={`${emoji} reakció`}
            style={[
              styles.reakcioGomb,
              kivalasztott && styles.reakcioKivalasztott
            ]}
          >
            <Text style={{ fontSize: 25 }}>{emoji}</Text>
          </Pressable>
        );
      })}
    </View>
  )}
            <Button
              title="Válasz"
              disabled={kuldesFolyamatban}
              onPress={() => {
                if (valaszMenu) valaszKivalasztasa(valaszMenu);
              }}
            />
            {valaszMenu &&
  Number(valaszMenu.kuldo_id) === Number(felhasznaloId) && (
    <Pressable
      disabled={visszavonasFolyamatban || kuldesFolyamatban}
      onPress={() => uzenetVisszavonasa(valaszMenu)}
      style={{ paddingVertical: 14, alignItems: 'center' }}
    >
      <Text style={{ color: '#b00020' }}>
        {visszavonasFolyamatban
          ? 'Visszavonás...'
          : 'Üzenet visszavonása'}
      </Text>
    </Pressable>
  )}
            <Pressable
              onPress={() => setValaszMenu(null)}
              style={{ padding: 14, alignItems: 'center' }}
            >
              <Text>Mégse</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={jelentesNyitva}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!muveletFolyamatban) setJelentesNyitva(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: 24,
            backgroundColor: 'rgba(0,0,0,0.5)'
          }}
        >
          <ScrollView
            style={{
              flexGrow: 0,
              maxHeight: '90%',
              backgroundColor: '#fff',
              borderRadius: 12
            }}
            contentContainerStyle={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                marginBottom: 12
              }}
            >
              Partner jelentése
            </Text>
            {['Zaklatás', 'Sértő tartalom', 'Spam', 'Egyéb'].map(ok => (
              <Pressable
                key={ok}
                disabled={muveletFolyamatban}
                onPress={() => setJelentesOk(ok)}
                style={{ paddingVertical: 10 }}
              >
                <Text>{jelentesOk === ok ? '● ' : '○ '}{ok}</Text>
              </Pressable>
            ))}
            <TextInput
              placeholder="Rövid leírás (nem kötelező)"
              value={jelentesLeiras}
              onChangeText={setJelentesLeiras}
              maxLength={1000}
              multiline
              editable={!muveletFolyamatban}
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 8,
                padding: 10,
                minHeight: 90,
                marginVertical: 12,
                textAlignVertical: 'top'
              }}
            />
            <Button
              title={
                muveletFolyamatban ? 'Küldés...' : 'Jelentés elküldése'
              }
              disabled={muveletFolyamatban}
              onPress={() => biztonsagiMuvelet('/jelentes', {
                partnerId,
                talalkozasId: aktualisTalalkozasId,
                ok: jelentesOk,
                leiras: jelentesLeiras
              })}
            />
            <Pressable
              disabled={muveletFolyamatban}
              onPress={() => setJelentesNyitva(false)}
              style={{ padding: 14, alignItems: 'center' }}
            >
              <Text>Mégse</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={Boolean(megnyitottKep)}
        transparent
        animationType="fade"
        onRequestClose={() => setMegnyitottKep(null)}
      >
        <Pressable
          style={styles.kepHatterszin}
          onPress={() => setMegnyitottKep(null)}
        >
          <Text style={styles.kepBezaras}>✕ Bezárás</Text>
          {megnyitottKep && (
            <ProtectedImage
              uri={megnyitottKep}
              token={token}
              style={{
                width: ablakSzelesseg * 0.94,
                height: ablakMagassag * 0.82
              }}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7F8'
  },
  container: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    backgroundColor: '#F5F7F8',
    paddingHorizontal: 15
  },
  header: {
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 14,
    borderRadius: 20,
    backgroundColor: '#fff'
  },
  partnerNev: {
    fontSize: 21,
    fontWeight: '700',
    color: '#17212B'
  },
  lista: {
    flex: 1,
    minHeight: 0
  },
  listaTartalom: {
    paddingTop: 4,
    paddingBottom: 20
  },
  uzenetSor: {
    width: '100%',
    marginBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  sajatSor: {
    justifyContent: 'flex-end'
  },
  partnerSor: {
    justifyContent: 'flex-start'
  },
  uzenetBuborek: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20
  },
  sajatBuborek: {
    backgroundColor: '#008D99',
    borderBottomRightRadius: 6
  },
  partnerBuborek: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 6
  },
  uzenetSzoveg: {
    fontSize: 16,
    lineHeight: 23
  },
  sajatSzoveg: {
    color: '#fff'
  },
  partnerSzoveg: {
    color: '#17212B'
  },
  uzenetKep: {
    width: 210,
    height: 210,
    borderRadius: 12,
    marginBottom: 4
  },
  lattta: {
    width: '100%',
    textAlign: 'right',
    paddingRight: 4,
    fontSize: 11,
    color: '#77828D',
    marginTop: 4
  },
  kuldesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#F5F7F8',
    borderTopWidth: 1,
    borderTopColor: '#E4EAED'
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#E4EAED',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#17212B',
    marginRight: 10,
    backgroundColor: '#fff'
  },
  kepGomb: {
    width: 42,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4
  },
  kuldesGomb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#008D99'
  },
  idezet: {
    backgroundColor: '#EAF7F8',
    borderLeftWidth: 3,
    borderLeftColor: '#008D99',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8
  },
  idezetNev: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006C76'
  },
  idezetSzoveg: {
    fontSize: 13,
    lineHeight: 18,
    color: '#52606D',
    marginTop: 3
  },
  valaszSav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF7F8',
    borderLeftWidth: 3,
    borderLeftColor: '#008D99',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10
  },
  kiemeltBuborek: {
    borderWidth: 2,
    borderColor: '#F4B860'
  },
  valaszMenuHatter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(23,33,43,0.45)',
    padding: 24
  },
  valaszMenuKartya: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 22
  },
  reakcioValaszto: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 14
  },
  reakcioGomb: {
    padding: 10,
    borderRadius: 14,
    margin: 3
  },
  reakcioKivalasztott: {
    backgroundColor: '#EAF7F8'
  },
  reakcioJelzes: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E4EAED'
  },
  visszavontBuborek: {
    backgroundColor: '#EAF0F2'
  },
  visszavontSzoveg: {
    color: '#77828D',
    fontSize: 14,
    fontStyle: 'italic'
  },
  kepHatterszin: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  kepBezaras: {
    position: 'absolute',
    top: 35,
    right: 20,
    color: '#fff',
    fontSize: 18,
    zIndex: 1
  }
});