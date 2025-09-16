# Video Proctoring System

A web-based system that monitors online interviews using computer vision to detect focus and unauthorized items.

## Features

- Real-time face detection and focus monitoring
- Object detection for unauthorized items (phones, books, etc.)
- Event logging with timestamps
- Interview recording
- Detailed proctoring reports

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Modern browser with camera access


## How to Run the Project

1. **Install Node.js and MongoDB** if you haven't already
2. **Clone or create the project structure** as shown above
3. **Install dependencies** by running `npm install` in the project root
4. **Start MongoDB** on your system
5. **Run the application** with `npm start`
6. **Open your browser** and go to `http://localhost:3000`

## Note on Deployment

For a production deployment, you would need to:
1. Set up a cloud MongoDB instance (MongoDB Atlas)
2. Deploy the backend to a service like Heroku, AWS, or DigitalOcean
3. Update the frontend to point to your deployed backend URL
4. Set up proper video storage (AWS S3 or similar)

This implementation provides a solid foundation for a video proctoring system that meets all your requirements. The frontend handles the computer vision processing, while the backend stores events and generates reports.
