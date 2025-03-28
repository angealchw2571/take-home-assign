import uuid
from datetime import datetime, timedelta


def parse_file(file_path):
    current_nmi = None  # Stores the current NMI record
    valid_record_types = {"100", "200", "300", "400", "500", "900"}
    interval_date = None
    interval_length = None

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

                # extract consumption values based on interval length
                consumption_values = row[2:(2 + intervals_per_day)]
                for i, value in enumerate(consumption_values):
                    try:
                        consumption = float(value)
                    except ValueError:
                        continue

                    # Current timestamp from base_timestamp 
                    timestamp = base_timestamp + timedelta(minutes=(int(i) + 1) * interval_length)
                    # print(timestamp)
                    sqlstatement = f"INSERT INTO meter_readings (id, nmi, timestamp, consumption) VALUES ('{uuid.uuid4()}', '{current_nmi}', '{timestamp.isoformat()}', {consumption});"
                    
                    yield sqlstatement


if __name__ == "__main__":
    file_path = "nem12_sample.csv"  # Path to the test file
    
    try:
        statementcount = 0
        
        for statement in parse_file(file_path):
            print(statement)
            statementcount += 1
        
        print(f"\nTotal SQL statements generated: {statementcount}")
    except Exception as e:
        print(f"Error processing file: {str(e)}")