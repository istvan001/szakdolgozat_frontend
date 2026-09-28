import React, {
  useState,
  useEffect,
  useRef
} from 'react';

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
  useWindowDimensions,
  Alert
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import ProtectedImage from './ProtectedImage';
import { useHeaderHeight } from '@react-navigation/elements';

import {
  SafeAreaView,
  useSafeAreaInsets
} from 'react-native-safe-area-context';

const IP = require('./ipcim');

export default function Chat({
  route,
  navigation
}) {

  const {
    talalkozasId,
    partnerId,
    partnerNev,
    felhasznaloId,
    token
  } = route.params;

  const insets = useSafeAreaInsets();
  const { width: ablakSzelesseg, height: ablakMagassag } = useWindowDimensions();
  const navigacioFejlecMagassag = useHeaderHeight();
  const [megnyitottKep, setMegnyitottKep] = useState(null);
  const [chatFejlecMagassag, setChatFejlecMagassag] = useState(90);
  const [kuldesSavMagassag, setKuldesSavMagassag] = useState(70);



  // =========================
  // ÁLLAPOTOK
  // =========================

  const [
    aktualisTalalkozasId,
    setAktualisTalalkozasId
  ] = useState(
    talalkozasId || null
  );


  const [
    uzenet,
    setUzenet
  ] = useState('');

  const [kuldesFolyamatban, setKuldesFolyamatban] = useState(false);


  const [
    uzenetek,
    setUzenetek
  ] = useState([]);



  // =========================
  // REFERENCIÁK
  // =========================

  const ws = useRef(null);

  const listaRef = useRef(null);


  // =========================
  // LISTA ALJÁRA GÖRGETÉS
  // =========================

  const listaAljaraGorgetes = (
    animalt = true,
    kesleltetes = 200
  ) => {

    setTimeout(() => {

      if (!listaRef.current) {
        return;
      }

      listaRef.current.scrollToEnd({
        animated: animalt
      });

    }, kesleltetes);

  };



  // =========================
  // KORÁBBI ÜZENETEK BETÖLTÉSE
  // =========================

  const uzenetekBetoltese = async (
    betoltendoTalalkozasId
  ) => {

    if (!betoltendoTalalkozasId) {
      return;
    }


    try {

      const response = await fetch(
        IP.ipcim +
        '/uzenetek/' +
        betoltendoTalalkozasId,
        { headers: { Authorization: `Bearer ${token}` } }
      );


      if (!response.ok) {

        console.log(
          'Üzenetek lekérése sikertelen'
        );

        return;

      }


      const data =
        await response.json();


      setUzenetek(data);


      // Betöltés után az utolsó üzenetre
      // görgetünk

      setTimeout(() => {

        if (listaRef.current) {

          listaRef.current.scrollToEnd({
            animated: false
          });

        }

      }, 400);


    } catch (error) {

      console.error(
        'Üzenetek betöltési hiba:',
        error
      );

    }

  };


  // =========================
  // KEZDŐ ÜZENETEK BETÖLTÉSE
  // =========================

  useEffect(() => {

    if (talalkozasId) {

      uzenetekBetoltese(
        talalkozasId
      );

    }

  }, [talalkozasId]);


  // =========================
  // WEBSOCKET KAPCSOLAT
  // =========================

  useEffect(() => {

    const wsUrl =
      IP.ipcim.replace(
        'http://',
        'ws://'
      ).replace(
        'https://',
        'wss://'
      );


    console.log(
      'WebSocket kapcsolódás:',
      wsUrl
    );


    const socket =
      new WebSocket(wsUrl);


    ws.current = socket;


    // =========================
    // KAPCSOLÓDÁS
    // =========================

    socket.onopen = () => {

      console.log(
        'WebSocket kapcsolat létrejött'
      );


      socket.send(
        JSON.stringify({

          type: 'register',

          token

        })
      );


      console.log(
        'Felhasználó regisztrálva WebSocketen:',
        felhasznaloId
      );

    };


    // =========================
    // ÜZENET ÉRKEZETT
    // =========================

    socket.onmessage = (event) => {

      try {

        const data =
          JSON.parse(event.data);


        console.log(
          'WebSocket üzenet:',
          data
        );


        if (
          data.type !==
          'newMessage'
        ) {

          return;

        }


        const incomingMessage =
          data.message;


        // Csak a jelenlegi partner
        // üzenetét jelenítjük meg

        if (
          Number(
            incomingMessage.kuldo_id
          ) !==
          Number(partnerId)
        ) {

          return;

        }


        // Ha még nincs találkozás,
        // most kapjuk meg az ID-t

        if (
          !aktualisTalalkozasId
        ) {

          setAktualisTalalkozasId(
            data.talalkozasId
          );

        }


        // =========================
        // DUPLIKÁCIÓ ELLENŐRZÉSE
        // =========================

        setUzenetek(
          (elozoUzenetek) => {

            const marLetezik =
              elozoUzenetek.some(
                (item) =>
                  Number(item.id) ===
                  Number(
                    incomingMessage.id
                  )
              );


            if (marLetezik) {

              return elozoUzenetek;

            }


            return [
              ...elozoUzenetek,
              incomingMessage
            ];

          }
        );


        // Új üzenet után aljára görgetés

        setTimeout(() => {

          if (listaRef.current) {

            listaRef.current.scrollToEnd({
              animated: true
            });

          }

        }, 300);


      } catch (error) {

        console.error(
          'WebSocket üzenet feldolgozási hiba:',
          error
        );

      }

    };


    // =========================
    // WEBSOCKET HIBA
    // =========================

    socket.onerror = (error) => {

      console.error(
        'WebSocket hiba:',
        error
      );

    };


    // =========================
    // KAPCSOLAT LEZÁRÁSA
    // =========================

    socket.onclose = () => {

      console.log(
        'WebSocket kapcsolat bezárva'
      );

    };


    // =========================
    // CLEANUP
    // =========================

    return () => {

      console.log(
        'WebSocket bezárása'
      );


      socket.close();

      ws.current = null;

    };

  }, [
    felhasznaloId,
    partnerId,
    token
  ]);


  // =========================
  // ÜZENET KÜLDÉSE
  // =========================

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

  const uzenetKuldese = async (kepBase64 = null) => {

    if (kuldesFolyamatban) return;

    const megtisztitottUzenet =
      kepBase64 ? '' : uzenet.trim();


    if (
      megtisztitottUzenet === '' && !kepBase64
    ) {

      return;

    }


    try {
      setKuldesFolyamatban(true);

      const response =
        await fetch(
          IP.ipcim + '/uzenet',
          {

            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
              Authorization: `Bearer ${token}`
            },

            body: JSON.stringify({

              felhasznaloId:
                felhasznaloId,

              partnerId:
                partnerId,

              uzenet:
                megtisztitottUzenet,
              ...(kepBase64 ? { kepBase64 } : {})

            })

          }
        );


      if (!response.ok) {

        const hiba =
          await response.text();


        Alert.alert(
          'Hiba',
          hiba
        );


        return;

      }


      const data =
        await response.json();


      console.log(
        'Üzenet elküldve:',
        data
      );


      // =========================
      // TALÁLKOZÁS ID
      // =========================

      if (
        !aktualisTalalkozasId &&
        data.talalkozasId
      ) {

        setAktualisTalalkozasId(
          data.talalkozasId
        );

      }


      // =========================
      // SAJÁT ÜZENET
      // =========================

      const sajatUzenet = {

        id:
          data.uzenetId,

        aktualis_id:
          data.talalkozasId,

        kuldo_id:
          felhasznaloId,

        uzenet:
          megtisztitottUzenet,
        kep_url: data.kepUrl || null

      };


      setUzenetek(
        (elozoUzenetek) => {

          const marLetezik =
            elozoUzenetek.some(
              (item) =>
                Number(item.id) ===
                Number(data.uzenetId)
            );


          if (marLetezik) {

            return elozoUzenetek;

          }


          return [
            ...elozoUzenetek,
            sajatUzenet
          ];

        }
      );


      // Input törlése

      if (!kepBase64) setUzenet('');


      // Megvárjuk az újrarenderelést,
      // majd az utolsó üzenetre görgetünk

      setTimeout(() => {

        if (listaRef.current) {

          listaRef.current.scrollToEnd({
            animated: true
          });

        }

      }, 400);


    } catch (error) {

      console.error(
        'Üzenetküldési hiba:',
        error
      );


      Alert.alert(
        'Hiba',
        'Nem sikerült elküldeni az üzenetet.'
      );

    } finally {
      setKuldesFolyamatban(false);
    }

  };


  // =========================
  // ÜZENET MEGJELENÍTÉSE
  // =========================

  const uzenetMegjelenitese = ({
    item
  }) => {

    const sajat =
      Number(item.kuldo_id) ===
      Number(felhasznaloId);


    return (

      <View
        style={[
          styles.uzenetSor,

          sajat
            ? styles.sajatSor
            : styles.partnerSor
        ]}
      >

        <View
          style={[
            styles.uzenetBuborek,

            sajat
              ? styles.sajatBuborek
              : styles.partnerBuborek
          ]}
        >

          {item.kep_url ? (
            <Pressable
              onPress={() => setMegnyitottKep(IP.ipcim + item.kep_url)}
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

          {item.uzenet ? <Text
            style={[
              styles.uzenetSzoveg,

              sajat
                ? styles.sajatSzoveg
                : styles.partnerSzoveg
            ]}
          >
            {item.uzenet}
          </Text> : null}

        </View>

      </View>

    );

  };



  // =========================
  // FELÜLET
  // =========================

  return (

    <SafeAreaView
      style={[styles.safeArea, Platform.OS === 'web' && {
        height: ablakMagassag - navigacioFejlecMagassag
      }]}
      edges={['bottom']}
    >

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : insets.bottom + 48}
      >


        {/* =========================
            FEJLÉC
        ========================= */}

        <View
          style={styles.header}
          onLayout={(event) => setChatFejlecMagassag(event.nativeEvent.layout.height)}
        >

          <Text style={styles.partnerNev}>
            {partnerNev}
          </Text>

        </View>


        {/* =========================
            ÜZENETLISTA
        ========================= */}

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
          >
            {uzenetek.map((item, index) => (
              <React.Fragment key={item.id ?? index}>
                {uzenetMegjelenitese({ item })}
              </React.Fragment>
            ))}
          </ScrollView>
        ) : <FlatList

          ref={listaRef}

          data={uzenetek}

          style={styles.lista}

          contentContainerStyle={
            styles.listaTartalom
          }

          keyExtractor={(
            item,
            index
          ) =>

            item.id !== undefined &&
            item.id !== null
              ? item.id.toString()
              : index.toString()

          }

          renderItem={
            uzenetMegjelenitese
          }

          onContentSizeChange={() => listaAljaraGorgetes(false, 0)}

          onLayout={() => listaAljaraGorgetes(false, 0)}

          keyboardShouldPersistTaps="handled"

          keyboardDismissMode={
            Platform.OS === 'ios'
              ? 'interactive'
              : 'on-drag'
          }

          showsVerticalScrollIndicator={
            true
          }

        />}


        {/* =========================
            KÜLDŐSÁV
        ========================= */}

        <View
          style={styles.kuldesContainer}
          onLayout={(event) => setKuldesSavMagassag(event.nativeEvent.layout.height)}
        >

          <Button title="KÉP" onPress={kepKivalasztasa} disabled={kuldesFolyamatban} />

          {/* =========================
              SZÖVEGMEZŐ
          ========================= */}

          <TextInput

            style={styles.input}

            value={uzenet}

            onChangeText={
              setUzenet
            }

            placeholder="Írj egy üzenetet..."

            placeholderTextColor="#777"

            multiline

            textAlignVertical="center"

          />


          {/* =========================
              KÜLDÉS GOMB
          ========================= */}

          <View
            style={styles.kuldesGomb}
          >

            <Button

              title="KÜLDÉS"

              onPress={() => uzenetKuldese()}
              disabled={kuldesFolyamatban}

            />

          </View>

        </View>


      </KeyboardAvoidingView>

      <Modal
        visible={Boolean(megnyitottKep)}
        transparent
        animationType="fade"
        onRequestClose={() => setMegnyitottKep(null)}
      >
        <Pressable style={styles.kepHatterszin} onPress={() => setMegnyitottKep(null)}>
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


// =========================
// STÍLUSOK
// =========================

const styles = StyleSheet.create({

  // =========================
  // SAFE AREA
  // =========================

  safeArea: {

    flex: 1,

    backgroundColor: '#fff'

  },


  // =========================
  // FŐ CONTAINER
  // =========================

  container: {

    flex: 1,

    minHeight: 0,

    width: '100%',

    maxWidth: 800,

    alignSelf: 'center',

    backgroundColor: '#fff',

    paddingHorizontal: 15

  },


  // =========================
  // FEJLÉC
  // =========================

  header: {

    paddingTop: 25,

    paddingBottom: 15,

    borderBottomWidth: 1,

    borderBottomColor: '#ddd',

    marginBottom: 10

  },


  partnerNev: {

    fontSize: 23,

    fontWeight: 'bold'

  },


  // =========================
  // ÜZENETLISTA
  // =========================

  lista: {

    flex: 1,

    minHeight: 0

  },


  listaTartalom: {

    paddingTop: 0,

    paddingBottom: 20

  },


  // =========================
  // ÜZENET SOR
  // =========================

  uzenetSor: {

    width: '100%',

    marginBottom: 10,

    flexDirection: 'row'

  },


  sajatSor: {

    justifyContent: 'flex-end'

  },


  partnerSor: {

    justifyContent: 'flex-start'

  },


  // =========================
  // ÜZENET BUBORÉK
  // =========================

  uzenetBuborek: {

    maxWidth: '75%',

    paddingHorizontal: 14,

    paddingVertical: 10,

    borderRadius: 15

  },

  uzenetKep: {
    width: 210,
    height: 210,
    borderRadius: 8,
    marginBottom: 4
  },

  kepHatterszin: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
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
  },


  sajatBuborek: {

    backgroundColor: '#4CAF50',

    borderBottomRightRadius: 3

  },


  partnerBuborek: {

    backgroundColor: '#e5e5e5',

    borderBottomLeftRadius: 3

  },


  // =========================
  // ÜZENET SZÖVEG
  // =========================

  uzenetSzoveg: {

    fontSize: 16

  },


  sajatSzoveg: {

    color: '#fff'

  },


  partnerSzoveg: {

    color: '#000'

  },


  // =========================
  // KÜLDŐSÁV
  // =========================

  kuldesContainer: {

    flexDirection: 'row',

    alignItems: 'flex-end',

    paddingTop: 10,

    paddingBottom: 8,

    backgroundColor: '#fff',

    borderTopWidth: 1,

    borderTopColor: '#ddd'

  },


  // =========================
  // INPUT
  // =========================

  input: {

    flex: 1,

    minHeight: 45,

    maxHeight: 120,

    borderWidth: 1,

    borderColor: '#ccc',

    borderRadius: 10,

    paddingHorizontal: 12,

    paddingVertical: 10,

    fontSize: 16,

    marginRight: 10,

    backgroundColor: '#fff'

  },


  // =========================
  // KÜLDÉS GOMB
  // =========================

  kuldesGomb: {

    justifyContent: 'flex-end',

    marginBottom: 1

  }

});