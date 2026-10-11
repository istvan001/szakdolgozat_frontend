import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

const IP = require('./ipcim');

export default function useOnlineAllapot(token, partnerIds, fokuszban) {
  const [allapotok, setAllapotok] = useState({});
  const [appAktiv, setAppAktiv] = useState(
    AppState.currentState === 'active'
  );
  const idsRef = useRef([]);
  const sorszam = useRef(0);
  const kliensId = useRef(
    Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
  );

  idsRef.current = [...new Set(
    partnerIds.map(Number).filter(id => Number.isInteger(id) && id > 0)
  )].slice(0, 500);

  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      setAppAktiv(state === 'active');
    });

    return () => listener.remove();
  }, []);

  useEffect(() => {
    setAllapotok({});

    if (!token || !fokuszban || !appAktiv) return;

    let leallitva = false;
    let folyamatban = false;

    const kuldes = async aktiv => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(IP.ipcim + '/online-allapot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          signal: controller.signal,
          body: JSON.stringify({
            kliensId: kliensId.current,
            sorszam: ++sorszam.current,
            aktiv,
            partnerIds: aktiv ? idsRef.current : []
          })
        });

        if (!response.ok) throw new Error('Online állapot hiba');

        const adat = await response.json();
        if (!leallitva && aktiv) setAllapotok(adat);
      } catch {
        if (!leallitva && aktiv) setAllapotok({});
      } finally {
        clearTimeout(timeout);
      }
    };

    const frissites = async () => {
      if (folyamatban || leallitva) return;
      folyamatban = true;

      try {
        await kuldes(true);
      } finally {
        folyamatban = false;
      }
    };

    void frissites();
    const timer = setInterval(frissites, 5000);

    return () => {
      leallitva = true;
      clearInterval(timer);
      void kuldes(false);
    };
  }, [token, fokuszban, appAktiv]);

  return fokuszban && appAktiv ? allapotok : {};
}