import requests
import json
import sys

def test_stream():
    url = "http://localhost:8000/api/research/stream"
    payload = {"topic": "spaceX"}
    headers = {"Content-Type": "application/json"}
    
    print("Sending POST request to:", url)
    try:
        with requests.post(url, json=payload, headers=headers, stream=True) as r:
            print("Status Code:", r.status_code)
            for line in r.iter_lines():
                if line:
                    print(line.decode('utf-8'))
    except Exception as e:
        print("Request failed:", repr(e))

if __name__ == "__main__":
    test_stream()
