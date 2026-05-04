import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { loadEnquiries, saveEnquiry, deleteEnquiry, LocalEnquiry } from '@/lib/storage';
import { apiPost } from '@/lib/api';

interface EnquiryContextValue {
  enquiries: LocalEnquiry[];
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  addOrUpdateEnquiry: (enquiry: LocalEnquiry) => Promise<void>;
  removeEnquiry: (id: string) => Promise<void>;
  syncAll: () => Promise<void>;
  reload: () => Promise<void>;
}

const EnquiryContext = createContext<EnquiryContextValue | null>(null);

export function EnquiryProvider({ children }: { children: ReactNode }) {
  const [enquiries, setEnquiries] = useState<LocalEnquiry[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const reload = useCallback(async () => {
    const list = await loadEnquiries();
    setEnquiries(list);
  }, []);

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      if (online) syncAll();
    });
    return () => unsub();
  }, []);

  const syncAll = useCallback(async () => {
    if (isSyncing) return;
    const list = await loadEnquiries();
    const pending = list.filter(e => e.sync_status === 'pending');
    if (!pending.length) return;

    setIsSyncing(true);
    try {
      for (const enquiry of pending) {
        try {
          await apiPost('/api/mobile/plant-enquiry', {
            id: enquiry.id,
            form_data: enquiry.form_data,
          });
          const updated: LocalEnquiry = { ...enquiry, sync_status: 'synced', updated_at: new Date().toISOString() };
          await saveEnquiry(updated);
        } catch {
          const updated: LocalEnquiry = { ...enquiry, sync_status: 'error', updated_at: new Date().toISOString() };
          await saveEnquiry(updated);
        }
      }
    } finally {
      setIsSyncing(false);
      await reload();
    }
  }, [isSyncing]);

  const addOrUpdateEnquiry = useCallback(async (enquiry: LocalEnquiry) => {
    await saveEnquiry(enquiry);
    await reload();
    if (isOnline && enquiry.sync_status === 'pending') {
      try {
        await apiPost('/api/mobile/plant-enquiry', { id: enquiry.id, form_data: enquiry.form_data });
        await saveEnquiry({ ...enquiry, sync_status: 'synced', updated_at: new Date().toISOString() });
        await reload();
      } catch {}
    }
  }, [isOnline]);

  const removeEnquiry = useCallback(async (id: string) => {
    await deleteEnquiry(id);
    await reload();
  }, []);

  const pendingCount = enquiries.filter(e => e.sync_status === 'pending').length;

  const value = useMemo(() => ({
    enquiries, pendingCount, isOnline, isSyncing,
    addOrUpdateEnquiry, removeEnquiry, syncAll, reload,
  }), [enquiries, pendingCount, isOnline, isSyncing]);

  return <EnquiryContext.Provider value={value}>{children}</EnquiryContext.Provider>;
}

export function useEnquiry() {
  const ctx = useContext(EnquiryContext);
  if (!ctx) throw new Error('useEnquiry must be used within EnquiryProvider');
  return ctx;
}
