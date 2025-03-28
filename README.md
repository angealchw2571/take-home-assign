# NEM12 Data Processor

A full-stack application for uploading, processing, and analyzing NEM12 data files for energy consumption metering.

## Project Overview

This application allows users to upload NEM12 format files containing energy meter readings, processes the data, and generates SQL statements for database storage. The system provides a modern web interface for file uploads and real-time processing feedback.

## Features

- **File Upload**: Drag-and-drop interface for uploading NEM12 files
- **Real-time Processing**: Stream processing results as they happen
- **SQL Statement Generation**: Convert NEM12 data into database-ready SQL statements

## Tech Stack

### Frontend
- React 19 with TypeScript
- Vite for fast development and building
- TailwindCSS for styling
- React Hook Form for form management
- React Dropzone for file uploads
- Zod for validation

### Backend
- Python with FastAPI
- Server-Sent Events (SSE) for real-time data streaming
- NEM12 file parsing utilities

## Project Structure

```
/take-home
├── fe/                  # Frontend React application
│   ├── src/             # Source code
│   │   ├── components/  # React components
│   │   └── ...
│   └── ...
└── be/                  # Backend Python application
    ├── app/             # FastAPI application
    ├── nem12_process.py # standalone NEM12 file processing logic
    └── ...
```

## Getting Started

### Environment Setup

Before running the application, you need to set up environment variables for both the frontend and backend:

1. **Frontend Environment** (create `.env` file in `fe` directory)
   ```
   VITE_BACKEND_URL=http://localhost:8000
   ```

2. **Backend Environment** (create `.env` file in `be` directory)
   ```
   FRONTEND_URL=http://localhost:5173
   ```

### Running the Application

#### Frontend
```bash
cd fe
npm install
npm run dev
```

#### Backend
```bash
cd be
pip install -r requirements.txt
python run.py
```

## NEM12 Format

The application processes NEM12 format files, which are a standard for energy metering data in Australia's National Electricity Market. [Reference](https://aemo.com.au/-/media/files/electricity/nem/retail_and_metering/market_settlement_and_transfer_solutions/2022/mdff-specification-nem12-nem13-v25.pdf?la=en)

 The format includes:

- Record Type 100: Header (version/date time/participantIDs)
- Record Type 200: NMI Data Details (NMI/stream data ID/meter serial ID/units)
- Record Type 300: Interval Data (interval date/interval reading/interval length)
- Record Type 400: Interval Event (start/end interval/data quality)
- Record Type 500: B2B Details (date time/b2b details)
- Record Type 900: End (end of data)

The system extracts meter readings and timestamps to generate SQL statements for a specific SQL database.
