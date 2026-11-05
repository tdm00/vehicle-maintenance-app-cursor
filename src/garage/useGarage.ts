import { useEffect, useState } from 'react';
import { garageReducer, type GarageAction } from '../domain/reducer';
import { loadGarage, saveGarage, type KeyValueStore } from '../domain/storage';
import type { GarageData } from '../domain/types';

function browserStore(): KeyValueStore {
  return localStorage;
}

export function useGarage() {
  const [data, setData] = useState<GarageData>(() => loadGarage(browserStore()));

  useEffect(() => {
    try {
      saveGarage(browserStore(), data);
    } catch {
      // Private browsing can reject localStorage writes. The screen still works for this visit.
    }
  }, [data]);

  function dispatch(action: GarageAction) {
    setData((current) => garageReducer(current, action));
  }

  return { data, dispatch };
}
