import React, { useEffect, useState } from 'react';
import { Image, Platform, View } from 'react-native';

// A böngésző nem tud Authorization fejlécet adni egy sima <img> kéréshez.
export default function ProtectedImage({ uri, token, style, resizeMode = 'cover' }) {
  const [webUri, setWebUri] = useState(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !uri || !token) return;
    setWebUri(null);
    let active = true;
    let objectUrl = null;
    fetch(uri, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!response.ok) throw new Error('Kép betöltése sikertelen');
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setWebUri(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch((error) => console.error('Kép betöltési hiba:', error));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [uri, token]);

  if (!uri || !token) return <View style={style} />;
  if (Platform.OS === 'web') {
    return webUri ? <Image source={{ uri: webUri }} style={style} resizeMode={resizeMode} /> : <View style={style} />;
  }
  return (
    <Image
      source={{ uri, headers: { Authorization: `Bearer ${token}` } }}
      style={style}
      resizeMode={resizeMode}
    />
  );
}