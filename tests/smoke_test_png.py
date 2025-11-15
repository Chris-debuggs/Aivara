import requests, time, json, os
from PIL import Image, ImageDraw, ImageFont
base = 'http://127.0.0.1:8000'
# Unique test user
ts = int(time.time())
email = f'smoke_user_png_{ts}@example.com'
password = 'Sm0keTest!'
full_name = 'Smoke PNG Tester'
print('Registering', email)
resp = requests.post(f'{base}/auth/register', json={'email': email, 'password': password, 'full_name': full_name}, timeout=10)
print('Register:', resp.status_code, resp.text)
print('\nLogging in')
resp = requests.post(f'{base}/auth/token', data={'username': email, 'password': password}, timeout=10)
print('Login:', resp.status_code, resp.text)
if resp.status_code != 200:
    raise SystemExit('Login failed')

token = resp.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}

# Create a small PNG image
sample_path = 'smoke_sample.png'
img = Image.new('RGB', (200, 60), color=(73, 109, 137))
d = ImageDraw.Draw(img)
d.text((10,20), "Smoke Test", fill=(255,255,0))
img.save(sample_path)

print('\nUploading PNG file...')
with open(sample_path, 'rb') as f:
    files = {'file': ('smoke_sample.png', f, 'image/png')}
    data = {'report_name': 'Smoke Test PNG Report'}
    up = requests.post(f'{base}/reports/upload', headers=headers, files=files, data=data, timeout=30)
print('Upload status', up.status_code)
try:
    print('Upload response:', json.dumps(up.json(), indent=2))
except Exception:
    print('Upload response raw:', up.text)

print('\nFetching reports (after upload)')
r2 = requests.get(f'{base}/reports/', headers=headers, timeout=10)
print('GET /reports status', r2.status_code)
try:
    reports = r2.json()
    print('Total reports:', len(reports))
    if reports:
        latest = reports[0]
        rid = latest.get('id')
        print('Latest report id:', rid)
        rd = requests.get(f'{base}/reports/{rid}', headers=headers, params={'include_extracted_text': 'true'}, timeout=10)
        print('GET /reports/{id} status', rd.status_code)
        try:
            print('Report detail:', json.dumps(rd.json(), indent=2))
        except Exception:
            print('Report detail raw:', rd.text)
except Exception as e:
    print('GET /reports after upload failed:', e)

# Cleanup
try:
    os.remove(sample_path)
except:
    pass

print('\nSmoke test (PNG) completed')
