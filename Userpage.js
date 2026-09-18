import React, { useState, useCallback } from 'react';

import {
  View,
  Text,
  Button,
  Alert,
  StyleSheet,
  FlatList
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

const IP = require('./ipcim');

export default function User({ route, navigation }) {

  const { felhasznaloId } = route.params;

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
        console.log('Beszélgetések lekérése sikertelen');
        return;
      }

      const data = await response.json();

      console.log('Korábbi beszélgetések:', data);

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

        // Az új beszélgetésnek még nincs ID-ja
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

      <Text style={styles.title}>
        Üdvözöllek!
      </Text>

      <Text style={styles.sajatId}>
        Saját ID: {felhasznaloId}
      </Text>


      {/* PARTNER KERESÉSE */}

      <View style={styles.searchButton}>

        <Button
          title={
            kereses
              ? 'Partner keresése...'
              : 'Véletlenszerű partner keresése'
          }

          onPress={partnerKereses}

          disabled={kereses}
        />

      </View>


      {/* KORÁBBI BESZÉLGETÉSEK */}

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

          <View style={styles.beszelgetes}>

            <View style={styles.partnerInfo}>

              <Text style={styles.partnerNev}>
                {item.partnerNev}
              </Text>

              <Text>
                Partner ID: {item.partnerId}
              </Text>

            </View>


            <Button
              title="Megnyitás"

              onPress={() =>
                beszelgetesMegnyitasa(item)
              }

            />

          </View>

        )}

      />

    </View>

  );
}


// --------------------------------------------------
// STÍLUSOK
// --------------------------------------------------

const styles = StyleSheet.create({

  container: {

    flex: 1,

    padding: 20,

    backgroundColor: '#fff'

  },

  title: {

    fontSize: 25,

    fontWeight: 'bold',

    marginTop: 30,

    marginBottom: 10

  },

  sajatId: {

    fontSize: 16,

    marginBottom: 10

  },

  searchButton: {

    marginTop: 20,

    marginBottom: 20

  },

  beszelgetesTitle: {

    fontSize: 20,

    fontWeight: 'bold',

    marginTop: 20,

    marginBottom: 15

  },

  beszelgetes: {

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    padding: 15,

    borderWidth: 1,

    borderColor: '#ccc',

    borderRadius: 10,

    marginBottom: 10

  },

  partnerInfo: {

    flex: 1

  },

  partnerNev: {

    fontSize: 18,

    fontWeight: 'bold',

    marginBottom: 5

  },

  nincsBeszelgetes: {

    textAlign: 'center',

    marginTop: 20,

    color: '#777'

  }

});