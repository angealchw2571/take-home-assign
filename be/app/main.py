import os
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
import uuid
from datetime import datetime, timedelta
import tempfile
import asyncio
import json
from typing import List, Dict, Literal, Any, Union
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

origins = [
    os.getenv("FRONTEND_URL")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client_generators = {}

# Event types
EventType = Literal["statement", "info", "error", "complete"]

def create_response(event_type: EventType, payload: Union[str, Dict[str, Any]]) -> Dict[str, str]:
    """
    Create a standardized event response.
    
    Args:
        event_type: Type of event (statement, info, error, complete)
        payload: Either a string or a dictionary with the event data
    """
    # Convert string to dictionary
    if isinstance(payload, str):
        if event_type == "statement":
            data = {"sql": payload}
        elif event_type == "info" or event_type == "complete":
            data = {"message": payload}
        elif event_type == "error":
            data = {"error": payload}
    else:
        data = payload
        
    return {
        "event": event_type,
        "data": json.dumps(data)
    }


@app.get("/")
def read_root():
    return {"Hello": "this is working"}


async def process_file(file_path: str, original_filename: str):
    """
    Process a meter reading file and yield SQL statements and events.
    
    Args:
        file_path: Path to the temporary file
        original_filename: Name of the original file
    
    Yields:
        SQL statements and events
    """
    current_nmi = None  # Current NMI record
    valid_record_types = {"100", "200", "300", "400", "500", "900"}
    interval_date = None
    interval_length = None
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            for line in file:
                row = line.strip().split(',')
                record_type = row[0]

                # skip invalid headers
                if record_type not in valid_record_types:
                    continue

                if record_type == "200":
                    current_nmi = row[1]  # Extract NMI
                    interval_length = int(row[8])  # Extract interval length
                elif record_type == "300" and current_nmi:
                    interval_date = row[1]  # Extract interval date (YYYYMMDD)
                    try:
                        base_timestamp = datetime.strptime(interval_date, "%Y%m%d")
                    except ValueError:
                        continue

                    # Calculate number of values based on interval length
                    intervals_per_day = int(24 * 60 / interval_length)

                    # Extract consumption values based on interval length
                    consumption_values = row[2:(2 + intervals_per_day)]
                    for i, value in enumerate(consumption_values):
                        try:
                            consumption = float(value)
                        except ValueError:
                            continue

                        # Current timestamp from base_timestamp 
                        timestamp = base_timestamp + timedelta(minutes=(int(i) + 1) * interval_length)
                        
                        sqlstatement = f"INSERT INTO meter_readings (id, nmi, timestamp, consumption) VALUES ('{uuid.uuid4()}', '{current_nmi}', '{timestamp.isoformat()}', {consumption});"
                        
                        # Yield the result
                        yield create_response("statement", {"sql": sqlstatement})
                        
                        # delay to not overwhelm client
                        await asyncio.sleep(0.01)
                
    except Exception as e:
        yield create_response("error", f"Error processing file {original_filename}: {str(e)}")
    finally:
        if os.path.exists(file_path):
            os.unlink(file_path)


async def process_multiple_files(file_infos):
    total_files = len(file_infos)
    processed_files = 0
    
    try:
        for file_info in file_infos:
            file_path, original_filename = file_info
            yield create_response("info", f"Processing file {processed_files + 1} of {total_files}: {original_filename}")
            
            async for event in process_file(file_path, original_filename):
                yield event
                
            processed_files += 1
            
        yield create_response("complete", f"Processing complete. Processed {processed_files} files.")
    except Exception as e:
        yield create_response("error", f"Error during processing: {str(e)}")


async def background_processing(client_id: str, file_infos: List[tuple]):
    """
    Start background processing of files and store the generator in client_generators.
    
    Args:
        client_id: The client ID to associate with the generator
        file_infos: List of tuples containing file path and original filename
    """
    client_generators[client_id] = process_multiple_files(file_infos)


@app.post("/upload/{client_id}")
async def handle_upload(
    background_tasks: BackgroundTasks,
    client_id: str,
    files: List[UploadFile] = File(...),
):
    if not files:
        raise HTTPException(
            status_code=400, 
            detail="No files uploaded."
        )
    # store file paths and original names
    file_infos = [] 
    
    try:
        for file in files:
            if not file.filename.endswith(('.csv', '.txt')):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid file type for {file.filename}. Please upload CSV or TXT files only."
                )
            # create temp files and save the original file name
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                contents = await file.read()
                temp_file.write(contents)
                file_infos.append((temp_file.name, file.filename))
            # TODO add antivirus check/scans 
        # Add the processing task to background tasks
        background_tasks.add_task(background_processing, client_id, file_infos)
        
        return {"message": f"File upload successful"}
    except Exception as e:
        # clear the temp diff if something went wrong
        for file_path, _ in file_infos:
            if os.path.exists(file_path):
                os.unlink(file_path)
        raise HTTPException(status_code=500, detail=f"Error for processing: {str(e)}")


@app.get("/stream/{client_id}")
async def stream(client_id: str):
    if client_id not in client_generators:
        return EventSourceResponse([create_response("error", "Client ID not found")])
    
    return EventSourceResponse(client_generators[client_id])