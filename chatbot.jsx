import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
// In real environment, after 'npm install @gradio/client', you need to uncomment the line below:
import { Client } from "@gradio/client";

// Main App component for the V-Track Chatbot
const App = () => {
  // State for Firebase instances and user ID
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // State to store chat messages
  const [messages, setMessages] = useState([]);
  // State to store the current input message
  const [inputMessage, setInputMessage] = useState('');
  // State to indicate if the bot is currently processing a response
  const [isLoading, setIsLoading] = useState(false);

  // Ref for the chat messages container to enable auto-scrolling
  const messagesEndRef = useRef(null);

  // Gradio Client instance (will be used in your local environment)
  const gradioClientRef = useRef(null);

  // Function to scroll to the bottom of the chat messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Effect to scroll to the bottom whenever messages are updated
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Firebase and handle authentication
  useEffect(() => {
    const initFirebase = async () => {
      try {
        // Firebase config is provided globally by the Canvas environment
        // In your real environment, replace this with your actual firebaseConfig object:
        // const firebaseConfig = { /* your firebase config here */ };
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
        const app = initializeApp(firebaseConfig);
        const database = getDatabase(app);
        const firebaseAuth = getAuth(app);

        setDb(database);
        setAuth(firebaseAuth);

        // Sign in with custom token if available, otherwise anonymously
        // In your real environment, handle user authentication as per your app's flow.
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(firebaseAuth, __initial_auth_token);
        } else {
          await signInAnonymously(firebaseAuth);
        }

        // Listen for auth state changes
        onAuthStateChanged(firebaseAuth, (user) => {
          if (user) {
            setUserId(user.uid);
          } else {
            setUserId(crypto.randomUUID()); // Anonymous or unauthenticated user
          }
          setIsAuthReady(true); // Firebase auth is ready
        });

      } catch (error) {
        console.error("Error initializing Firebase or authenticating:", error);
        // Handle error, e.g., display a message to the user
        setIsAuthReady(true); // Still set ready to allow basic app functionality
      }
    };

    // Initialize Gradio Client (this part is for your local environment)
    // In your real environment, you would uncomment and use this:
    /*
    const initGradioClient = async () => {
        try {
            const client = await Client.connect("Faheemalvi/LLaMa");
            gradioClientRef.current = client;
            console.log("Gradio Client connected successfully.");
        } catch (error) {
            console.error("Error connecting to Gradio Client:", error);
        }
    };
    */

    initFirebase();
    // initGradioClient(); // Uncomment this in your local environment
  }, []); // Run only once on component mount

  /**
   * Fetches bus location data from Firebase Realtime Database.
   * @param {string} busIdentifier The ID or name of the bus (e.g., "A", "123").
   * @returns {Promise<Object|null>} The latest bus location data or null if not found.
   */
  const fetchBusLocationFromFirebase = async (busIdentifier) => {
    if (!db || !isAuthReady) {
      console.warn("Firebase DB not ready or not authenticated.");
      return null;
    }
    try {
      // Assuming 'BusLocation' node contains bus data keyed by busId (e.g., "a", "b", "c")
      // and each busId has timestamped location entries.
      const busRef = ref(db, `BusLocation/${busIdentifier.toLowerCase()}`);
      const snapshot = await get(busRef);

      if (snapshot.exists()) {
        const busData = snapshot.val();
        // Get the latest timestamp entry from the busData
        // The keys in busData are timestamps, so we sort them to get the latest.
        const timestamps = Object.keys(busData);
        if (timestamps.length > 0) {
          const latestTimestamp = timestamps.sort((a, b) => parseInt(b) - parseInt(a))[0];
          return busData[latestTimestamp]; // Return the latest location object
        }
      }
      return null;
    } catch (error) {
      console.error("Error fetching bus location from Firebase:", error);
      return null;
    }
  };

  /**
   * Fetches bus details (driver name, number, route etc.) from Firebase Realtime Database.
   * This function tries to find bus details by bus name, bus number, or driver name.
   * @param {string} identifier The bus name (e.g., "Bus A"), bus number (e.g., "GAA 00 26"), or driver name.
   * @returns {Promise<Object|null>} The bus details or null if not found.
   */
  const fetchBusDetailsFromFirebase = async (identifier) => {
    if (!db || !isAuthReady) {
      console.warn("Firebase DB not ready or not authenticated.");
      return null;
    }
    try {
      const busDetailsRef = ref(db, 'busDetails');

      // Fetch all bus details and then filter in memory
      const snapshot = await get(busDetailsRef);
      if (snapshot.exists()) {
        const details = snapshot.val();
        for (const key in details) {
          const bus = details[key];
          if (bus.busName && bus.busName.toLowerCase() === identifier.toLowerCase()) {
            return bus;
          }
          if (bus.driverName && bus.driverName.toLowerCase() === identifier.toLowerCase()) {
            return bus;
          }
          if (bus.busNumber && bus.busNumber.toLowerCase() === identifier.toLowerCase()) {
            return bus;
          }
        }
      }
      return null;
    } catch (error) {
      console.error("Error fetching bus details from Firebase:", error);
      return null;
    }
  };

  /**
   * Calls the Hugging Face Space API for LLM inference.
   * In this Canvas environment, this is simulated with a fetch call.
   * In your real local environment, you would use @gradio/client here.
   *
   * @param {string} userPrompt The user's input prompt.
   * @returns {Promise<string>} A promise that resolves with the LLM's response.
   */
  const callHuggingFaceAPI = async (userPrompt) => {
    // This is the simulated fetch call for the Canvas environment.
    // In your real environment, you would replace this with the @gradio/client implementation:
    /*
    if (!gradioClientRef.current) {
      console.error("Gradio Client is not initialized.");
      return "I'm sorry, the AI service is not available. Please try again later.";
    }

    const system_message = `You are a helpful assistant for V-Track, a vehicle tracking system.
    V-Track provides general information about its features, but for real-time data like bus locations, driver contacts, or detailed routes, it relies on its internal database.
    If the user asks a general question, provide a helpful and concise answer.`;

    try {
      const result = await gradioClientRef.current.predict("/chat", {
        message: userPrompt,
        system_message: system_message,
        max_tokens: 100,
        temperature: 0.7,
        top_p: 0.9,
      });
      return result.data && result.data[0] ? result.data[0] : "I'm sorry, I couldn't get a clear response from the AI.";
    } catch (error) {
      console.error("Error calling Hugging Face API:", error);
      return "There was an error connecting to the AI. Please try again later.";
    }
    */

    // Simulated fetch for Canvas environment:
    console.log("Simulating Hugging Face API call for Canvas environment...");
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`(Simulated HF response for: "${userPrompt}") I am V-Track's AI assistant. How can I help you today?`);
      }, 1500); // Simulate network delay
    });
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return;

    const userMessage = { text: inputMessage, sender: 'user' };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputMessage(''); // Clear input field
    setIsLoading(true);

    try {
      let botResponseText = '';
      const lowerCasePrompt = userMessage.text.toLowerCase();

      // Prioritize specific V-Track queries using Firebase data
      if (lowerCasePrompt.includes('where is bus') || lowerCasePrompt.includes('bus location')) {
        const busIdentifierMatch = lowerCasePrompt.match(/(bus|vehicle)\s*(\d+|[a-z])/);
        const busIdentifier = busIdentifierMatch ? busIdentifierMatch[2].toUpperCase() : null;

        if (busIdentifier) {
          const locationData = await fetchBusLocationFromFirebase(busIdentifier);
          if (locationData) {
            botResponseText = `Bus ${busIdentifier} is currently at Latitude: ${locationData.latitude}, Longitude: ${locationData.longitude} (Last updated: ${new Date(locationData.timestamp).toLocaleTimeString()}). This data is live from our Firebase database.`;
          } else {
            botResponseText = `I couldn't find live location data for Bus ${busIdentifier} in our Firebase database. Please ensure the bus ID is correct (e.g., "Bus A", "Bus B").`;
          }
        } else {
          botResponseText = `Please specify which bus you are asking about (e.g., "Where is bus A?").`;
        }
      } else if (lowerCasePrompt.includes('contact details of driver') || lowerCasePrompt.includes('driver contact')) {
        const driverNameMatch = lowerCasePrompt.match(/(driver|person)\s*(.+)/);
        const driverIdentifier = driverNameMatch ? driverNameMatch[2].trim() : null;

        if (driverIdentifier) {
          const busDetails = await fetchBusDetailsFromFirebase(driverIdentifier);
          if (busDetails && busDetails.driverName && busDetails.driverNum) {
            botResponseText = `The contact for driver ${busDetails.driverName} (Bus ${busDetails.busName || 'N/A'}) is: ${busDetails.driverNum}. This data is live from our Firebase database.`;
          } else {
            botResponseText = `I couldn't find contact details for driver "${driverIdentifier}" in our Firebase database. Please ensure you are asking about a known driver or bus (e.g., "Contact of driver Raju Yadav" or "Contact of driver for Bus A").`;
          }
        } else {
          botResponseText = `Please specify which driver or bus you are asking about (e.g., "What is the contact details of driver Raju Yadav?" or "Contact of driver for Bus A?").`;
        }
      } else if (lowerCasePrompt.includes('summarize route') || lowerCasePrompt.includes('bus schedule') || lowerCasePrompt.includes('bus stops')) {
          const busIdentifierMatch = lowerCasePrompt.match(/(bus|route)\s*(\d+|[a-z])/);
          const busIdentifier = busIdentifierMatch ? busIdentifierMatch[2].toUpperCase() : null;

          if (busIdentifier) {
            const busDetails = await fetchBusDetailsFromFirebase(busIdentifier);
            if (busDetails && busDetails.busRoute) {
              // Assuming busRoute is a string describing the route.
              // For a more detailed schedule, you'd need more structured data in Firebase.
              botResponseText = `Based on our Firebase data, the route for Bus ${busDetails.busName || busIdentifier} is: ${busDetails.busRoute}.
              Operating Hours: (Please refer to your V-Track app for detailed schedule, as this data is not explicitly structured in the current Firebase 'busDetails' for full schedule).
              This route information is live from our Firebase database.`;
            } else {
              botResponseText = `I couldn't find detailed route or schedule information for Bus ${busIdentifier} in our Firebase database.`;
            }
          } else {
            botResponseText = `Please specify which bus's route you want to summarize (e.g., "Summarize route for bus A?").`;
          }
      }
      // If not a specific V-Track query handled by Firebase, use the Hugging Face API for general conversation
      else {
        botResponseText = await callHuggingFaceAPI(userMessage.text);
      }

      const botMessage = { text: botResponseText, sender: 'bot' };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('Error handling message:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: 'Oops! Something went wrong. Please try again.', sender: 'bot' },
      ]);
    } finally {
      setIsLoading(false); // Ensure loading state is cleared
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center p-4 font-inter">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col h-[80vh] overflow-hidden">
        {/* Chatbot Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-xl flex items-center justify-between shadow-md">
          <h1 className="text-2xl font-bold">V-Track Chatbot</h1>
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm">Online</span>
          </div>
        </div>

        {/* Chat Messages Display Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 italic mt-10">
              Type a message to start chatting with V-Track!
              <br />
              (e.g., "Where is bus A?", "Contact details of driver Raju Yadav?", or "Summarize the route for bus B?")
            </div>
          )}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[70%] p-3 rounded-lg shadow-sm bg-gray-200 text-gray-800 rounded-bl-none">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce-slow"></div>
                  <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce-medium"></div>
                  <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce-fast"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} /> {/* Scroll target */}
        </div>

        {/* Message Input and Send Button */}
        <div className="p-4 bg-gray-100 rounded-b-xl flex items-center shadow-inner">
          <input
            type="text"
            className="flex-1 p-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button
            className="ml-3 px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            onClick={handleSendMessage}
            disabled={isLoading}
          >
            Send
          </button>
        </div>
      </div>

      {/* Custom CSS for scrollbar and bounce animation */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        .font-inter {
          font-family: 'Inter', sans-serif;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes bounce-medium {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes bounce-fast {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 1.2s infinite;
        }
        .animate-bounce-medium {
          animation: bounce-medium 1.2s infinite 0.2s;
        }
        .animate-bounce-fast {
          animation: bounce-fast 1.2s infinite 0.4s;
        }
      `}</style>
    </div>
  );
};

export default App;
