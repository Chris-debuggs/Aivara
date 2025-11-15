import requests, time, json, os
base = 'http://127.0.0.1:8000'
ts = int(time.time())
email = f'smoke_user_{ts}@example.com'
password = 'Sm0keTest!'
full_name = 'Smoke Tester'
print('Registering', email)
try:
    resp = requests.post(f'{base}/auth/register', json={'email': email, 'password': password, 'full_name': full_name}, timeout=10)
    print('Register status:', resp.status_code)
    print('Register response:', resp.text)
except Exception as e:
    print('Register request failed:', e)
    raise

print('\nLogging in')
try:
    resp = requests.post(f'{base}/auth/token', data={'username': email, 'password': password}, timeout=10)
    print('Login status:', resp.status_code)
    print('Login response:', resp.text)
except Exception as e:
    print('Login request failed:', e)
    raise

if resp.status_code != 200:
    raise SystemExit('Login failed')

token = resp.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}

print('\nFetching reports (before upload)')
try:
    r = requests.get(f'{base}/reports/', headers=headers, timeout=10)
    print('GET /reports status', r.status_code)
    try:
        print('Reports (before):', json.dumps(r.json(), indent=2))
    except Exception:
        print('Reports (before) raw:', r.text)
except Exception as e:
    print('GET /reports failed:', e)

# Create sample file
sample_path = 'smoke_sample.txt'
with open(sample_path, 'w') as f:
    f.write('This is a smoke test sample file for upload.\n')

print('\nUploading sample file...')
try:
    with open(sample_path, 'rb') as f:
        files = {'file': ('smoke_sample.txt', f, 'text/plain')}
        data = {'report_name': 'Smoke Test Report'}
        up = requests.post(f'{base}/reports/upload', headers=headers, files=files, data=data, timeout=30)
    print('Upload status', up.status_code)
    try:
        print('Upload response:', json.dumps(up.json(), indent=2))
    except Exception:
        print('Upload response raw:', up.text)
except Exception as e:
    print('Upload failed:', e)

print('\nFetching reports (after upload)')
try:
    r2 = requests.get(f'{base}/reports/', headers=headers, timeout=10)
    print('GET /reports status', r2.status_code)
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

print('\nSmoke test completed')
