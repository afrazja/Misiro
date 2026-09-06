/** In-memory query adapter for endpoint tests; database permission tests use PostgreSQL. */
export function phaseThreeDb() {
  const tables: Record<string, any[]> = { analytics_assessments:[], analytics_acquisition:[], analytics_changes:[] };
  let failure = false;
  const writes: string[] = [];
  const db = { from(table: string) {
    let operation = 'read', payload: any, conflict: any, single = false;
    const filters: ((row: any) => boolean)[] = [];
    const query: any = {
      select() { return query; }, order() { return query; },
      eq(key: string,value: any) { filters.push(row => row[key] === value); return query; },
      is(key: string,value: any) { filters.push(row => row[key] === value); return query; },
      insert(value: any) { operation='insert'; payload=value; return query; },
      upsert(value: any,options: any) { operation='upsert'; payload=value; conflict=options; return query; },
      update(value: any) { operation='update'; payload=value; return query; },
      single() { single=true; return query; }, maybeSingle() { single=true; return query; },
      then(resolve: (value: any) => any, reject: (error: unknown) => any) {
        try {
          let rows = (tables[table] ?? []).filter(row => filters.every(fn => fn(row)));
          if (operation !== 'read') {
            writes.push(table);
            if (failure) return Promise.resolve({data:null,error:{code:'unavailable'}}).then(resolve,reject);
            if (operation === 'update') rows.forEach(row => Object.assign(row,payload));
            else {
              const duplicate = table === 'analytics_acquisition' ? tables[table].find(row => row.user_id === payload.user_id)
                : table === 'analytics_assessments' ? tables[table].find(row => row.user_id === payload.user_id && row.protocol === payload.protocol && row.checkpoint === payload.checkpoint) : null;
              if (duplicate && !conflict?.ignoreDuplicates) return Promise.resolve({data:null,error:{code:'23505'}}).then(resolve,reject);
              if (duplicate) rows=[];
              else { const row = {id:crypto.randomUUID(),started_at:new Date().toISOString(),completed_at:null,listening_correct:null,reading_correct:null,skipped:null,recorded_at:new Date().toISOString(),created_at:new Date().toISOString(),archived:false,...payload}; tables[table].push(row); rows=[row]; }
            }
          }
          return Promise.resolve({data:single ? rows[0] ?? null : rows.map(row => ({...row})),error:null}).then(resolve,reject);
        } catch (error) { return Promise.reject(error).then(resolve,reject); }
      }
    }; return query;
  } };
  return {db,tables,writes,failWrites: (value: boolean) => failure=value};
}
