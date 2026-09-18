import React, { useState, useCallback } from 'react';

import {
  View,
  Text,
  Button,
  Alert,
  StyleSheet,
  FlatList,
  Pressable
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

const IP = require('./ipcim');

export default function User({ route, navigation }) {

  const { felhasznaloId, felhasznaloNev } = route.params;

  const [kereses, setKereses] = useState(false);
  const [beszelgetesek, setBeszelgetesek] = useState([]);


  // --------------------------------------------------
  // KORÁBBI BESZÉLGETÉSEK BETÖLTÉSE
  // --------------------------------------------------

  const beszelgetesekBetoltese = async () => {

    try {

      const response = await fetch(
        IP.ipcim + '/beszelgetesek/' + felhasznaloId
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

    } catch (error) {

      console.error(
        'Beszélgetések betöltési hiba:',
        error
      );

    }

  };


  // --------------------------------------------------
  // MINDEN ALKALOMMAL FRISSÍTJÜK A LISTÁT,
  // AMIKOR VISSZALÉPÜNK A USER OLDALRA
  // --------------------------------------------------

  useFocusEffect(
    useCallback(() => {

      beszelgetesekBetoltese();

    }, [felhasznaloId])
  );


  // --------------------------------------------------
  // VÉLETLENSZERŰ PARTNER KERESÉSE
  // --------------------------------------------------

  const partnerKereses = async () => {

    try {

      setKereses(true);

      const response = await fetch(
        IP.ipcim + '/random/' + felhasznaloId
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

        felhasznaloId: felhasznaloId

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

      felhasznaloId: felhasznaloId

    });

  };


  // --------------------------------------------------
  // KÉPERNYŐ
  // --------------------------------------------------

  return (

    <View style={styles.container}>


      {/* -------------------------------------------- */}
      {/* ÜDVÖZLÉS */}
      {/* -------------------------------------------- */}

      <Text style={styles.title}>
        Üdvözöllek!
      </Text>


      <Text style={styles.sajatnev}>
        {felhasznaloNev}
      </Text>


      {/* -------------------------------------------- */}
      {/* PARTNER KERESÉSE */}
      {/* -------------------------------------------- */}

      <View style={styles.searchButton}>

        <Button

          title={
            kereses
              ? 'Partner keresése...'
              : 'Partner keresése'
          }

          onPress={partnerKereses}

          disabled={kereses}

        />

      </View>


      {/* -------------------------------------------- */}
      {/* KORÁBBI BESZÉLGETÉSEK */}
      {/* -------------------------------------------- */}

      <Text style={styles.beszelgetesTitle}>
        Korábbi beszélgetések
      </Text>


      <FlatList

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

              {/* PARTNER NEVE */}

              <Text style={styles.partnerNev}>
                {item.partnerNev}
              </Text>


              {/* LEGUTOLSÓ ÜZENET */}

              <Text style={styles.utolsoUzenet}>

                {item.utolsoUzenet}

              </Text>

            </View>

          </Pressable>

        )}

      />

    </View>

  );
}


// ==================================================
// STÍLUSOK
// ==================================================

const styles = StyleSheet.create({


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