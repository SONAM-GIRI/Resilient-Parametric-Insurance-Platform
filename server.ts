import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import nodemailer from "nodemailer";
import { fileURLToPath } from "url";
import { dirname } from "path";
import * as ss from "simple-statistics";
import Graph from "graphology";
import louvain from "graphology-communities-louvain";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
const db = new Database("insurance.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    trust_score REAL DEFAULT 0.5,
    tenure_days INTEGER DEFAULT 0,
    role TEXT DEFAULT 'worker'
  );

  CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount REAL,
    weather_condition TEXT,
    gps_data TEXT, -- JSON string
    sensor_data TEXT, -- JSON string
    network_info TEXT, -- JSON string
    risk_score REAL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS network_reputation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT UNIQUE,
    type TEXT, -- 'ip' or 'device'
    fraud_count INTEGER DEFAULT 0,
    legitimate_count INTEGER DEFAULT 0,
    reputation_score REAL DEFAULT 0.5 -- 0 (bad) to 1 (good)
  );

  CREATE TABLE IF NOT EXISTS fraud_clusters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_ids TEXT, -- Comma separated IDs
    cluster_score REAL,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS liquidity_pool (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    balance REAL DEFAULT 1000000,
    payout_threshold REAL DEFAULT 0.3
  );

  CREATE TABLE IF NOT EXISTS liquidity_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    balance REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'status_change', 'fraud_alert'
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed initial liquidity
const pool = db.prepare("SELECT * FROM liquidity_pool").get();
if (!pool) {
  db.prepare("INSERT INTO liquidity_pool (balance, payout_threshold) VALUES (?, ?)").run(1000000, 0.3);
  
  // Seed history for the last 24 hours
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const randomBalance = 950000 + Math.random() * 100000;
    db.prepare("INSERT INTO liquidity_history (balance, timestamp) VALUES (?, ?)").run(randomBalance, time.toISOString());
  }
}

// Seed admin user
const admin = db.prepare("SELECT * FROM users WHERE email = ?").get("admin@insurance.com");
if (!admin) {
  const hashedAdminPassword = bcrypt.hashSync("password", 10);
  db.prepare("INSERT INTO users (email, password, role) VALUES (?, ?, ?)").run("admin@insurance.com", hashedAdminPassword, "admin");
}

// Seed analyst user
const analyst = db.prepare("SELECT * FROM users WHERE email = ?").get("analyst@insurance.com");
if (!analyst) {
  const hashedAnalystPassword = bcrypt.hashSync("password", 10);
  db.prepare("INSERT INTO users (email, password, role) VALUES (?, ?, ?)").run("analyst@insurance.com", hashedAnalystPassword, "analyst");
}

// Seed viewer user
const viewer = db.prepare("SELECT * FROM users WHERE email = ?").get("viewer@insurance.com");
if (!viewer) {
  const hashedViewerPassword = bcrypt.hashSync("password", 10);
  db.prepare("INSERT INTO users (email, password, role) VALUES (?, ?, ?)").run("viewer@insurance.com", hashedViewerPassword, "viewer");
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  app.use(cors());
  app.use(morgan("dev"));
  app.use(express.json());

  // --- NOTIFICATION SERVICE ---
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const sendNotification = async (userId: number, type: string, message: string) => {
    try {
      // 1. Save to DB
      db.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)").run(userId, type, message);

      // 2. Send Email
      const user = db.prepare("SELECT email FROM users WHERE id = ?").get(userId) as any;
      if (user && user.email) {
        let subject = '📋 Claim Status Update';
        let color = '#4f46e5';
        let title = 'Claim Update';

        if (type === 'fraud_alert') {
          subject = '⚠️ SECURITY ALERT: Suspicious Activity Detected';
          color = '#ef4444';
          title = 'Security Alert';
        } else if (message.includes('APPROVED')) {
          subject = '✅ Claim Approved: Payout Processed';
          color = '#10b981';
          title = 'Claim Approved';
        } else if (message.includes('REJECTED')) {
          subject = '❌ Claim Rejected: Review Complete';
          color = '#ef4444';
          title = 'Claim Rejected';
        }

        const mailOptions = {
          from: process.env.SMTP_FROM || "noreply@resilient-insurance.com",
          to: user.email,
          subject: subject,
          text: message,
          html: `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f1f5f9; border-radius: 24px; background-color: #ffffff; color: #1e293b;">
              <div style="margin-bottom: 32px; text-align: center;">
                <div style="display: inline-block; padding: 12px; background-color: ${color}10; border-radius: 16px;">
                  <span style="font-size: 24px;">${type === 'fraud_alert' ? '⚠️' : '📋'}</span>
                </div>
              </div>
              <h2 style="color: ${color}; font-size: 24px; font-weight: 800; margin-bottom: 16px; text-align: center; letter-spacing: -0.025em;">${title}</h2>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px; text-align: center; color: #475569;">${message}</p>
              <div style="text-align: center;">
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/history" style="display: inline-block; padding: 14px 28px; background-color: ${color}; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; transition: all 0.2s ease;">View Claim History</a>
              </div>
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 40px 0;" />
              <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                This is an automated notification from ParametricGuard. If you have questions, please contact our support team.
              </p>
              <p style="font-size: 10px; color: #cbd5e1; text-align: center; margin-top: 8px;">
                &copy; 2026 Resilient Insurance. All rights reserved.
              </p>
            </div>
          `
        };

        if (process.env.SMTP_USER) {
          await transporter.sendMail(mailOptions);
        } else {
          console.log("--- MOCK EMAIL SENT ---");
          console.log(`To: ${user.email}`);
          console.log(`Subject: ${mailOptions.subject}`);
          console.log(`Body: ${message}`);
          console.log("-----------------------");
        }
      }
    } catch (e) {
      console.error("Notification error:", e);
    }
  };

  // --- AUTH MIDDLEWARE ---
  const authorize = (roles: string[] = []) => {
    return (req: any, res: any, next: any) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "Unauthorized: No token provided" });
        
        const token = authHeader.split(" ")[1];
        if (!token) return res.status(401).json({ error: "Unauthorized: Invalid token format" });

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.user = decoded;

        if (roles.length > 0 && !roles.includes(decoded.role)) {
          return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
        }
        next();
      } catch (e) {
        console.error("Auth error:", e);
        res.status(401).json({ error: "Invalid or expired token" });
      }
    };
  };

  // --- FRAUD DETECTION ENGINE ---

  const calculateSensorScore = (gps: any[], sensors: any) => {
    let score = 0;
    
    // 1. Teleport Jumps (GPS consistency)
    for (let i = 1; i < gps.length; i++) {
      const dist = Math.sqrt(
        Math.pow(gps[i].lat - gps[i-1].lat, 2) + 
        Math.pow(gps[i].lng - gps[i-1].lng, 2)
      );
      if (dist > 0.01) score += 0.5; // Arbitrary threshold for teleport
    }

    // 2. Accelerometer Variance
    const accels = sensors.accelerometer || [];
    if (accels.length > 0) {
      const variance = ss.variance(accels);
      if (variance < 0.1) score += 0.3; // Too static for a delivery worker
    }

    // 3. Gyroscope Entropy (Simulated)
    const gyro = sensors.gyroscope || [];
    if (gyro.length < 5) score += 0.2; // Lack of movement data

    return Math.min(score, 1.0);
  };

  const calculateBehavioralScore = (userId: number, claim: any) => {
    const history = db.prepare("SELECT * FROM claims WHERE user_id = ?").all(userId);
    let score = 0;

    // Claim frequency
    if (history.length > 5) score += 0.3;

    // Time of day deviation (Simulated)
    const hour = new Date().getHours();
    if (hour < 5 || hour > 23) score += 0.4;

    return Math.min(score, 1.0);
  };

  const getNetworkReputation = (identifier: string, type: 'ip' | 'device') => {
    const rep = db.prepare("SELECT reputation_score FROM network_reputation WHERE identifier = ? AND type = ?").get(identifier, type) as any;
    return rep ? rep.reputation_score : 0.5; // Default to 0.5 (neutral)
  };

  const updateNetworkReputation = (identifier: string, type: 'ip' | 'device', isFraud: boolean) => {
    const rep = db.prepare("SELECT * FROM network_reputation WHERE identifier = ? AND type = ?").get(identifier, type) as any;
    
    if (!rep) {
      const fraudCount = isFraud ? 1 : 0;
      const legitimateCount = isFraud ? 0 : 1;
      const score = (legitimateCount + 1) / (fraudCount + legitimateCount + 2);
      db.prepare("INSERT INTO network_reputation (identifier, type, fraud_count, legitimate_count, reputation_score) VALUES (?, ?, ?, ?, ?)")
        .run(identifier, type, fraudCount, legitimateCount, score);
    } else {
      const fraudCount = rep.fraud_count + (isFraud ? 1 : 0);
      const legitimateCount = rep.legitimate_count + (isFraud ? 0 : 1);
      const score = (legitimateCount + 1) / (fraudCount + legitimateCount + 2);
      db.prepare("UPDATE network_reputation SET fraud_count = ?, legitimate_count = ?, reputation_score = ? WHERE identifier = ? AND type = ?")
        .run(fraudCount, legitimateCount, score, identifier, type);
    }
  };

  const detectFraudClusters = () => {
    const recentClaims = db.prepare(`
      SELECT c.*, u.email 
      FROM claims c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.created_at > datetime('now', '-24 hours')
    `).all();

    const graph = new Graph({ type: 'undirected' });
    recentClaims.forEach((c: any) => {
      if (!graph.hasNode(c.user_id)) {
        graph.addNode(c.user_id, { email: c.email });
      }
    });

    // Add edges based on shared IP or timing
    for (let i = 0; i < recentClaims.length; i++) {
      for (let j = i + 1; j < recentClaims.length; j++) {
        const c1 = recentClaims[i] as any;
        const c2 = recentClaims[j] as any;
        const net1 = JSON.parse(c1.network_info);
        const net2 = JSON.parse(c2.network_info);

        if (c1.user_id !== c2.user_id && (net1.ip === net2.ip || net1.deviceId === net2.deviceId)) {
          if (!graph.hasEdge(c1.user_id, c2.user_id)) {
            graph.addEdge(c1.user_id, c2.user_id);
          }
        }
      }
    }

    const communities = louvain(graph);
    return communities;
  };

  // --- API ROUTES ---

  app.post("/api/auth/register", async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      db.prepare("INSERT INTO users (email, password) VALUES (?, ?)").run(email, hashedPassword);
      res.json({ message: "User registered" });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
      res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/auth/refresh", authorize(), (req, res) => {
    try {
      const user = (req as any).user;
      // Fetch user from DB to get latest email/role if needed, but for now just use decoded info
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
      res.json({ token });
    } catch (e) {
      res.status(401).json({ error: "Could not refresh token" });
    }
  });

  app.post("/api/claims/submit", authorize(), async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { amount, weather, gps, sensors, network } = req.body;

      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: "Invalid claim amount. Must be a positive number." });
      }

      if (!weather || typeof weather !== 'string') {
        return res.status(400).json({ error: "Weather condition is required." });
      }

      if (!Array.isArray(gps) || gps.length === 0) {
        return res.status(400).json({ error: "GPS data is required." });
      }

      if (!sensors || typeof sensors !== 'object') {
        return res.status(400).json({ error: "Sensor data is required." });
      }

      if (!network || typeof network !== 'object' || !network.ip || !network.deviceId) {
        return res.status(400).json({ error: "Network info (IP and Device ID) is required." });
      }

      // 1. Calculate Scores
      const sensorScore = calculateSensorScore(gps, sensors);
      const behavioralScore = calculateBehavioralScore(userId, req.body);
      
      // Network Reputation
      const ipRep = getNetworkReputation(network.ip, 'ip');
      const deviceRep = getNetworkReputation(network.deviceId, 'device');
      const networkRisk = 1 - ((ipRep + deviceRep) / 2);

      // Graph check
      const clusters = detectFraudClusters();
      const clusterId = clusters[userId];
      const clusterSize = Object.values(clusters).filter(v => v === clusterId).length;
      const graphRisk = clusterSize > 2 ? 0.8 : 0.1;

      // 2. Final Risk Score (FRS)
      const frs = (0.30 * sensorScore) + (0.25 * behavioralScore) + (0.20 * networkRisk) + (0.15 * graphRisk) + (0.10 * 0.1);

      // 3. Decision
      const pool = db.prepare("SELECT payout_threshold FROM liquidity_pool").get() as any;
      const threshold = pool ? pool.payout_threshold : 0.3;

      let status = "pending";
      if (frs < threshold) status = "approved";
      else if (frs >= 0.7) status = "flagged";

      // 4. Update Reputation based on initial decision
      updateNetworkReputation(network.ip, 'ip', status === 'flagged');
      updateNetworkReputation(network.deviceId, 'device', status === 'flagged');

      // 5. Update Liquidity & Payout
      if (status === "approved") {
        db.prepare("UPDATE liquidity_pool SET balance = balance - ?").run(amount);
      }

      const info = db.prepare(`
        INSERT INTO claims (user_id, amount, weather_condition, gps_data, sensor_data, network_info, risk_score, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, amount, weather, JSON.stringify(gps), JSON.stringify(sensors), JSON.stringify(network), frs, status);

      const claimId = info.lastInsertRowid;

      // Broadcast new claim
      broadcast({ 
        type: 'NEW_CLAIM', 
        claim: {
          id: claimId,
          user_id: userId,
          amount,
          weather_condition: weather,
          risk_score: frs,
          status,
          created_at: new Date().toISOString(),
          email: db.prepare("SELECT email FROM users WHERE id = ?").get(userId).email
        }
      });

      // 5. Trigger Notifications
      if (status === "approved") {
        await sendNotification(userId, 'status_change', `Your claim for $${amount} has been automatically approved and processed.`);
      } else if (status === "flagged") {
        await sendNotification(userId, 'fraud_alert', `Your claim for $${amount} has been flagged for manual review due to high risk indicators.`);
        
        // Alert Admins (Simulated by notifying the admin user)
        const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all() as any[];
        for (const admin of admins) {
          await sendNotification(admin.id, 'fraud_alert', `High risk claim detected from user ${userId}. Risk Score: ${(frs * 100).toFixed(1)}%`);
        }
      } else {
        await sendNotification(userId, 'status_change', `Your claim for $${amount} has been received and is currently pending review.`);
      }

      res.json({ claimId, frs, status });
    } catch (e) {
      console.error("Claim submission error:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "Internal Server Error" });
    }
  });

  app.get("/api/claims/:id", authorize(), (req, res) => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      const claim = db.prepare(`
        SELECT c.*, u.email 
        FROM claims c 
        JOIN users u ON c.user_id = u.id 
        WHERE c.id = ?
      `).get(req.params.id) as any;

      if (!claim) return res.status(404).json({ error: "Claim not found" });

      // Only allow owner or admin roles to see details
      if (!['admin', 'analyst', 'viewer'].includes(userRole) && claim.user_id !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json(claim);
    } catch (e) {
      console.error("Claim details error:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/claims/history", authorize(), (req, res) => {
    try {
      const userId = (req as any).user.id;
      const claims = db.prepare("SELECT * FROM claims WHERE user_id = ? ORDER BY created_at DESC").all(userId);
      res.json(claims);
    } catch (e) {
      console.error("History error:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/user/profile", authorize(), (req, res) => {
    try {
      const userId = (req as any).user.id;

      const user = db.prepare("SELECT id, email, role, trust_score, tenure_days FROM users WHERE id = ?").get(userId) as any;
      if (!user) return res.status(404).json({ error: "User not found" });

      // Fetch claims to calculate history and sensor reliability
      const claims = db.prepare("SELECT status, risk_score, network_info FROM claims WHERE user_id = ?").all(userId) as any[];
      
      // 1. Tenure Score (0-1) - Maxes out at 1 year
      const tenureScore = Math.min(user.tenure_days / 365, 1.0);

      // 2. Claim History Score (0-1)
      let claimHistoryScore = 0.5; // Default for new users
      if (claims.length > 0) {
        const approved = claims.filter(c => c.status === 'approved').length;
        const rejected = claims.filter(c => c.status === 'rejected' || c.status === 'flagged').length;
        claimHistoryScore = (approved + 1) / (approved + rejected + 2); // Laplace smoothing
      }

      // 3. Sensor Reliability (0-1)
      // (1 - average risk_score) as a proxy for reliability
      let sensorReliability = 0.7; // Default
      if (claims.length > 0) {
        const avgRisk = claims.reduce((acc, c) => acc + c.risk_score, 0) / claims.length;
        sensorReliability = 1 - avgRisk;
      }

      // 4. Network Reputation (0-1)
      let networkReputation = 0.5; // Default
      if (claims.length > 0) {
        const lastClaim = claims[claims.length - 1];
        try {
          const netInfo = JSON.parse(lastClaim.network_info);
          const ipRep = db.prepare("SELECT reputation_score FROM network_reputation WHERE identifier = ?").get(netInfo.ip) as any;
          const devRep = db.prepare("SELECT reputation_score FROM network_reputation WHERE identifier = ?").get(netInfo.deviceId) as any;
          
          if (ipRep && devRep) {
            networkReputation = (ipRep.reputation_score + devRep.reputation_score) / 2;
          } else if (ipRep) {
            networkReputation = ipRep.reputation_score;
          } else if (devRep) {
            networkReputation = devRep.reputation_score;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Final Trust Score Calculation (weighted)
      // 20% Tenure, 40% History, 20% Sensors, 20% Network
      const finalTrustScore = (tenureScore * 0.2) + (claimHistoryScore * 0.4) + (sensorReliability * 0.2) + (networkReputation * 0.2);
      
      // Update user's trust score in DB
      db.prepare("UPDATE users SET trust_score = ? WHERE id = ?").run(finalTrustScore, userId);

      const breakdown = {
        tenure: tenureScore,
        claimHistory: claimHistoryScore,
        sensorReliability: sensorReliability,
        networkReputation: networkReputation
      };

      res.json({ ...user, trust_score: finalTrustScore, breakdown });
    } catch (e) {
      console.error("Profile error:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/admin/clusters", authorize(["admin", "analyst", "viewer"]), (req, res) => {
    try {
      const communities = detectFraudClusters();
      const clusters: { [key: string]: number[] } = {};
      
      Object.entries(communities).forEach(([userId, clusterId]) => {
        if (!clusters[clusterId]) clusters[clusterId] = [];
        clusters[clusterId].push(Number(userId));
      });

      const clusterList = Object.entries(clusters)
        .filter(([_, userIds]) => userIds.length > 1) // Only show actual clusters
        .map(([id, userIds]) => ({
          id,
          userCount: userIds.length,
          userIds
        }));

      res.json(clusterList);
    } catch (e) {
      console.error("Clusters error:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/admin/clusters/:id", authorize(["admin", "analyst"]), (req, res) => {
    try {
      const clusterId = Number(req.params.id);
      const communities = detectFraudClusters();
      
      const userIds = Object.entries(communities)
        .filter(([_, cid]) => cid === clusterId)
        .map(([uid, _]) => Number(uid));

      if (userIds.length === 0) return res.status(404).json({ error: "Cluster not found" });

      const users = db.prepare(`
        SELECT id, email, trust_score 
        FROM users 
        WHERE id IN (${userIds.join(",")})
      `).all();

      const claims = db.prepare(`
        SELECT c.*, u.email 
        FROM claims c 
        JOIN users u ON c.user_id = u.id 
        WHERE c.user_id IN (${userIds.join(",")})
        ORDER BY c.created_at DESC
      `).all();

      res.json({ id: clusterId, users, claims });
    } catch (e) {
      console.error("Cluster details error:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/admin/claims/search", authorize(["admin", "analyst", "viewer"]), (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.json([]);
      
      const query = `%${q}%`;
      const claims = db.prepare(`
        SELECT c.*, u.email 
        FROM claims c 
        JOIN users u ON c.user_id = u.id 
        WHERE u.email LIKE ? OR CAST(c.id AS TEXT) LIKE ?
        ORDER BY c.created_at DESC 
        LIMIT 50
      `).all(query, query);
      
      res.json(claims);
    } catch (e) {
      console.error("Search error:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/admin/dashboard", authorize(["admin", "analyst", "viewer"]), (req, res) => {
    try {
      const pool = db.prepare("SELECT balance, payout_threshold FROM liquidity_pool").get() as any;
      const stats = {
        totalClaims: db.prepare("SELECT COUNT(*) as count FROM claims").get() as any,
        fraudRate: db.prepare("SELECT AVG(risk_score) as avg FROM claims").get() as any,
        avgTrustScore: db.prepare("SELECT AVG(trust_score) as avg FROM users").get() as any,
        liquidity: {
          balance: pool.balance,
          payoutThreshold: pool.payout_threshold,
          history: db.prepare("SELECT balance, timestamp FROM (SELECT * FROM liquidity_history ORDER BY timestamp DESC LIMIT 24) ORDER BY timestamp ASC").all()
        },
        recentClaims: db.prepare("SELECT c.*, u.email FROM claims c JOIN users u ON c.user_id = u.id ORDER BY created_at DESC LIMIT 10").all(),
        riskDistribution: db.prepare("SELECT risk_score FROM claims").all()
      };
      res.json(stats);
    } catch (e) {
      console.error("Dashboard error:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/admin/claims/:id/status", authorize(["admin", "analyst"]), async (req, res) => {
    try {
      const { status } = req.body;
      const claimId = req.params.id;

      const validStatuses = ['pending', 'approved', 'flagged', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }

      const claim = db.prepare("SELECT * FROM claims WHERE id = ?").get(claimId) as any;
      if (!claim) return res.status(404).json({ error: "Claim not found" });

      const oldStatus = claim.status;
      db.prepare("UPDATE claims SET status = ? WHERE id = ?").run(status, claimId);

      // Update network reputation based on manual review
      const networkInfo = JSON.parse(claim.network_info || "{}");
      if (networkInfo.ip) updateNetworkReputation(networkInfo.ip, 'ip', status === 'flagged' || status === 'rejected');
      if (networkInfo.deviceId) updateNetworkReputation(networkInfo.deviceId, 'device', status === 'flagged' || status === 'rejected');

      // Handle liquidity if approved manually
      if (status === "approved" && oldStatus !== "approved") {
        db.prepare("UPDATE liquidity_pool SET balance = balance - ?").run(claim.amount);
      } else if (oldStatus === "approved" && status !== "approved") {
        db.prepare("UPDATE liquidity_pool SET balance = balance + ?").run(claim.amount);
      }

      let notificationType = 'status_change';
      let notificationMessage = `The status of your claim for $${claim.amount} has been updated to: ${status.toUpperCase()}.`;

      if (status === 'flagged') {
        notificationType = 'fraud_alert';
        notificationMessage = `⚠️ SECURITY ALERT: Your claim for $${claim.amount} has been flagged for suspicious activity and is under manual review.`;
      } else if (status === 'rejected') {
        notificationType = 'fraud_alert';
        notificationMessage = `❌ CLAIM REJECTED: Your claim for $${claim.amount} has been rejected following a forensic review.`;
      } else if (status === 'approved') {
        notificationMessage = `✅ CLAIM APPROVED: Your claim for $${claim.amount} has been approved and the payout of $${claim.amount} has been processed.`;
      }

      await sendNotification(claim.user_id, notificationType, notificationMessage);

      // Broadcast status change
      broadcast({ 
        type: 'STATUS_UPDATE', 
        claimId, 
        userId: claim.user_id, 
        status,
        newBalance: db.prepare("SELECT balance FROM liquidity_pool").get().balance
      });

      res.json({ message: "Status updated", status });
    } catch (e) {
      console.error("Status update error:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/admin/liquidity/threshold", authorize(["admin"]), async (req, res) => {
    try {
      const { threshold } = req.body;
      if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
        return res.status(400).json({ error: "Invalid threshold. Must be a number between 0 and 1." });
      }

      db.prepare("UPDATE liquidity_pool SET payout_threshold = ?").run(threshold);
      
      broadcast({ 
        type: 'THRESHOLD_UPDATE', 
        threshold 
      });

      res.json({ message: "Payout threshold updated", threshold });
    } catch (e) {
      console.error("Threshold update error:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/notifications", authorize(), (req, res) => {
    try {
      const userId = (req as any).user.id;
      const notifications = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").all(userId);
      res.json(notifications);
    } catch (e) {
      console.error("Notifications fetch error:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/notifications/read-all", authorize(), (req, res) => {
    try {
      const userId = (req as any).user.id;
      db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (e) {
      console.error("Notifications update error:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // API 404 handler
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // --- VITE MIDDLEWARE ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
