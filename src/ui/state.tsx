// App-wide state: knowledge base (bundled seed + this browser's own district profiles), settings, routing.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DistrictProfile, KnowledgeBase } from '../core/types.ts';
import { seedKb } from '../kb/index.ts';
import { DEFAULT_SETTINGS, deleteDistrict, getSettings, listDistricts, putDistrict, putSettings, type Settings } from '../store/db.ts';

export interface Route {
  page: 'cases' | 'case' | 'report' | 'districts' | 'district' | 'reference' | 'privacy' | 'settings';
  id?: string;
}

function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'case' && parts[1]) return { page: parts[2] === 'report' ? 'report' : 'case', id: parts[1] };
  if (parts[0] === 'districts') return parts[1] ? { page: 'district', id: decodeURIComponent(parts[1]) } : { page: 'districts' };
  if (parts[0] === 'reference') return { page: 'reference', id: parts[1] ? decodeURIComponent(parts[1]) : undefined };
  if (parts[0] === 'privacy') return { page: 'privacy' };
  if (parts[0] === 'settings') return { page: 'settings' };
  return { page: 'cases' };
}

interface AppState {
  kb: KnowledgeBase;
  /** District profiles created in this browser. */
  myDistricts: DistrictProfile[];
  saveDistrict(p: DistrictProfile): Promise<void>;
  removeDistrict(id: string): Promise<void>;
  settings: Settings;
  saveSettings(s: Settings): Promise<void>;
  route: Route;
  ready: boolean;
}

const Ctx = createContext<AppState | null>(null);
export const useApp = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('AppProvider missing');
  return v;
};

export const go = (path: string) => {
  window.location.hash = path;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const seed = useMemo(seedKb, []);
  const [myDistricts, setMine] = useState<DistrictProfile[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const on = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    Promise.all([listDistricts(), getSettings()])
      .then(([d, s]) => {
        setMine(d);
        setSettings(s);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const kb = useMemo<KnowledgeBase>(() => ({ ...seed, districts: [...myDistricts, ...seed.districts] }), [seed, myDistricts]);

  const saveDistrict = useCallback(async (p: DistrictProfile) => {
    await putDistrict(p);
    setMine(await listDistricts());
  }, []);
  const removeDistrict = useCallback(async (id: string) => {
    await deleteDistrict(id);
    setMine(await listDistricts());
  }, []);
  const saveSettings = useCallback(async (s: Settings) => {
    await putSettings(s);
    setSettings(s);
  }, []);

  return <Ctx.Provider value={{ kb, myDistricts, saveDistrict, removeDistrict, settings, saveSettings, route, ready }}>{children}</Ctx.Provider>;
}

/** The school year a date falls in ("2026-27"), assuming a July rollover. */
export function schoolYearOf(d = new Date()): string {
  const y = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}
