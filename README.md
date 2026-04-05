# 🩸 BloodPoint — Blood Donor & Request Management Platform

A full stack blood donation platform connecting donors, requesters,
and hospitals across Delhi NCR. Built with Node.js and Express.js
with a custom database engine and JWT authentication.

---

## ✨ Features

- Role-based access for donors and requesters
- Real-time notifications for urgent and critical blood requests
- Donor search and matching by blood type, city, and availability
- Blood inventory tracking across multiple hospital banks
- Custom JSON-based database engine without any ORM
- Secure authentication with bcrypt password hashing and JWT
- Donation history logging with hemoglobin levels and bank details
- Urgency-based request prioritisation (normal, urgent, critical)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Auth | JWT, bcryptjs |
| Database | Custom JSON Persistence Layer |
| Other | UUID, REST APIs |

---

## 📁 Project Structure

    bloodpoint/
    ├── server.js          # Entry point
    ├── routes/            # All API route handlers
    ├── db/                # Custom database engine
    ├── public/            # Frontend files
    ├── package.json       # Dependencies
    └── README.md
    
## 🚀 How to Run Locally

1. Clone the repo
git clone https://github.com/nishant-rgb0/bloodpoint.git

2. Go into the project folder
cd bloodpoint

3. Install dependencies
npm install

4. Start the server
node server.js

5. Open in browser
http://localhost:3000
---

## 🔑 Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| demo@bloodpoint.in | demo123 | Donor (O+) |
| arjun.sharma@gmail.com | test1234 | Donor (O+) |
| vikram.singh@gmail.com | test1234 | Donor (O-) |
| sneha.kapoor@gmail.com | test1234 | Donor (AB+) |
| dr.tiwari@apollo.com | test1234 | Requester |
| meena.pillai@gmail.com | test1234 | Requester |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login and get JWT token |

### Donors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/donors | Get all available donors |
| GET | /api/donors/:id | Get donor by ID |
| PUT | /api/donors/:id | Update donor profile |

### Blood Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/requests | Get all blood requests |
| POST | /api/requests | Create new blood request |
| PUT | /api/requests/:id | Update request status |

### Blood Banks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/banks | Get all blood banks |
| GET | /api/banks/:id/inventory | Get inventory by bank |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notifications | Get user notifications |
| PUT | /api/notifications/read | Mark all as read |

---

## 👨‍💻 Author

**Nishant Singh**
B.Tech Computer Science — J.S.S. Academy of Technical Education, Noida
[LinkedIn]( https://www.linkedin.com/in/nishantsingh092/ ) 


4. Open in browser
   http://localhost:3000
