import React, { createContext, useState, useEffect, useContext } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { SYNC_QUEUE_KEY } from '../lib/constants';
import type { OfflineSyncQueue, OfflineQueueItem } from '../types/models';

interface OfflineContextType {
  isOnline: boolean;
  isSyncing: boolean;
  queueCount: number;
  addToQueue: (item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'synced' | 'retries'>) => Promise<void>;
  syncQueue: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    // Monitor network connectivity
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable === true;
      setIsOnline(online);

      // Auto-sync when coming back online
      if (online && !isSyncing) {
        syncQueue();
      }
    });

    // Load initial queue count
    loadQueueCount();

    return () => unsubscribe();
  }, []);

  const loadQueueCount = async () => {
    try {
      const queueData = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (queueData) {
        const queue: OfflineSyncQueue = JSON.parse(queueData);
        const unsyncedCount = queue.queue.filter((item) => !item.synced).length;
        setQueueCount(unsyncedCount);
      }
    } catch (error) {
      console.error('Error loading queue count:', error);
    }
  };

  const addToQueue = async (
    item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'synced' | 'retries'>
  ) => {
    try {
      // Load existing queue
      const queueData = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      const queue: OfflineSyncQueue = queueData
        ? JSON.parse(queueData)
        : { queue: [] };

      // Create new queue item
      const newItem: OfflineQueueItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...item,
        timestamp: new Date().toISOString(),
        synced: false,
        retries: 0,
      };

      // Add to queue
      queue.queue.push(newItem);

      // Save to storage
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

      // Update count
      setQueueCount((prev) => prev + 1);

      // Try to sync immediately if online
      if (isOnline) {
        syncQueue();
      }
    } catch (error) {
      console.error('Error adding to queue:', error);
    }
  };

  const syncQueue = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);

    try {
      // Load queue
      const queueData = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (!queueData) {
        setIsSyncing(false);
        return;
      }

      const queue: OfflineSyncQueue = JSON.parse(queueData);
      const unsyncedItems = queue.queue.filter((item) => !item.synced);

      if (unsyncedItems.length === 0) {
        setIsSyncing(false);
        return;
      }

      // Process each unsynced item
      for (const item of unsyncedItems) {
        try {
          if (item.type === 'attendance_mark') {
            // Check for conflict (existing record)
            const { data: existing } = await supabase
              .from('attendance_records')
              .select('id')
              .eq('student_id', item.data.student_id)
              .eq('subject_id', item.data.subject_id)
              .eq('date', item.data.date)
              .single();

            if (existing) {
              // Conflict: server has record, mark as synced but don't upload
              item.synced = true;
              console.log('Conflict detected, server data takes precedence');
            } else {
              // No conflict: upload to server
              const { error } = await supabase
                .from('attendance_records')
                .insert({
                  student_id: item.data.student_id,
                  subject_id: item.data.subject_id,
                  date: item.data.date,
                  status: item.data.status,
                  marked_by: item.data.marked_by,
                  notes: item.data.notes,
                });

              if (error) {
                // Increment retries on error
                item.retries += 1;
                console.error('Error syncing item:', error);
              } else {
                // Mark as synced
                item.synced = true;
              }
            }
          }
        } catch (error) {
          console.error('Error processing queue item:', error);
          item.retries += 1;
        }
      }

      // Save updated queue
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

      // Clean up synced items older than 30 days
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      queue.queue = queue.queue.filter(
        (item) =>
          !item.synced ||
          new Date(item.timestamp).getTime() > thirtyDaysAgo
      );

      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

      // Update count
      await loadQueueCount();
    } catch (error) {
      console.error('Error syncing queue:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isSyncing,
        queueCount,
        addToQueue,
        syncQueue,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}

export default OfflineContext;
