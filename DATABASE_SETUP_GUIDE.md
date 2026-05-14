# ESP32-CAM Database Setup Guide

## Problem: Table 'users' not found

Error ini terjadi karena database tables belum dibuat di Supabase.

---

## 🚀 SOLUSI (Pilih salah satu):

### Cara 1: Otomatis via Script (Coba dulu)

```bash
# Stop PM2 dulu
pm2 stop esp32-cam-streaming

# Run setup
npm run setup

# Kalau berhasil, start lagi
pm2 start esp32-cam-streaming
```

---

### Cara 2: Manual via Supabase Dashboard (Paling Reliable)

**Step 1:** Buka Supabase SQL Editor
```
https://supabase.com/dashboard/project/_/sql
```

**Step 2:** Copy semua SQL dari file `database-setup.sql`

**Step 3:** Paste di SQL Editor dan klik **"Run"**

**Step 4:** Verify tables dibuat:
- Buka "Table Editor" di Supabase
- Harus ada 3 tables: `users`, `devices`, `stream_sessions`

**Step 5:** Start aplikasi
```bash
pm2 restart esp32-cam-streaming
# atau
./deploy.sh
```

---

## ✅ Verify Setup Berhasil

```bash
# Check PM2 logs
pm2 logs esp32-cam-streaming

# Harus muncul:
# ✅ Supabase connected successfully
# 🚀 Server running on port 3000
```

---

## 🔍 Troubleshooting

### Error: "Could not find the table 'public.users'"
**Fix:** Jalankan SQL manual di Supabase (Cara 2)

### Error: "Connection failed"
**Fix:** Cek credentials di `.env`:
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_KEY=eyJxxx...
```

### Error: "RPC function not found"
**Fix:** Supabase free tier tidak support RPC, pakai Cara 2 (manual SQL)

---

## 📝 Quick Commands

```bash
# Stop app
pm2 stop esp32-cam-streaming

# Setup database
npm run setup

# Start app
pm2 start esp32-cam-streaming

# Check logs
pm2 logs esp32-cam-streaming

# Check status
pm2 status
```

---

## 🎯 Expected Result

Setelah setup berhasil, logs harus menunjukkan:

```
✅ Supabase connected successfully
🚀 Server running on port 3000
🌐 Local: http://localhost:3000
🌐 Network: http://0.0.0.0:3000
📊 Environment: production
```

---

## 💡 Tips

1. **Selalu gunakan Cara 2 (Manual SQL)** untuk first-time setup
2. **Simpan credentials** Supabase dengan aman
3. **Backup database** secara berkala via Supabase dashboard
4. **Monitor logs** dengan `pm2 logs` untuk detect issues

---

Need help? Check:
- Supabase Dashboard: https://supabase.com/dashboard
- PM2 Docs: https://pm2.keymetrics.io/docs/usage/quick-start/
