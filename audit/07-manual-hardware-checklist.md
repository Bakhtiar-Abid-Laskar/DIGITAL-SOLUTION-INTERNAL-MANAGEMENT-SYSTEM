# Phase R6: Real Hardware Manual Verification Checklist

**Purpose:** This document is the manual QA execution checklist for physical device features (Camera, Geolocation, Push Notifications, Thermal Printing) that cannot be verified in simulator/headless CI environments.  
**Tester:** Human QA Engineer / Device Tester  
**Testing Date:** ____________________  
**Device Model(s) Tested:** ____________________ (Android / iOS)  

---

## 1. Camera & Selfie Verification

| # | Test Scenario | Expected Outcome | Pass / Fail | Notes / Device OS Version |
|---|---|---|---|---|
| **C1** | First-time Camera Permission Prompt | App requests `CAMERA` permission with clear explanatory rationale. | `[  ]` | |
| **C2** | Permission Denied Handling | App displays informative message with button linking to OS Settings. | `[  ]` | |
| **C3** | Front Camera Default on Attendance | Camera opens facing user automatically for selfie verification. | `[  ]` | |
| **C4** | Photo Capture & WebP Compression | Image captures instantly, compresses to WebP (<200KB) without UI freeze. | `[  ]` | |
| **C5** | Retake Photo Workflow | User can discard captured preview and retake before submitting. | `[  ]` | |
| **C6** | Low-Light / Night Check-in | Selfie remains legible and correctly uploads to `attendance-selfies` bucket. | `[  ]` | |
| **C7** | Onsite Arrival/Departure Photo | Rear camera captures device repair status at client premises. | `[  ]` | |

---

## 2. GPS & Geofencing Attendance Verification

| # | Test Scenario | Expected Outcome | Pass / Fail | Notes / Device OS Version |
|---|---|---|---|---|
| **G1** | First-time Location Permission Prompt | App requests `ACCESS_FINE_LOCATION` with explanation. | `[  ]` | |
| **G2** | Check-in Inside Workshop Boundary (<50m) | Attendance marks `Present`, `at_location = true`, `review_status = 'approved'`. | `[  ]` | |
| **G3** | Check-in Outside Workshop Boundary (>50m) | Attendance records `at_location = false`, `review_status = 'pending'` for admin review. | `[  ]` | |
| **G4** | Boundary Edge (45m–55m) | Distance calculation accurate to within ±5m using Haversine formula. | `[  ]` | |
| **G5** | GPS Disabled / Airplane Mode | App alerts user: "Please enable Location Services to check in". | `[  ]` | |
| **G6** | Android Mock Location App Detection | Denies check-in if developer options mock location provider is active. | `[  ]` | |

---

## 3. Push Notifications & Deep Linking

| # | Test Scenario | Expected Outcome | Pass / Fail | Notes / Device OS Version |
|---|---|---|---|---|
| **P1** | Push Token Registration | On login, device registers Expo push token to `users.expo_push_token`. | `[  ]` | |
| **P2** | Technician Alert on Job Assignment | Push notification delivers within 3 seconds with sound/vibration. | `[  ]` | |
| **P3** | App Foregrounded Notification | In-app banner or toast displays without crashing active view. | `[  ]` | |
| **P4** | App Backgrounded Notification | Notification drawer displays title & priority ("URGENT: New Job Assigned"). | `[  ]` | |
| **P5** | App Killed / Cold Start Deep Link | Tapping notification opens app directly to the assigned `JobDetailScreen`. | `[  ]` | |
| **P6** | Notification Delivery on Token Rotation | Token refresh handles new device installation smoothly. | `[  ]` | |

---

## 4. Printing & WhatsApp Integration

| # | Test Scenario | Expected Outcome | Pass / Fail | Notes / Device OS Version |
|---|---|---|---|---|
| **W1** | WhatsApp Ready-for-Pickup Link | Tapping WhatsApp icon opens WhatsApp app with pre-filled customer message and normalized `+91` number. | `[  ]` | |
| **W2** | Thermal Receipt Printing | `expo-print` formats 58mm/80mm receipt with RepairShop branding and job code barcode. | `[  ]` | |
| **W3** | A4 PDF Invoice Share | Share sheet allows sharing generated PDF via WhatsApp, Email, or Drive. | `[  ]` | |
