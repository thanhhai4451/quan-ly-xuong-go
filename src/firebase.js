import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth"; 

const firebaseConfig = {
  apiKey: "AIzaSyBjiVncPDevZ9_1saZwANE4M3ITkGjB0TY",
  authDomain: "quanlysanxuat-97d98.firebaseapp.com",
  projectId: "quanlysanxuat-97d98",
  storageBucket: "quanlysanxuat-97d98.firebasestorage.app",
  messagingSenderId: "773840018886",
  appId: "1:773840018886:web:1c69bfda0250389f1f26c7",
  // Link mày vừa chụp đây:
  databaseURL: "https://quanlysanxuat-97d98-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app); // Thêm dòng này để dùng đăng nhập