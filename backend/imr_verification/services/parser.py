from bs4 import BeautifulSoup

def clean_val(val, default='—'):
    if val is None:
        return default
    s = str(val).strip()
    return s if s and s.lower() != 'null' and s.lower() != 'none' else default

def parse_nmc_response(response_data, reg_no='', start_index=1):
    """
    Parses either JSON or HTML response returned from NMC.
    Normalizes every doctor record to match the fields shown in Images 2, 3 & 4.
    """
    doctors = []
    
    # 1. If response is a dict/JSON
    if isinstance(response_data, dict):
        raw_list = response_data.get('data') or response_data.get('doctors') or []
        if isinstance(raw_list, list):
            for idx, item in enumerate(raw_list, start=start_index):
                # Clean DOB (e.g. "1965-06-06 00:00:00" -> "06-06-1965" or "1965-06-06")
                dob_raw = clean_val(item.get('dob') or item.get('date_of_birth'))
                if dob_raw and ' ' in dob_raw:
                    dob_raw = dob_raw.split(' ')[0]

                # Additional qualifications array extraction
                add_quals = item.get('additional_qualifications') or []
                def get_add_qual(slot):
                    if isinstance(add_quals, list) and len(add_quals) > slot:
                        q = add_quals[slot]
                        if isinstance(q, dict):
                            return {
                                'qualification': clean_val(q.get('qualification') or q.get('addQual')),
                                'qualification_year': clean_val(q.get('year') or q.get('qualification_year') or q.get('addQualYear')),
                                'university_name': clean_val(q.get('university') or q.get('university_name') or q.get('addQualUniv'))
                            }
                    # Check flat properties fallback
                    q_num = slot + 1
                    return {
                        'qualification': clean_val(item.get(f'addQual{q_num}')),
                        'qualification_year': clean_val(item.get(f'addQualYear{q_num}')),
                        'university_name': clean_val(item.get(f'addQualUniv{q_num}'))
                    }

                doc = {
                    'sl_no': idx,
                    'doctor_id': clean_val(item.get('id') or item.get('doctorId') or idx),
                    'year_of_info': clean_val(item.get('year_of_info') or item.get('yearOfInfo')),
                    'registration_no': clean_val(item.get('registration_no') or item.get('regNum') or reg_no),
                    'state_medical_council': clean_val(item.get('state_medical_council') or item.get('smcName') or item.get('council')),
                    'name': clean_val(item.get('name') or item.get('doctorName')),
                    'father_name': clean_val(item.get('father_name') or item.get('fatherName')),
                    'dob': dob_raw,
                    'date_of_reg': clean_val(item.get('registration_date') or item.get('regDate') or item.get('date_of_reg')),
                    'uprn_no': clean_val(item.get('uprn_no') or item.get('uprnNo'), 'N/A'),
                    'qualification': clean_val(item.get('qualification') or item.get('degree'), 'MBBS'),
                    'qualification_year': clean_val(item.get('qualification_year') or item.get('qualificationYear') or item.get('grad_year')),
                    'university_name': clean_val(item.get('university') or item.get('university_name') or item.get('college')),
                    'permanent_address': clean_val(item.get('permanent_address') or item.get('address')),
                    'additional_qualification_1': get_add_qual(0),
                    'additional_qualification_2': get_add_qual(1),
                    'additional_qualification_3': get_add_qual(2)
                }
                doctors.append(doc)
            return doctors

    # 2. If response is HTML string
    if isinstance(response_data, str) and '<table' in response_data.lower():
        soup = BeautifulSoup(response_data, 'html.parser')
        rows = soup.find_all('tr')
        idx = 1
        for row in rows:
            cols = [td.get_text(strip=True) for td in row.find_all(['td', 'th'])]
            if len(cols) >= 5 and cols[0].isdigit():
                view_btn = row.find('button') or row.find('a')
                doc_id = view_btn.get('data-id') if view_btn and view_btn.get('data-id') else str(idx)
                doctors.append({
                    'sl_no': idx,
                    'doctor_id': doc_id,
                    'year_of_info': clean_val(cols[1] if len(cols) > 1 else ''),
                    'registration_no': clean_val(cols[2] if len(cols) > 2 else reg_no),
                    'state_medical_council': clean_val(cols[3] if len(cols) > 3 else ''),
                    'name': clean_val(cols[4] if len(cols) > 4 else ''),
                    'father_name': clean_val(cols[5] if len(cols) > 5 else ''),
                    'dob': '—',
                    'date_of_reg': '—',
                    'uprn_no': 'N/A',
                    'qualification': 'MBBS',
                    'qualification_year': clean_val(cols[1] if len(cols) > 1 else '—'),
                    'university_name': '—',
                    'permanent_address': '—',
                    'additional_qualification_1': {'qualification': '—', 'qualification_year': '—', 'university_name': '—'},
                    'additional_qualification_2': {'qualification': '—', 'qualification_year': '—', 'university_name': '—'},
                    'additional_qualification_3': {'qualification': '—', 'qualification_year': '—', 'university_name': '—'}
                })
                idx += 1

    return doctors
