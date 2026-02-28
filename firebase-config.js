const firebaseConfig = {
  apiKey: "AIzaSyBEq4u4ZIIS8Fmh5SLLZ650hp2_Xzf5gfc",
  authDomain: "restaurante-familia-gonzalez.firebaseapp.com",
  projectId: "restaurante-familia-gonzalez",
  storageBucket: "restaurante-familia-gonzalez.firebasestorage.app",
  messagingSenderId: "1078683557167",
  appId: "1:1078683557167:web:4305195cca7ea9222c55da"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();