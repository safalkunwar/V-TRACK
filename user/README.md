# V-TRACK Enhanced Dashboard

A Google Maps-style live bus tracking dashboard with real-time Firebase integration, built for the V-TRACK bus tracking system.

## 🚀 Features

### ✅ Google Maps-Style Layout
- **Fullscreen responsive map** with clean, modern UI
- **Fixed top search bar** with location autocomplete
- **Collapsible left sidebar** with quick actions and bus list
- **Floating action buttons** for common functions
- **Bottom notification bar** with live updates

### ✅ Real-Time Firebase Integration
- **Live bus tracking** from `https://v-track-gu999-default-rtdb.firebaseio.com/BusLocation`
- **Real-time updates** using Firebase listeners (`onValue`, `child_changed`)
- **Route history** for today's date only
- **Bus status monitoring** (Active/Inactive based on 5-minute threshold)

### ✅ Bus Management
- **Bus switching** with dropdown selection (`bus1`, `bus2`, etc.)
- **Individual bus tracking** with highlighted markers
- **Bus information popups** with status, speed, and last update
- **Route history visualization** with polylines

### ✅ Directions & Navigation
- **Google Maps Directions API** integration
- **Click-to-get-directions** on map
- **Search bar integration** with Google Places autocomplete
- **Route calculation** from selected bus to destination
- **ETA and distance** display

### ✅ Enhanced UX Features
- **Saved places** management
- **Recent searches** history
- **Current location** detection
- **Nearby bus stops** finder
- **Responsive design** for mobile and desktop
- **Smooth animations** and hover effects

## 📁 Project Structure

```
user/
├── html/
│   └── dashboard.html          # Main dashboard interface
├── js/
│   ├── firebase.js            # Firebase integration module
│   ├── map.js                 # Map and directions functionality
│   ├── utils.js               # Utility functions and helpers
│   ├── dashboard.js           # Main dashboard controller
│   └── config.js              # Configuration (legacy)
├── css/
│   └── styles.css             # Additional styles
├── test.html                  # Test page for verification
└── README.md                  # This documentation
```

## 🛠️ Technical Implementation

### Modular Architecture
- **FirebaseManager**: Handles all Firebase operations
- **MapManager**: Manages map, markers, and directions
- **Utils**: Utility functions and local storage
- **GoogleMapsDashboard**: Main controller and UI coordination

### Key Technologies
- **Leaflet.js**: Open-source mapping library
- **Google Maps API**: Places autocomplete and directions
- **Firebase Realtime Database**: Live data synchronization
- **Font Awesome**: Icons and UI elements
- **Inter Font**: Modern typography

### Firebase Data Structure
```
BusLocation/
├── bus1/
│   ├── latitude: number
│   ├── longitude: number
│   ├── timestamp: string
│   └── speed: number
├── bus2/
│   └── ...
└── ...

RouteHistory/
├── bus1/
│   └── 2024-01-15/
│       ├── point1/
│       └── point2/
└── ...
```

## 🚀 Getting Started

### 1. Prerequisites
- Modern web browser with JavaScript enabled
- Internet connection for Firebase and map services
- Google Maps API key (included in the code)

### 2. Installation
1. Clone or download the project files
2. Open `test.html` in a web browser to verify setup
3. Navigate to `html/dashboard.html` to use the dashboard

### 3. Usage

#### Basic Navigation
- **Search**: Use the top search bar to find places
- **Sidebar**: Click the hamburger menu to open/close
- **Map**: Click anywhere to set destination for directions
- **Buses**: Click on bus markers to select and track

#### Bus Tracking
1. Open the sidebar and view "Live Buses"
2. Click on any bus to select it
3. The selected bus will be highlighted on the map
4. Route history will be displayed if available

#### Getting Directions
1. Select a bus from the sidebar or map
2. Click the directions button or click on the map
3. Enter a destination in the search bar
4. View the calculated route with ETA

#### Saving Places
1. Get your current location
2. Click "Set Home" or "Add Place" in the sidebar
3. Access saved places from the sidebar

## 🎯 Key Functionalities

### Real-Time Bus Tracking
- **Live Updates**: Buses update every few seconds
- **Status Monitoring**: Active/Inactive based on last update
- **Visual Indicators**: Green for active, red for inactive buses
- **Selection Highlighting**: Blue border for selected bus

### Route History
- **Today's Routes**: Only shows today's movement history
- **Visual Path**: Dashed blue line showing bus movement
- **Time-based**: Sorted by timestamp for chronological display

### Search & Directions
- **Google Places**: Autocomplete for locations worldwide
- **Smart Search**: Filters for restaurants, hospitals, bus stops
- **Route Calculation**: Real-time directions with traffic
- **Multiple Modes**: Driving directions from bus to destination

### User Experience
- **Responsive Design**: Works on mobile and desktop
- **Smooth Animations**: Hover effects and transitions
- **Intuitive UI**: Google Maps-like familiar interface
- **Error Handling**: Graceful fallbacks and notifications

## 🔧 Configuration

### Firebase Setup
The dashboard is pre-configured to connect to:
```
Database URL: https://v-track-gu999-default-rtdb.firebaseio.com
Project ID: v-track-gu999
```

### API Keys
- **Google Maps API**: Included in the HTML file
- **Firebase Config**: Pre-configured in the modules

### Customization
- **Map Center**: Change default coordinates in `map.js`
- **Update Intervals**: Modify timing in `dashboard.js`
- **Styling**: Update CSS in `dashboard.html` or `styles.css`

## 🧪 Testing

Use `test.html` to verify:
- ✅ Module loading
- ✅ Firebase connection
- ✅ Map initialization
- ✅ API availability

## 📱 Mobile Support

The dashboard is fully responsive and includes:
- **Touch-friendly** buttons and controls
- **Mobile-optimized** sidebar
- **Responsive** map container
- **Adaptive** floating buttons

## 🔄 Real-Time Features

### Live Updates
- **Bus Positions**: Update every few seconds
- **Status Changes**: Active/Inactive status updates
- **Route History**: New points added in real-time
- **Notifications**: Live count of active buses

### Performance
- **Efficient Rendering**: Only updates changed markers
- **Memory Management**: Proper cleanup of listeners
- **Optimized Loading**: Lazy loading of route history
- **Debounced Search**: Prevents excessive API calls

## 🎨 UI/UX Enhancements

### Visual Design
- **Clean Interface**: Minimal, modern design
- **Color Coding**: Intuitive status indicators
- **Typography**: Professional Inter font family
- **Icons**: Consistent Font Awesome icons

### User Feedback
- **Loading States**: Spinners and progress indicators
- **Notifications**: Toast-style bottom notifications
- **Hover Effects**: Interactive button states
- **Animations**: Smooth transitions and transforms

## 🚀 Future Enhancements

Potential improvements for future versions:
- **Offline Support**: Cache data for offline viewing
- **Push Notifications**: Real-time alerts for bus arrivals
- **Multi-language**: Internationalization support
- **Advanced Analytics**: Detailed bus performance metrics
- **User Accounts**: Personalized saved places and preferences

## 📞 Support

For technical support or feature requests:
1. Check the test page for system status
2. Verify Firebase connection and API keys
3. Review browser console for error messages
4. Ensure all required libraries are loaded

## 📄 License

This project is part of the V-TRACK bus tracking system and is designed for educational and commercial use.

---

**V-TRACK Enhanced Dashboard** - Bringing Google Maps-style functionality to bus tracking! 🚌🗺️ 