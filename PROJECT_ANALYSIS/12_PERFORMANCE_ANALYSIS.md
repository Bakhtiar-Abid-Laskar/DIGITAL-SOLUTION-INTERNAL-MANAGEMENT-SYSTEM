# RepairShop — Performance Analysis

## 1. Performance Architecture Overview

RepairShop's performance characteristics are primarily determined by:
1. **Network latency** to Supabase (hosted on a cloud region)
2. **Bundle size** of JavaScript loaded on app/page start
3. **Rendering efficiency** of React components
4. **Image I/O** for selfie upload/display

---

## 2. Mobile App Performance

### Startup Performance

**Cold Start Flow:**
```
App binary loads (native code: ~200-500ms depending on device)
    │
    └─ React Native JS bundle loads (~100-300ms depending on bundle size)
            │
            └─ App.tsx mounts → providers initialize
                    │
                    └─ supabase.auth.getSession() → network request
                            │
                            ├─ Session in SecureStore → ~10-50ms read
                            └─ Network roundtrip to Supabase → 100-500ms
```

**Estimated cold start time:** 400-1200ms on modern device, 1-3s on older devices

**Optimization Present:**
- Hermes JS engine configured (Expo 54 default) — faster startup, smaller bundle
- `LoadingScreen` shown immediately while auth resolves — no blank screen

---

### Data Fetching Performance

**Pattern Used:** Fetch-on-focus with Supabase Realtime for updates

```typescript
// All screens use this pattern:
useFocusEffect(useCallback(() => {
  fetchData(); // Initial load
  const channel = supabase.channel(...).subscribe(); // Live updates
  return () => supabase.removeChannel(channel); // Cleanup
}, [dependencies]));
```

**Pros:**
- Data is fresh every time screen is focused
- Realtime subscription catches remote changes

**Cons:**
- Every screen focus triggers a network request (even if data hasn't changed)
- No caching layer — same job fetched multiple times as user navigates
- No TanStack Query or SWR (no stale-while-revalidate)

**Bottleneck:** Navigation between job list → job detail → back to job list triggers 2 fetches

---

### List Rendering Performance

**FlatList Usage:** ✅ Used in:
- `AttendanceScreen` (30-day history)
- `JobListScreen` (job list with cards)
- `MyJobsScreen` (technician jobs)

**FlatList Configuration:**
```typescript
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <JobCard job={item} />}
  refreshControl={<RefreshControl onRefresh={fetch} />}
/>
```

**Missing Optimizations:**
- No `getItemLayout` (would improve scroll-to-index performance)
- No `maxToRenderPerBatch` tuning
- No `windowSize` customization
- No `initialNumToRender` optimization

**Risk:** With very large job lists (500+ items), scrolling may stutter. Typical shop volume (50-200 jobs) should be fine.

---

### Image Performance

**Compression Before Upload:**
```typescript
// compressImage.ts
manipulateAsync(uri, [{ resize: { width: 1280 } }], { compress: 0.7, format: 'jpeg' })
```

- Max width: 1280px (sufficient for attendance selfies)
- JPEG quality: 70% (good balance of quality vs. size)
- Typical resulting size: 100-400KB per selfie

**Upload Performance:**
- Supabase Storage upload: depends on network speed and image size
- No progress indicator during upload — user just sees loading state
- No retry mechanism for failed uploads (throws error)

**Image Display:**
- Storage images use signed URLs (generated fresh each time)
- No image caching configured (each signed URL generation = 1 network request)
- React Native's default `Image` component (no `react-native-fast-image`)

---

### Animation Performance

**React Native Reanimated v4:**
- Animations run on the UI thread (not JS thread) — smooth even under JS load
- `withSpring()` for tab indicator animation — 60fps even on moderate hardware
- `FadeInUp` entering animation — hardware-accelerated

**Potential Issues:**
- Multiple `Animated.View` entering animations when a job list loads (many FadeInUp simultaneously)
- Could cause frame drops on very old devices with large lists

---

### Memory Management

**Supabase Channel Cleanup:**
```typescript
return () => { supabase.removeChannel(channel); };
```
✅ Properly cleaned up in `useFocusEffect` return

**Potential Memory Leaks:**
- `usePushNotifications` — notification listeners removed in cleanup, but only if the component unmounts
- If `userId` changes (re-login with different user), the old listeners may briefly persist

---

## 3. Admin Panel Performance

### Page Load Performance

**Next.js App Router:**
- Each route is code-split automatically
- Unused pages are not loaded
- Server-side: only minimal HTML delivered; client hydrates after

**Client-Side Hydration:**
- All pages are `'use client'` → full client-side rendering
- No Server Components used (missed opportunity for initial data loading without network waterfall)
- Initial page load requires: HTML → JS bundle → Supabase session check → data fetch

**Estimated First Contentful Paint:**
- Localhost: < 500ms
- Vercel CDN: 800ms - 2s depending on region

---

### Data Fetching Performance

**Pattern Used:** `useEffect` with direct Supabase queries + Realtime channels

**Jobs List Page Optimization:**
```typescript
// Server-side pagination ✅
const { data, count } = await supabase
  .from('jobs')
  .select('...', { count: 'exact' })
  .range(from, to)  // 20 items per page
```
✅ Pagination prevents loading thousands of rows

**Search Optimization:**
```typescript
// Debounced search ✅
const debouncedSearch = useDebounceValue(searchQuery, 300)
```
✅ 300ms debounce prevents excessive queries while typing

---

### Bundle Size Analysis

**Admin Panel Dependencies (estimated impact):**
| Package | Estimated Bundle Size | Usage |
|---|---|---|
| `next` | ~280KB | Framework |
| `react` + `react-dom` | ~130KB | UI runtime |
| `@supabase/supabase-js` | ~150KB | Database client |
| `recharts` | ~300KB | Charts (heavy) |
| `lucide-react` | ~50KB (tree-shaken) | Icons |
| `tailwind-merge` + `clsx` | ~20KB | Utility |
| **Total estimated JS** | ~930KB gzipped estimate | — |

**Recharts is the heaviest dependency** — used only on 2 pages (Overview + Reports). Could be code-split more aggressively with `dynamic()` import.

---

### Realtime Channel Management

**Channels Created:**
```typescript
// Overview page: 2 channels
supabase.channel('admin-overview-jobs')
supabase.channel('admin-overview-users')

// Jobs page: 1 channel
supabase.channel('admin-joblist-changes')

// Reports page: 2 channels
supabase.channel('admin-reports-jobs')
supabase.channel('admin-reports-billing')
```

**Total Active Channels (max):** Up to 4-6 simultaneously (multiple tabs open)

**Cleanup:** ✅ All channels cleaned up in `useEffect` return functions

**Concern:** Each admin panel tab open subscribes to full `jobs` table changes. With concurrent admin users, this could create multiple subscriptions all refetching on every single job change across the entire shop.

---

### Database Query Performance

**Potential N+1 Issues:**

✅ **Avoided:** Technician join is done via Supabase join syntax in a single query:
```typescript
.select('*, technician:users!jobs_technician_id_fkey(name)')
```

**Concern — Overview Dashboard:**
```typescript
// 7 separate sequential queries run in fetchDashboardData()
const { count: jobsTodayCount } = await supabase.from('jobs')...
const { count: completedWeekCount } = await supabase.from('jobs')...
const { count: activeTechsCount } = await supabase.from('users')...
const { count: pendingCount } = await supabase.from('users')...
// ...allInventory, recent jobs, todaysJobs
```

These 7 queries run sequentially (not in parallel). Adding `Promise.all()` would cut dashboard load time by ~70%:

```typescript
// Recommendation:
const [todayCount, weekCount, techCount, pendingCount, inventory, recent, statusData] = 
  await Promise.all([...7 queries...])
```

**Concern — Low Stock Alert:**
```typescript
// Fetches ALL inventory to filter client-side
const { data: allInventory } = await supabase.from('inventory').select(...)
const lowItems = allInventory.filter(item => item.quantity <= item.low_stock_threshold)
```
- For small inventory (<100 items): negligible
- For large inventory (1000+ items): should use a DB-side filter or stored procedure

---

## 4. Network Performance

### API Request Volume

**Typical Admin Dashboard Load:**
| Request | Type | Estimated Time |
|---|---|---|
| Session check | Auth | 50-200ms |
| Jobs count (today) | DB | 80-200ms |
| Jobs count (week) | DB | 80-200ms |
| Users count (active techs) | DB | 80-200ms |
| Users (pending) | DB | 80-200ms |
| Inventory (all) | DB | 100-300ms |
| Recent jobs | DB | 100-300ms |
| Today's jobs (status) | DB | 100-300ms |
| **Total (sequential)** | — | **~700-1900ms** |
| **Total (parallel)** | — | **~150-350ms** |

**Mobile Job Creation:**
| Request | Type | Estimated Time |
|---|---|---|
| `generate_job_code` RPC | DB | 80-200ms |
| `INSERT INTO jobs` | DB | 100-300ms |
| **Total** | — | **~200-500ms** |

---

### Connection Pooling

- Supabase uses PgBouncer for connection pooling — not a concern for this scale
- Supabase Realtime uses WebSocket connections — persistent, not per-request

---

## 5. Scalability Considerations

### Current Design — Suitable For:
- 1-5 concurrent users (typical for a single shop)
- 100-500 jobs per month
- 5-15 staff members
- Sub-100 inventory items

### Scaling Concerns:

**Concern 1: Full Table Realtime Subscriptions**
- Admin panel subscribes to ALL changes on `jobs` and `users` tables
- At 1 admin + 2 receptionists + 3 technicians → 3-6 subscriptions on same table
- Each change triggers N refetches across all open tabs
- At 100+ concurrent users, this becomes a significant DB load

**Concern 2: No Caching**
- Every page navigation refetches data from scratch
- No `SWR`, `TanStack Query`, or in-memory cache
- Adding React Query would dramatically reduce network requests

**Concern 3: Job Code Sequence**
- `job_code_seq` never resets — codes like `RS-2026-10000` will occur after 9,999 jobs
- `LPAD(..., 4, '0')` would overflow to 5-digit codes automatically (not broken, just aesthetic)
- For a single shop, reaching 9999 jobs per year is extremely unlikely

**Concern 4: Attendance Photos — Storage Growth**
- Each check-in = 1 photo (~150KB average after compression)
- Each check-out = 1 photo
- 10 staff × 2 photos × 26 working days = 520 photos/month
- 520 × 150KB ≈ 78MB/month → ~940MB/year
- Supabase free tier: 1GB storage → upgrades needed after ~13 months

---

## 6. Performance Optimization Recommendations

### Critical (High impact, low effort)

1. **Parallelize Dashboard Queries**
   ```typescript
   // admin-panel/(admin)/page.tsx
   const [result1, result2, ...] = await Promise.all([query1, query2, ...])
   ```
   **Impact:** 70% reduction in dashboard load time

2. **Add `Promise.all` to Job Detail Page**
   ```typescript
   // jobs/[id]/page.tsx — already uses Promise.all ✅
   // No change needed
   ```

3. **Push notification deep link navigation**
   - Not a performance issue but functional gap that needs fixing

### High (High impact, medium effort)

4. **Add TanStack Query (React Query)**
   - Both apps would benefit from stale-while-revalidate caching
   - Reduces redundant network requests on tab navigation
   - Automatic background refetching

5. **Optimize Recharts Loading**
   ```typescript
   // admin-panel
   import dynamic from 'next/dynamic'
   const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false })
   ```
   - Reduces initial bundle by ~300KB for non-chart pages

6. **Add `react-native-fast-image` for Mobile**
   - Better caching of attendance selfie thumbnails
   - Prevents re-downloading the same image on every screen focus

### Medium (Medium impact, medium effort)

7. **Optimize FlatList Configuration**
   ```typescript
   <FlatList
     getItemLayout={(_, index) => ({ length: JOB_CARD_HEIGHT, offset: JOB_CARD_HEIGHT * index, index })}
     initialNumToRender={10}
     maxToRenderPerBatch={5}
     windowSize={10}
   />
   ```

8. **Add Supabase Storage Signed URL Caching**
   - Cache signed URLs for 55 minutes instead of fetching new URLs on every render

9. **Server Components in Admin Panel**
   - Convert non-interactive sections to Next.js Server Components
   - Load initial data on server, eliminate client-side waterfall

### Low (Nice to have)

10. **Add upload progress indicator** for selfie uploads (UX improvement)
11. **Add skeleton loading** (mobile already has `SkeletonCard` — ensure consistent use)
12. **Bundle analysis** — run `next build && next-bundle-analyzer` to identify bloat

---

## 7. Performance Score

| Category | Score | Notes |
|---|---|---|
| Mobile startup time | 7/10 | Hermes helps; auth waterfall unavoidable |
| Mobile list rendering | 7/10 | FlatList used; missing optimizations |
| Mobile animations | 9/10 | Reanimated on UI thread — excellent |
| Admin panel load time | 6/10 | Sequential queries are the main issue |
| Admin panel bundle size | 6/10 | Recharts dominates; no dynamic imports |
| Database query efficiency | 7/10 | Good joins; sequential dashboard queries |
| Realtime performance | 8/10 | Proper cleanup; broadscope subscriptions |
| Image performance | 7/10 | Compression in place; no image caching |
| **Overall** | **7.1/10** | **Good for a small shop; needs optimization for scale** |
