# RepairShop — Dependency Audit

## Mobile App Dependencies

### Core Framework
| Package | Version | Purpose | Risk |
|---|---|---|---|
| `expo` | `~54.0.14` | Expo SDK — managed workflow | Low |
| `react-native` | `0.81.5` | React Native framework | Low |
| `react` | `19.0.0` | React library | Low |
| `react-dom` | `19.0.0` | React DOM (for web support) | Low |
| `typescript` | `~5.8.3` | TypeScript compiler | Low |

### Supabase
| Package | Version | Purpose | Risk |
|---|---|---|---|
| `@supabase/supabase-js` | `^2.45.4` | Supabase client (DB, Auth, Storage, Realtime) | Low |

### Navigation
| Package | Version | Purpose | Risk |
|---|---|---|---|
| `@react-navigation/native` | `^7.1.9` | Navigation core | Low |
| `@react-navigation/bottom-tabs` | `^7.3.12` | Bottom tab navigator | Low |
| `@react-navigation/stack` | `^7.2.11` | Stack navigator | Low |
| `react-native-screens` | `^4.5.0` | Native screen optimization | Low |
| `react-native-safe-area-context` | `^5.3.0` | Safe area insets | Low |
| `react-native-gesture-handler` | `^2.24.0` | Touch gestures | Low |

### Expo Modules
| Package | Version | Purpose | Risk |
|---|---|---|---|
| `expo-camera` | `^17.0.5` | Camera for selfies | Low |
| `expo-location` | `^18.0.6` | GPS location | Low |
| `expo-print` | `^14.0.0` | Print to system printer | Low |
| `expo-sharing` | `^13.0.0` | Share files/content | Low |
| `expo-notifications` | `^0.30.6` | Push notifications | Low |
| `expo-secure-store` | `^14.0.1` | Secure session storage (Keychain/Keystore) | Low |
| `expo-image-manipulator` | `^13.0.1` | Image compress/resize | Low |
| `expo-file-system` | `^18.0.11` | File system access | Low |
| `expo-device` | `^7.1.2` | Device info | Low |
| `expo-constants` | `^17.0.8` | Expo constants (EAS project ID) | Low |

### UI
| Package | Version | Purpose | Risk |
|---|---|---|---|
| `react-native-reanimated` | `^4.6.0` | Hardware-accelerated animations | Low |
| `lucide-react-native` | `^0.515.0` | Icon library | Low |

### Notes
- All versions use caret (`^`) or tilde (`~`) — minor version updates will auto-install on `npm install`
- `expo ~54.0.14` — pinned to a minor, prevents breaking SDK changes
- `react-native 0.81.5` — exact pin to prevent breaking native module changes

### Outdated / Risk Assessment
- **No deprecated packages identified**
- `expo-notifications` SDK 53+ is incompatible with Expo Go — handled in code with `isExpoGo` check
- `react-native-reanimated ^4` is a major version — ensure compatibility with RN 0.81.5

---

## Admin Panel Dependencies

### Core Framework
| Package | Version | Purpose | Risk |
|---|---|---|---|
| `next` | `16.2.9` | Next.js framework | Low |
| `react` | `19.2.4` | React library | Low |
| `react-dom` | `19.2.4` | React DOM | Low |
| `typescript` | `^5` | TypeScript compiler | Low |

### Supabase
| Package | Version | Purpose | Risk |
|---|---|---|---|
| `@supabase/supabase-js` | `^2.110.0` | Supabase client | Low |
| `supabase` | `^2.109.0` | Supabase CLI (dev) | Low |

### CSS / Styling
| Package | Version | Purpose | Risk |
|---|---|---|---|
| `tailwindcss` | `^4` | Tailwind CSS v4 | Medium |
| `@tailwindcss/postcss` | `^4` | PostCSS integration | Medium |
| `postcss` | (implied) | CSS processor | Low |

**⚠️ Tailwind v4 Risk:** Tailwind CSS v4 is a major version with significant changes from v3:
- No `tailwind.config.js` — configuration via CSS `@theme` (as used in this project ✅)
- Breaking changes if any third-party plugins expect v3 syntax
- Still relatively new (released 2024) — less community support and fewer examples

### Charts
| Package | Version | Purpose | Risk |
|---|---|---|---|
| `recharts` | `^3.9.1` | Charts (PieChart, BarChart) | Low |

**Recharts 3.x** — major version. Ensure no breaking changes from previous versions if upgrading.

### UI Utilities
| Package | Version | Purpose | Risk |
|---|---|---|---|
| `clsx` | `^2.1.1` | Conditional classNames | Low |
| `tailwind-merge` | `^3.6.0` | Merge Tailwind classes | Low |
| `lucide-react` | `^1.22.0` | Icon library | Low |

### Notes
- `lucide-react ^1.22.0` — this appears to be a very high version (lucide-react is typically 0.4xx). Verify this is correct.
- Next.js 16 is a recent version — relatively safe but newer than mainstream adoption

---

## Supabase Edge Functions Dependencies

### Runtime
| Package | Version | Purpose |
|---|---|---|
| `https://deno.land/std@0.168.0/http/server.ts` | `0.168.0` | Deno HTTP server |
| `https://esm.sh/@supabase/supabase-js@2.39.0` | `2.39.0` | Supabase client (server-side) |

**⚠️ Version Mismatch:**
- Edge Functions use `@supabase/supabase-js@2.39.0`
- Client apps use `^2.45.4` (mobile) and `^2.110.0` (admin)
- There's a significant version gap between client (2.110.0) and Edge Functions (2.39.0)
- While unlikely to break, this should be unified for consistency

**⚠️ Deno Standard Library:**
- `https://deno.land/std@0.168.0` — pinned to a specific version (correct practice)
- Version 0.168.0 is relatively old; newer stdlib releases may have improvements/security fixes

---

## Dependency Risk Matrix

### High Risk Dependencies
None identified as high-risk.

### Medium Risk Dependencies

| Package | Risk | Reason |
|---|---|---|
| `tailwindcss ^4` | Medium | Major version, newer — less battle-tested |
| `@supabase/supabase-js@2.39.0` in Edge Functions | Medium | Outdated vs. clients — potential API drift |
| `next 16.2.9` | Medium | Very recent release — potential bugs |

### Low Risk Dependencies
All other dependencies are stable, widely-used packages in their stable versions.

---

## Missing Dependencies (Gaps)

| Feature | What's Missing | Impact |
|---|---|---|
| Image caching (mobile) | `react-native-fast-image` | Performance (re-downloads images) |
| Data caching | `@tanstack/react-query` | Performance (redundant fetches) |
| Form management | No library | Simple manual state; OK for current scale |
| Navigation state | No `react-navigation/redux` | Fine — local state navigation is used |
| Push notification deep link | No `expo-notifications` link handler | Functional gap |
| PDF generation | No `react-pdf` | Uses expo-print HTML → print dialog instead |
| Bluetooth printing | Not configured | Receipt printing uses system print dialog |
| E2E testing | No Detox, Maestro, or Playwright | No automated tests |
| Unit testing | No Jest config found | No test coverage |
| Error tracking | No Sentry or Bugsnag | No production error monitoring |
| Analytics | No Mixpanel/PostHog | No usage analytics |
| Feature flags | None | All features always on |

---

## Security-Sensitive Packages

| Package | Security Role | Notes |
|---|---|---|
| `expo-secure-store` | Stores auth tokens securely | Critical — hardware-backed |
| `@supabase/supabase-js` | Auth + RLS enforcement | Critical — no issues known |
| `expo-location` | GPS collection | Privacy-sensitive |
| `expo-camera` | Camera access | Privacy-sensitive |
| `expo-notifications` | Push token management | Privacy-sensitive |

---

## Recommended Dependency Additions

### Immediate (Before Production)
```bash
# Error tracking (crash reports in production)
npx expo install @sentry/react-native  # Mobile
npm install @sentry/nextjs             # Admin

# Push notification deep linking (mobile)
# Built into expo-notifications — just needs implementation
```

### Short-Term
```bash
# Data fetching with caching
npm install @tanstack/react-query

# Fast image caching (mobile)
npx expo install expo-image  # Or react-native-fast-image
```

### Optional
```bash
# E2E testing
npm install --save-dev maestro  # Mobile E2E
npm install --save-dev playwright  # Admin E2E

# Unit testing
npm install --save-dev jest @testing-library/react-native
```

---

## Package Scripts Audit

### Mobile (`RepairShopApp/package.json`)
```json
"start": "expo start",              ✅ Standard
"android": "expo start --android", ✅ Standard
"ios": "expo start --ios",         ✅ Standard
"build:preview": "eas build --platform android --profile preview",  ✅
"build:production": "eas build --platform all --profile production"  ✅
```
**Missing:** `test` script, `lint` script

### Admin (`admin-panel/package.json`)
```json
"dev": "next dev",    ✅ Standard
"build": "next build",  ✅ Standard
"start": "next start", ✅ Standard
"lint": "eslint ."    ✅ Linting configured
```
**Missing:** `test` script
