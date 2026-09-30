import { Platform, AppState } from 'react-native';
import Constants from 'expo-constants';
const IP = require('./ipcim');
let aktivChat = null;
let pushToken = null;
let pushAktiv = false;
const Notifications = Platform.OS === 'web' ? null : require('expo-notifications');

if (Notifications) Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const ugyanaz = aktivChat && Number(notification.request.content.data?.talalkozasId) === Number(aktivChat);
    return { shouldShowBanner: !ugyanaz, shouldShowList: !ugyanaz,
      shouldPlaySound: !ugyanaz, shouldSetBadge: false };
  }
});
export function aktivChatBeallitasa(id) { aktivChat = id; }
export function vanPushErtesites() { return pushAktiv; }
export async function helyiErtesites(item) {
  if (!Notifications || pushAktiv || AppState.currentState !== 'active') return;
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Randotalk', body: 'Új üzeneted érkezett.', sound: 'default',
      data: { talalkozasId: item.talalkozasId, partnerId: item.partnerId } },
    trigger: null
  });
}
export async function ertesitesekInditasa(token, navigation, felhasznaloId) {
  if (!Notifications) return { stop: () => {}, allapot: 'A weben az olvasatlan jelzés működik.' };
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('uzenetek', {
    name: 'Üzenetek', importance: Notifications.AndroidImportance.HIGH, sound: 'default'
  });
  let engedely = await Notifications.getPermissionsAsync();
  if (engedely.status !== 'granted') engedely = await Notifications.requestPermissionsAsync();
  if (engedely.status !== 'granted') return { stop: () => {}, allapot: 'Az értesítések engedélye nincs megadva.' };
  const megnyitas = async (response) => {
    const data = response.notification.request.content.data;
    if (!data?.talalkozasId || !data?.partnerId) return;
    try {
      const profilResponse = await fetch(IP.ipcim + '/profil/' + data.partnerId, { headers: { Authorization: `Bearer ${token}` } });
      if (!profilResponse.ok) return;
      const profil = await profilResponse.json();
      navigation.navigate('Chat', { talalkozasId: Number(data.talalkozasId), partnerId: Number(data.partnerId),
        partnerNev: profil.Felhasznalo, felhasznaloId, token });
    } catch (error) { console.error('Értesítés megnyitási hiba:', error); }
  };
  const listener = Notifications.addNotificationResponseReceivedListener(megnyitas);
  const elozo = await Notifications.getLastNotificationResponseAsync();
  if (elozo) { await Notifications.clearLastNotificationResponseAsync(); void megnyitas(elozo); }
  const stop = () => { listener.remove(); pushAktiv = false; aktivChat = null; };
  if (Constants.executionEnvironment === 'storeClient')
    return { stop, allapot: 'Expo Go: helyi értesítések. Bezárt apphoz külön build kell.' };
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) return { stop, allapot: 'Pushhoz előbb állítsd be az Expo projectId-t.' };
  try {
    const adat = await Notifications.getExpoPushTokenAsync({ projectId });
    const response = await fetch(IP.ipcim + '/push-token', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pushToken: adat.data })
    });
    if (!response.ok) throw new Error(await response.text());
    pushToken = adat.data;
    pushAktiv = true;
    return { stop, allapot: 'A telefonos push értesítések be vannak kapcsolva.' };
  } catch (error) {
    console.error('Push beállítási hiba:', error);
    return { stop, allapot: 'Push beállítási hiba; a helyi értesítések működhetnek.' };
  }
}
export async function ertesitesekKijelentkezes(token) {
  if (!pushToken) return;
  const response = await fetch(IP.ipcim + '/push-token-torles', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pushToken })
  });
  if (!response.ok) throw new Error('Az értesítési token törlése nem sikerült');
  pushToken = null; pushAktiv = false;
}