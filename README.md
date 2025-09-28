# 🟢 Wispr — Real-Time Chat Application  

**Wispr** is a modern real-time messenger platform built with **React**, **Node.js**, **Socket.IO**, and **MongoDB Atlas**.
A complete **MERN Stack** Project  
It supports one-to-one chats, groups, media sharing, and smooth user experience with error handling.  

---

## 🚀 Features
- ✅ Message Status: Pending, Sent, Received, Seen  
- ✅ Cloud Database with **MongoDB Atlas**  
- ✅ User Login/Register, Setup Profile
- ✅ Profile: Edit & Delete
- ✅ Message Options: Copy, Delete for Everyone  
- ✅ Search: Find users easily  
- ✅ Groups: Create & manage group chats  
- ✅ Snackbar Error Handling  
- ✅ Media Support(**Cloudinary**): Send Images, Videos, Files 

---

## 🔧 Tech Stack
- **Frontend**: React, Socket.IO Client, Material-UI / Custom UI  
- **Backend**: Node.js, Express.js, Socket.IO  
- **Database**: MongoDB Atlas  
- **Deployment**: Render  

---

## 📁 Folder Structure
```bash
Wispr/
  ├── wispr_frontend/   # React frontend
  │   ├── src/          # Components, hooks, context
  │   ├── public/       # Static assets
  │   └── package.json  # Frontend dependencies
  │
  ├── wispr_backend/    # Node.js backend
  │   ├── models/       # MongoDB Schemas
  │   ├── routes/       # Express routes
  │   ├── index.js      # Backend entry point
  │   ├── utils/       # Authentication
  │   ├── init/       # Initalize DB
  │   └── package.json  # Backend dependencies
  
```
---

## Clone the repositories
```bash
# Clone frontend
git clone https://github.com/dhairya9370/wispr_frontend.git
cd wispr_frontend

# Clone backend
git clone https://github.com/dhairya9370/wispr_backend.git
cd wispr_backend

```

## Backend .env Configure Environment Variables
```bash

ATLAS_DB_URL=your-mongodb-uri
SECRET=your-secret
CLOUD_NAME=name
CLOUD_API_KEY=key
CLOUD_API_SECRET=secret
PORT=3000
CLIENT_URL=https://localhost:3001
NODE_ENV=dev

```

## Frontend .env Configure Environment Variables 
```bash

VITE_API_URL=https://localhost:3000
VITE_SOCKET_URL=https://localhost:3000

```

## Run the app
```bash

# Start backend
cd wispr_backend
npm run dev

# Start frontend
cd wispr_frontend
npm start

```