# 🏥 MedGuide AI

**MedGuide AI** is a premium AI-powered healthcare assistance web application designed to help users make informed medical decisions.  
It provides symptom analysis, specialist recommendations, medication management, and nearby hospital discovery using modern AI and web technologies.

> ⚠️ Disclaimer: MedGuide AI is a decision-support system and **not a replacement for professional medical advice**.

---

## 🚀 Features

### 🧠 AI-Powered Healthcare
- Symptom-based disease identification with confidence percentage
- AI-recommended medical specialists (ENT, Ortho, Pediatrician, etc.)
- Clinical chat with context-aware reasoning (powered by Gemini)
- Drug interaction & side-effects checker

### 📋 Medical Utilities
- Prescription OCR (scan prescriptions and auto-extract medicine data)
- Medication scheduling with reminders
- Patient health profile (chronic diseases, allergies, history)
- Emergency SOS with essential contact numbers

### 📍 Location Services
- Nearby hospital and doctor discovery (Maps integration)
- Quick access to emergency healthcare locations

---

## 🏗️ System Architecture

MedGuide AI follows a **4-layer architecture**:

1. **Presentation Layer**
   - Mobile-first responsive UI
   - Dashboard, Medication Tracker, Profile Management
2. **AI Intelligence Layer**
   - Gemini-powered symptom checker & clinical chat
3. **Automation Layer**
   - Prescription OCR, hospital finder, reminders
4. **Safety & Control Layer**
   - Mandatory medical disclaimers
   - Secure API key handling

---

## 🛠️ Tech Stack

### Frontend
- React (Vite) + TypeScript
- Tailwind CSS (Clean Medical UI)
- Framer Motion (Animations)
- Lucide React Icons

### Backend & Database
- Supabase (Authentication + PostgreSQL)
- Supabase Storage (optional)

### AI & APIs
- Google Gemini API (LLM + Vision OCR)
- Google Maps (Hospital & Doctor search)

### Deployment
- Vercel / Netlify (Free Tier)

---

## 🗄️ Database Schema (Supabase)

### `profiles`
- id (UUID)
- full_name
- age
- blood_type
- allergies[]
- chronic_conditions[]

### `medications`
- id
- user_id
- name
- dosage
- frequency
- times[]
- stock_count

### `logs`
- id
- user_id
- type
- data (JSON)
- created_at

---

## 🔐 Security & Ethics

- User authentication via Supabase Auth
- Health data stored securely
- AI outputs include safety disclaimers
- No direct diagnosis or prescription claims

---

## 👨‍💻 Team Details

**Group No:** 6  
**Project Type:** 3rd Year Mini/Main Project (CS – S6)

**Team Members:**
- Muhammed Ijas M B  
- Nufoos P M  
- Noble Benny  
- Govind Praveen  

---

## 📌 Project Status

- ✅ UI & core modules implemented
- ✅ AI symptom checker & chat integrated
- ⚠️ Doctor/Hospital data currently uses mock data
- 🔜 Planned: Real-time doctor & hospital APIs

---

## 📚 References

- Google Gemini API Documentation  
- Supabase Docs  
- WebMD Symptom Checker  
- Research: AI-based Clinical Decision Support Systems  

---

## ⭐ Conclusion

MedGuide AI demonstrates how AI can assist healthcare decision-making by combining symptom analysis, medical knowledge, and real-world utilities in a single unified platform.

---

**© 2026 – MedGuide AI**
