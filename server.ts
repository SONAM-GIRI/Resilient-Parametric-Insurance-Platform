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
  const PORT = 3000;

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
        const mailOptions = {
          from: process.env.SMTP_FROM || "noreply@resilient-insurance.com",
          to: user.email,
          subject: type === 'fraud_alert' ? '⚠️ SECURITY ALERT: Suspicious Activity Detected' : '📋 Claim Status Update',
          text: message,
          html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: ${type === 'fraud_alert' ? '#ef4444' : '#4f46e5'}">${type === 'fraud_alert' ? 'Security Alert' : 'Claim Update'}</h2>
            <p>${message}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">This is an automated notification from Resilient Insurance.</p>
          </div>`
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
        if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
        
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.user = decoded;

        if (roles.length > 0 && !roles.includes(decoded.role)) {
          return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
        }
        next();
      } catch (e) {
        res.status(401).json({ error: "Invalid token" });
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
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
      res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/claims/submit", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
      
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;

      const { amount, weather, gps, sensors, network } = req.body;

      // 1. Calculate Scores
      const sensorScore = calculateSensorScore(gps, sensors);
      const behavioralScore = calculateBehavioralScore(userId, req.body);
      
      // Graph check
      const clusters = detectFraudClusters();
      const clusterId = clusters[userId];
      const clusterSize = Object.values(clusters).filter(v => v === clusterId).length;
      const graphRisk = clusterSize > 2 ? 0.8 : 0.1;

      // 2. Final Risk Score (FRS)
      const frs = (0.35 * sensorScore) + (0.30 * behavioralScore) + (0.20 * 0.1) + (0.15 * graphRisk);

      // 3. Decision
      let status = "pending";
      if (frs < 0.3) status = "approved";
      else if (frs >= 0.7) status = "flagged";

      // 4. Update Liquidity & Payout
      if (status === "approved") {
        db.prepare("UPDATE liquidity_pool SET balance = balance - ?").run(amount);
      }

      const info = db.prepare(`
        INSERT INTO claims (user_id, amount, weather_condition, gps_data, sensor_data, network_info, risk_score, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, amount, weather, JSON.stringify(gps), JSON.stringify(sensors), JSON.stringify(network), frs, status);

      const claimId = info.lastInsertRowid;

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

  app.get("/api/claims/:id", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
      
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;
      const userRole = decoded.role;

      const claim = db.prepare(`
        SELECT c.*, u.email 
        FROM claims c 
        JOIN users u ON c.user_id = u.id 
        WHERE c.id = ?
      `).get(req.params.id) as any;

      if (!claim) return res.status(404).json({ error: "Claim not found" });

      // Only allow owner or admin to see details
      if (userRole !== "admin" && claim.user_id !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json(claim);
    } catch (e) {
      console.error("Claim details error:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/claims/history", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
      
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;

      const claims = db.prepare("SELECT * FROM claims WHERE user_id = ? ORDER BY created_at DESC").all(userId);
      res.json(claims);
    } catch (e) {
      console.error("History error:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/user/profile", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
      
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.id;

      const user = db.prepare("SELECT id, email, role, trust_score, tenure_days FROM users WHERE id = ?").get(userId) as any;
      if (!user) return res.status(404).json({ error: "User not found" });

      // Calculate contribution breakdown (simulated for now)
      const breakdown = {
        tenure: Math.min(user.tenure_days / 365, 0.3),
        claimHistory: 0.4, // Base score for good history
        sensorConsistency: 0.3 // Base score for consistent sensor data
      };

      res.json({ ...user, breakdown });
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

  app.get("/api/admin/dashboard", authorize(["admin", "analyst", "viewer"]), (req, res) => {
    try {
      const stats = {
        totalClaims: db.prepare("SELECT COUNT(*) as count FROM claims").get() as any,
        fraudRate: db.prepare("SELECT AVG(risk_score) as avg FROM claims").get() as any,
        avgTrustScore: db.prepare("SELECT AVG(trust_score) as avg FROM users").get() as any,
        liquidity: {
          balance: (db.prepare("SELECT balance FROM liquidity_pool").get() as any).balance,
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

      const claim = db.prepare("SELECT * FROM claims WHERE id = ?").get(claimId) as any;
      if (!claim) return res.status(404).json({ error: "Claim not found" });

      const oldStatus = claim.status;
      db.prepare("UPDATE claims SET status = ? WHERE id = ?").run(status, claimId);

      // Handle liquidity if approved manually
      if (status === "approved" && oldStatus !== "approved") {
        db.prepare("UPDATE liquidity_pool SET balance = balance - ?").run(claim.amount);
      } else if (oldStatus === "approved" && status !== "approved") {
        db.prepare("UPDATE liquidity_pool SET balance = balance + ?").run(claim.amount);
      }

      await sendNotification(claim.user_id, 'status_change', `The status of your claim for $${claim.amount} has been updated to: ${status.toUpperCase()}.`);

      res.json({ message: "Status updated", status });
    } catch (e) {
      console.error("Status update error:", e);
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
