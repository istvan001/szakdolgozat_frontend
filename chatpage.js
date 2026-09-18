import React, {
    useState,
    useEffect
} from 'react';

import {
    View,
    Text,
    TextInput,
    Button,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert
} from 'react-native';

const IP = require('./ipcim');

export default function Chat({ route, navigation }) {

    const {
        talalkozasId,
        partnerId,
        partnerNev,
        felhasznaloId
    } = route.params;


    // --------------------------------------------------
    // AKTUÁLIS TALÁLKOZÁS ID
    // --------------------------------------------------
    // Új beszélgetésnél ez NULL.
    // Korábbi beszélgetésnél már van értéke.

    const [
        aktualisTalalkozasId,
        setAktualisTalalkozasId
    ] = useState(talalkozasId || null);


    // --------------------------------------------------
    // ÜZENET INPUT
    // --------------------------------------------------

    const [uzenet, setUzenet] = useState('');


    // --------------------------------------------------
    // ÜZENETEK
    // --------------------------------------------------

    const [uzenetek, setUzenetek] = useState([]);


    // --------------------------------------------------
    // RÉGI ÜZENETEK BETÖLTÉSE
    // --------------------------------------------------

    const uzenetekBetoltese = async () => {

        // Új beszélgetésnél még nincs mit betölteni

        if (!aktualisTalalkozasId) {
            return;
        }

        try {

            const response = await fetch(
                IP.ipcim +
                '/uzenetek/' +
                aktualisTalalkozasId
            );


            if (!response.ok) {

                const hiba =
                    await response.text();

                console.error(
                    'Üzenetek betöltési hiba:',
                    hiba
                );

                return;
            }


            const data =
                await response.json();


            console.log(
                'Betöltött üzenetek:',
                data
            );


            setUzenetek(data);


        } catch (error) {

            console.error(
                'Üzenetek betöltési hiba:',
                error
            );

        }

    };


    // --------------------------------------------------
    // CHAT MEGNYITÁSAKOR
    // RÉGI ÜZENETEK BETÖLTÉSE
    // --------------------------------------------------

    useEffect(() => {

        uzenetekBetoltese();

    }, [aktualisTalalkozasId]);


    // --------------------------------------------------
    // ÜZENET KÜLDÉSE
    // --------------------------------------------------

    const uzenetKuldese = async () => {

        // Üres üzenetet nem küldünk

        if (uzenet.trim() === '') {
            return;
        }


        // Elmentjük a küldendő szöveget

        const elkuldendoUzenet =
            uzenet.trim();


        try {

            // ------------------------------------------------
            // ÜZENET KÜLDÉSE A BACKENDNEK
            // ------------------------------------------------

            const response = await fetch(

                IP.ipcim + '/uzenet',

                {

                    method: 'POST',

                    headers: {

                        'Content-Type':
                            'application/json'

                    },

                    body: JSON.stringify({

                        felhasznaloId:
                            felhasznaloId,

                        partnerId:
                            partnerId,

                        uzenet:
                            elkuldendoUzenet

                    })

                }

            );


            // ------------------------------------------------
            // HIBA ELLENŐRZÉSE
            // ------------------------------------------------

            if (!response.ok) {

                const hiba =
                    await response.text();

                console.error(
                    'Szerver hiba:',
                    hiba
                );

                Alert.alert(
                    'Hiba',
                    hiba
                );

                return;
            }


            // ------------------------------------------------
            // BACKEND VÁLASZA
            // ------------------------------------------------

            const data =
                await response.json();


            console.log(
                'Szerver válasza:',
                data
            );


            // ------------------------------------------------
            // ELSŐ ÜZENET
            // ------------------------------------------------
            // Ha új beszélgetés volt, a backend most
            // létrehozta a talalkozas rekordot.
            //
            // A backend visszaadja az új ID-t.

            if (
                !aktualisTalalkozasId &&
                data.talalkozasId
            ) {

                setAktualisTalalkozasId(
                    data.talalkozasId
                );

            }


            // ------------------------------------------------
            // ÜZENET MEGJELENÍTÉSE
            // ------------------------------------------------

            const ujUzenet = {

                id:
                    Date.now().toString(),

                aktualis_id:
                    data.talalkozasId ||
                    aktualisTalalkozasId,

                kuldo_id:
                    felhasznaloId,

                uzenet:
                    elkuldendoUzenet

            };


            setUzenetek(
                elozoUzenetek => [
                    ...elozoUzenetek,
                    ujUzenet
                ]
            );


            // ------------------------------------------------
            // INPUT KIÜRÍTÉSE
            // ------------------------------------------------

            setUzenet('');


        } catch (error) {

            console.error(
                'Üzenetküldési hiba:',
                error
            );

            Alert.alert(
                'Hiba',
                'Nem sikerült elküldeni az üzenetet.'
            );

        }

    };


    // --------------------------------------------------
    // CHAT FELÜLET
    // --------------------------------------------------

    return (

        <KeyboardAvoidingView

            style={styles.container}

            behavior={
                Platform.OS === 'ios'
                    ? 'padding'
                    : undefined
            }

        >

            {/* -------------------------------------------- */}
            {/* FEJLÉC */}
            {/* -------------------------------------------- */}

            <View style={styles.header}>


                <Text style={styles.chatTitle}>
                    {partnerNev}
                </Text>


            </View>


            {/* -------------------------------------------- */}
            {/* ÜZENETEK */}
            {/* -------------------------------------------- */}

            <FlatList

                style={styles.messages}

                data={uzenetek}

                keyExtractor={(item, index) =>
                    item.id
                        ? item.id.toString()
                        : index.toString()
                }

                contentContainerStyle={
                    styles.messagesContent
                }

                renderItem={({ item }) => (

                    <View

                        style={

                            Number(item.kuldo_id) ===
                                Number(felhasznaloId)

                                ? styles.sajatUzenet

                                : styles.partnerUzenet

                        }

                    >

                        <Text style={styles.uzenetSzoveg}>
                            {item.uzenet}
                        </Text>

                    </View>

                )}

            />


            {/* -------------------------------------------- */}
            {/* ÜZENET ÍRÁSA */}
            {/* -------------------------------------------- */}

            <View style={styles.inputContainer}>

                <TextInput

                    style={styles.input}

                    placeholder="Írj egy üzenetet..."

                    value={uzenet}

                    onChangeText={setUzenet}

                    multiline

                />

                <Button

                    title="Küldés"

                    onPress={uzenetKuldese}

                />

            </View>


        </KeyboardAvoidingView>

    );

}


// ==================================================
// STÍLUSOK
// ==================================================

const styles = StyleSheet.create({

    container: {

        flex: 1,

        backgroundColor: '#fff'

    },


    // ----------------------------------------------
    // FEJLÉC
    // ----------------------------------------------

    header: {

        padding: 20,

        borderBottomWidth: 1,

        borderBottomColor: '#ddd'

    },


    chatTitle: {

        fontSize: 25,

        fontWeight: 'bold',

        marginBottom: 15

    },


    partnerNev: {

        fontSize: 22,

        fontWeight: 'bold',

        marginBottom: 5

    },


    // ----------------------------------------------
    // ÜZENETEK
    // ----------------------------------------------

    messages: {

        flex: 1,

        paddingHorizontal: 10

    },


    messagesContent: {

        paddingVertical: 10

    },


    // ----------------------------------------------
    // SAJÁT ÜZENET
    // ----------------------------------------------

    sajatUzenet: {

        alignSelf: 'flex-end',

        backgroundColor: '#DCF8C6',

        padding: 10,

        marginVertical: 5,

        borderRadius: 10,

        maxWidth: '80%'

    },


    // ----------------------------------------------
    // PARTNER ÜZENETE
    // ----------------------------------------------

    partnerUzenet: {

        alignSelf: 'flex-start',

        backgroundColor: '#eee',

        padding: 10,

        marginVertical: 5,

        borderRadius: 10,

        maxWidth: '80%'

    },


    uzenetSzoveg: {

        fontSize: 16

    },


    // ----------------------------------------------
    // INPUT
    // ----------------------------------------------

    inputContainer: {

        flexDirection: 'row',

        alignItems: 'flex-end',

        padding: 10,

        borderTopWidth: 1,

        borderTopColor: '#ddd',
        marginBottom: '10%'

    },


    input: {

        flex: 1,

        minHeight: 45,

        maxHeight: 100,

        borderWidth: 1,

        borderColor: '#aaa',

        borderRadius: 8,

        paddingHorizontal: 10,

        paddingVertical: 10,

        marginRight: 10

    }

});