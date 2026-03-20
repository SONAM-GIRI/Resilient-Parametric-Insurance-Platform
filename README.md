# Adversarially Resilient Parametric Insurance Platform

## Architecture Overview

This platform is designed to provide automated payouts for delivery workers during severe weather while defending against sophisticated fraud attacks, particularly GPS spoofing and coordinated fraud rings.

### 1. Multi-Layer Fraud Detection Engine
- **Sensor Fusion Validation:** Cross-references GPS coordinates with accelerometer and gyroscope data. It detects "teleportation" (impossible speed between points) and "static spoofing" (GPS moving but accelerometer showing no physical motion).
- **Behavioral Anomaly Detection:** Analyzes claim frequency, time-of-day patterns, and historical interactions. It uses statistical variance to flag deviations from a user's normal behavior.
- **Graph-Based Fraud Ring Detection:** Uses `graphology` and Louvain community detection to identify clusters of users sharing IP addresses, device IDs, or synchronized claim timings.

### 2. Risk Scoring Engine (FRS)
The Fraud Risk Score (FRS) is a weighted average:
- **35% Sensor Score:** Physical consistency.
- **30% Behavioral Score:** Historical anomalies.
- **20% Network Risk:** IP/Device reputation.
- **15% Graph Cluster Risk:** Membership in a detected fraud ring.

### 3. Liquidity Pool Protection
The system monitors the total insurance pool. During a detected "coordinated attack" (sudden spike in high-risk claims), the system dynamically increases the verification threshold to protect capital.

### 4. Tech Stack
- **Frontend:** React, Tailwind CSS, Framer Motion, Recharts.
- **Backend:** Node.js, Express, TypeScript.
- **Database:** SQLite (via `better-sqlite3`).
- **Graph Analysis:** `graphology`, `louvain`.

## Setup & Simulation
1. **Login:** Use `admin@insurance.com` / `password`.
2. **Submit Claim:** Go to the "Claims" tab to simulate normal or spoofed submissions.
3. **Simulate Attack:** Use the "Simulator" tab to trigger a batch of coordinated fraud attempts.
4. **Monitor:** View the "Admin Dashboard" to see risk distributions and liquidity levels.
