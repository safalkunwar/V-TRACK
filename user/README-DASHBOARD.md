# V-Track User Dashboard

Mobile-first user dashboard for tracking buses in real-time with integrated map, directions, and bus information.

## 📁 Files

- `user-dashboard.html` - Main HTML structure
- `user-dashboard.css` - Mobile-first responsive styles
- `user-dashboard.js` - Core functionality and Firebase integration

## 🚀 Quick Setup

### 1. File Placement

Place all three files in your `/user/` directory:
```
user/
├── html/
│   └── user-dashboard.html
├── css/
│   └── user-dashboard.css
└── js/
    └── user-dashboard.js
```

### 2. Firebase Configuration

Update the Firebase config in `user-dashboard.js` (lines 20-28):

```javascript
firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    // ... other config values
}
```

### 3. Integration with Main Site

Add a link to the dashboard in your main navigation:

```html
<a href="html/user-dashboard.html">User Dashboard</a>
```

## 🔧 Configuration

### Proximity Alert Threshold

Change the distance (in meters) for bus proximity alerts:

```javascript
// In user-dashboard.js, line 35
PROXIMITY_THRESHOLD: 300, // Change this value
```

Or set it via the menu: **Menu → Set Alert**

### Map Type

Toggle between street map and satellite view using the header button, or set default in code.

### Update Intervals

Adjust how frequently buses update:

```javascript
BUS_UPDATE_INTERVAL: 5000, // 5 seconds
OFFLINE_CHECK_INTERVAL: 10000, // 10 seconds
```

## 🔐 Firebase Security Rules

For read-only public access to bus data, use these rules:

```json
{
  "rules": {
    "BusLocation": {
      ".read": true,
      ".write": false
    },
    "busDetails": {
      ".read": true,
      ".write": false
    },
    "routes": {
      ".read": true,
      ".write": false
    },
    "notices": {
      ".read": true,
      ".write": false
    },
    "reports": {
      ".read": "auth != null",
      ".write": true
    },
    "users": {
      "$uid": {
        "savedPlaces": {
          ".read": "$uid === auth.uid",
          ".write": "$uid === auth.uid"
        }
      }
    }
  }
}
```

## 📱 Features

### ✅ Implemented

1. **Live Bus Tracking**
   - Real-time bus markers from `BusLocation/{busId}/{timestamp}`
   - Automatic updates every 5 seconds
   - Bus status (online/offline)

2. **Route Display**
   - Route polylines from `routes/{routeId}/points`
   - Visual route overlay on map

3. **Place Marker Tool**
   - Tap "Mark" button, click map to save location
   - Saved to localStorage (and optionally Firebase)
   - Custom markers with names

4. **Search & Directions**
   - Address search using Nominatim (OpenStreetMap)
   - Turn-by-turn directions using Leaflet Routing Machine
   - ETA calculation

5. **Bus Tracking**
   - "Track My Bus" button to follow selected bus
   - Proximity alerts when bus is within threshold
   - Auto-center map on tracked bus

6. **Offline Support**
   - Caches last-known bus positions
   - Shows offline indicator
   - Resumes updates when connection restored

7. **Bus Information**
   - Driver name, phone number
   - Route information
   - Click-to-call driver
   - Track bus from popup

8. **Notices**
   - Displays notices from Firebase `notices` node
   - Sorted by timestamp (newest first)

9. **Report Issues**
   - Form to report bus delays, breakdowns, etc.
   - Saves to Firebase `reports/{uid}` or localStorage

10. **UI Features**
    - Night mode toggle
    - Map type toggle (streets/satellite)
    - Mobile-first responsive design
    - Large touch targets
    - Smooth animations

## 🗺️ Map Providers

### Default: OpenStreetMap (Free)
- No API key required
- Good for development and production

### Alternative: Google Maps
To use Google Maps instead, replace the tile layer in `initializeMap()`:

```javascript
L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    attribution: '&copy; Google Maps',
    maxZoom: 19
}).addTo(state.map);
```

**Note:** Requires Google Maps API key and billing enabled.

## 🔍 Search Provider

Currently uses **Nominatim (OpenStreetMap)** - free, no API key needed.

### Alternative: Google Places API
To use Google Places, you'll need to:
1. Enable Places API in Google Cloud Console
2. Add API key to HTML
3. Replace `searchAddress()` function with Google Places API calls

## 📊 Firebase Data Structure

### Read-Only Paths (Public)

```
BusLocation/
  {busId}/
    {timestamp}/  # {latitude, longitude}
    ...

busDetails/
  {busId}/
    busName: string
    driverName: string
    driverPhone: string
    routeId: string
    routeName: string
    ...

routes/
  {routeId}/
    name: string
    description: string
    points: [
      {lat: number, lng: number, name: string},
      ...
    ]

notices/
  {noticeId}/
    title: string
    message: string
    timestamp: number
```

### Write Paths (User Data)

```
reports/
  {userId}/
    {reportId}/
      type: string
      description: string
      busId: string
      timestamp: number
      location: {lat, lng}

users/
  {uid}/
    savedPlaces/
      {placeId}/
        name: string
        lat: number
        lng: number
        timestamp: number
```

## 🧪 Demo Mode

If Firebase is unavailable, the dashboard automatically switches to demo mode:
- Simulates one bus moving along a predefined route
- Updates every 3 seconds
- Useful for testing without Firebase connection

## 🐛 Troubleshooting

### Buses Not Showing
1. Check Firebase configuration in `user-dashboard.js`
2. Verify Firebase security rules allow read access
3. Check browser console for errors
4. Ensure `BusLocation` data exists in Firebase

### Directions Not Working
1. Check internet connection (requires external API)
2. Verify Leaflet Routing Machine is loaded
3. Ensure user location permission is granted

### Offline Mode Not Working
1. Check browser localStorage is enabled
2. Verify data was cached before going offline
3. Check console for localStorage errors

## 📝 Customization

### Change Default Map Center

```javascript
// In user-dashboard.js
defaultCenter: [28.2150, 83.9886], // [latitude, longitude]
```

### Change Default Zoom Level

```javascript
defaultZoom: 13, // 1-19, higher = more zoomed in
```

### Customize Colors

Edit CSS variables in `user-dashboard.css`:

```css
:root {
    --primary-color: #3b82f6;
    --secondary-color: #10b981;
    /* ... other colors */
}
```

## 🔄 Integration with Existing System

The dashboard is designed to work alongside your existing driver/admin panels:

- **Reads** from same Firebase paths (`BusLocation`, `busDetails`, `routes`)
- **Does not modify** driver/admin data
- **Separate** user data storage (`reports`, `users/{uid}/savedPlaces`)

## 📱 Mobile Optimization

- Touch-optimized buttons (minimum 44x44px)
- Swipe gestures for panels
- Responsive layout (mobile-first)
- Large tap targets
- Optimized for one-handed use

## 🔒 Privacy & Security

- User location is **never** sent to Firebase without explicit action
- Saved places stored locally by default
- Reports can be anonymous or require auth
- Read-only access to public bus data

## 📚 API Dependencies

### CDN Scripts (Loaded in HTML)
- Firebase 8.10.0 (app, database)
- Leaflet 1.9.4 (map library)
- Leaflet Routing Machine 3.2.12 (directions)

### External APIs
- Nominatim (OpenStreetMap) - for address search
- OSRM (via Leaflet Routing Machine) - for directions

## ✅ Testing Checklist

- [ ] Map loads and displays correctly
- [ ] Bus markers appear and update
- [ ] Route polylines display for buses with routes
- [ ] Place marker tool works
- [ ] Saved places persist after page reload
- [ ] Search finds addresses
- [ ] Directions calculate correctly
- [ ] Bus tracking follows selected bus
- [ ] Proximity alert triggers
- [ ] Offline indicator shows when disconnected
- [ ] Notices load from Firebase
- [ ] Report form submits successfully
- [ ] Night mode toggles
- [ ] Map type toggles
- [ ] All panels open/close smoothly
- [ ] Mobile responsive on various screen sizes

## 🚀 Next Steps

1. **Add Authentication** (optional):
   - Integrate Firebase Auth
   - Save places to user account
   - Personalized reports

2. **Enhanced Features**:
   - Push notifications for proximity alerts
   - Bus schedule integration
   - Favorite buses
   - Route planning

3. **Performance**:
   - Implement bus marker clustering for many buses
   - Optimize Firebase listeners
   - Add service worker for offline caching

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Verify Firebase configuration
3. Test with demo mode enabled
4. Check Firebase security rules

---

**Version:** 1.0  
**Last Updated:** 2025  
**Compatible with:** Firebase Realtime Database, Leaflet 1.9.4+

