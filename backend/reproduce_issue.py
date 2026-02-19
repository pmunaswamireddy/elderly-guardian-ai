import requests

url = "http://127.0.0.1:8007/ocr/prescription"
files = {'file': open('test_image.png', 'rb')}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, files=files)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    print(response.text)
except Exception as e:
    print(f"Request failed: {e}")
