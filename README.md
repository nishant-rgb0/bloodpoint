# BloodPoint 🩸
A full stack blood donor and request management platform connecting
donors, requesters, and hospitals across Delhi NCR.

## Features
- Role-based access for donors and requesters
- Real-time notifications for urgent blood requests
- Donor search and matching by blood type, city and availability
- Blood inventory tracking across multiple hospital banks
- Custom JSON-based database engine without any ORM
- Secure authentication with bcrypt and JWT

## Tech Stack
- Backend: Node.js, Express.js, REST APIs
- Auth: bcryptjs, JWT
- Database: Custom JSON persistence layer

## Demo Credentials
| Email | Password | Role |
|-------|----------|------|
| demo@bloodpoint.in | demo123 | Donor |
| arjun.sharma@gmail.com | test1234 | Donor |
| dr.tiwari@apollo.com | test1234 | Requester |

## Setup
npm install
node index.js

## How to Run Locally

1. Clone the repo
   git clone https://github.com/nishant-rgb0/bloodpoint.git

2. Install dependencies
   npm install

3. Start the server
   node server.js

4. Open in browser
   http://localhost:3000
