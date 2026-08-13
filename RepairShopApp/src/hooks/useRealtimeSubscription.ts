import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Global subscription registry for channel deduplication
const channelRegistry = new Map<string, { channel: RealtimeChannel; count: number }>();

export function useRealtimeSubscription(
  table: string,
  onPayload: () => void,
  filter?: string
) {
  const onPayloadRef = useRef(onPayload);
  useEffect(() => {
    onPayloadRef.current = onPayload;
    return () => { onPayloadRef.current = () => {}; };
  }, [onPayload]);

  useEffect(() => {
    const key = filter ? `${table}:${filter}` : table;
    const existing = channelRegistry.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      const channelConfig: any = { event: '*', schema: 'public', table };
      if (filter) channelConfig.filter = filter;

      const channel = supabase
        .channel(`central-${key}-${Date.now()}`)
        .on('postgres_changes', channelConfig, () => {
          onPayloadRef.current();
        })
        .subscribe();

      channelRegistry.set(key, { channel, count: 1 });
    }

    return () => {
      const entry = channelRegistry.get(key);
      if (entry) {
        entry.count -= 1;
        if (entry.count <= 0) {
          supabase.removeChannel(entry.channel);
          channelRegistry.delete(key);
        }
      }
    };
  }, [table, filter]);
}
