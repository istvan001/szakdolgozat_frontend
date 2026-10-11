import React, { useEffect, useState } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

export default function ProtectedImage({
  uri,
  token,
  style,
  resizeMode = 'cover'
}) {
  const [webUri, setWebUri] = useState(null);
  const [hiba, setHiba] = useState(false);

  useEffect(() => {
    setHiba(false);
    setWebUri(null);

    if (Platform.OS !== 'web' || !uri || !token) return;

    let aktiv = true;
    let objectUrl = null;

    fetch(uri, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        if (!response.ok)
          throw new Error(`Kép lekérése: HTTP ${response.status}`);
        return response.blob();
      })
      .then(blob => {
        if (!aktiv) return;
        objectUrl = URL.createObjectURL(blob);
        setWebUri(objectUrl);
      })
      .catch(error => {
        if (!aktiv) return;
        console.error('Kép betöltési hiba:', uri, error.message);
        setHiba(true);
      });

    return () => {
      aktiv = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [uri, token]);

  const source = Platform.OS === 'web'
    ? webUri ? { uri: webUri } : null
    : uri && token ? {
        uri,
        headers: { Authorization: `Bearer ${token}` },
        isAnimated: /\.gif(?:\?|$)/i.test(uri)
      } : null;

  return (
    <View
      pointerEvents="none"
      style={[style, { overflow: 'hidden' }]}
    >
      {source && !hiba && (
        <Image
          source={source}
          style={StyleSheet.absoluteFillObject}
          contentFit={resizeMode}
          onError={event => {
            console.error('Kép betöltési hiba:', uri, event.error);
            setHiba(true);
          }}
        />
      )}

      {hiba && (
        <View style={{
          flex: 1,
          backgroundColor: '#eee',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Text style={{ color: '#555', textAlign: 'center' }}>
            A kép nem tölthető be
          </Text>
        </View>
      )}
    </View>
  );
}