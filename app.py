from __future__ import annotations
import json, os, sqlite3
from email.utils import parseaddr
from html import escape as html_escape
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Literal
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, FiniteFloat

BASE_DIR = Path(__file__).resolve().parent
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    pass
DB_PATH = Path(os.getenv('AURORA_DB_PATH', str(BASE_DIR / 'salary_test.sqlite3')))
DEMO_RESET_ENABLED = os.getenv('AURORA_DEMO_RESET', '0') == '1'
EMAIL_PROVIDER = os.getenv('AURORA_EMAIL_PROVIDER', 'disabled').strip().lower()
EMAIL_API_KEY = os.getenv('AURORA_EMAIL_API_KEY', '').strip()
EMAIL_FROM = os.getenv('AURORA_EMAIL_FROM', '').strip()
EMAIL_STAFF_MAP = os.getenv('AURORA_STAFF_EMAILS_JSON', '{}').strip()

def db():
    c = sqlite3.connect(str(DB_PATH), timeout=10)
    c.row_factory = sqlite3.Row
    c.execute('PRAGMA foreign_keys=ON')
    return c

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS salary_submissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id INTEGER NOT NULL,
          period_from TEXT NOT NULL, period_to TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'submitted', base_salary NUMERIC NOT NULL DEFAULT 0,
          allowance NUMERIC NOT NULL DEFAULT 0, bonus NUMERIC NOT NULL DEFAULT 0,
          deduction NUMERIC NOT NULL DEFAULT 0, total NUMERIC NOT NULL DEFAULT 0,
          details_json TEXT NOT NULL DEFAULT '{}', submitted_at TEXT NOT NULL, paid_at TEXT,
          UNIQUE(staff_id, period_from, period_to));
        CREATE INDEX IF NOT EXISTS idx_salary_submissions_period ON salary_submissions(period_from,period_to);
        CREATE TABLE IF NOT EXISTS payment_vouchers (
          id INTEGER PRIMARY KEY AUTOINCREMENT, voucher_no TEXT NOT NULL UNIQUE,
          submission_id INTEGER, staff_id INTEGER, amount NUMERIC NOT NULL,
          payment_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', description TEXT,
          metadata_json TEXT NOT NULL DEFAULT '{}', paid_at TEXT, created_at TEXT NOT NULL,
          FOREIGN KEY(submission_id) REFERENCES salary_submissions(id));
        CREATE TABLE IF NOT EXISTS expense_vouchers (
          id INTEGER PRIMARY KEY AUTOINCREMENT, voucher_no TEXT NOT NULL UNIQUE,
          category TEXT NOT NULL, amount NUMERIC NOT NULL, expense_date TEXT NOT NULL,
          payee TEXT, description TEXT, status TEXT NOT NULL DEFAULT 'draft',
          metadata_json TEXT NOT NULL DEFAULT '{}', paid_at TEXT, created_at TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS idx_payment_vouchers_date ON payment_vouchers(payment_date);
        CREATE INDEX IF NOT EXISTS idx_expense_vouchers_date ON expense_vouchers(expense_date);
        ''')
        # Add new payment-method fields to databases created by an earlier version.
        for table, column, definition in (
            ('payment_vouchers', 'payment_method', "TEXT NOT NULL DEFAULT 'cash'"),
            ('expense_vouchers', 'payment_method', "TEXT NOT NULL DEFAULT 'cash'"),
            ('salary_submissions', 'email_status', "TEXT NOT NULL DEFAULT 'not_sent'"),
            ('salary_submissions', 'email_sent_at', "TEXT"),
            ('salary_submissions', 'email_provider_id', "TEXT"),
            ('salary_submissions', 'email_error', "TEXT"),
            ('staff', 'email', "TEXT"),
            ('demo_staff', 'email', "TEXT"),
        ):
            try:
                exists = c.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone()
                if exists is None:
                    continue
                columns = {row['name'] for row in c.execute(f'PRAGMA table_info({table})').fetchall()}
            except sqlite3.OperationalError:
                continue
            if column not in columns:
                c.execute(f'ALTER TABLE {table} ADD COLUMN {column} {definition}')

def now_iso(): return datetime.now(timezone.utc).replace(microsecond=0).isoformat()
def parse_date(v, field):
    try: return date.fromisoformat(v).isoformat()
    except (ValueError, TypeError) as e: raise HTTPException(422, f'{field} must be YYYY-MM-DD') from e
def row_dict(row):
    if row is None: return None
    out = dict(row)
    for key in ('details_json','metadata_json'):
        if key in out:
            try: out[key[:-5]] = json.loads(out.pop(key) or '{}')
            except json.JSONDecodeError: out[key[:-5]] = {}
    return out

def staff_row(c: sqlite3.Connection, staff_id: int):
    """Look up an active staff member from either the real or demo table."""
    for query in (
        'SELECT id,full_name,role,email FROM staff WHERE id=?',
        'SELECT id,full_name,role,email FROM demo_staff WHERE id=? AND active=1',
    ):
        try:
            row = c.execute(query, (staff_id,)).fetchone()
        except sqlite3.OperationalError:
            # A fresh demo database may not have either staff table yet.
            row = None
        if row is not None:
            return row
    return None

def money_value(value: Any, field: str) -> Decimal:
    """Convert a request/DB amount to a finite, two-decimal money value."""
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError) as e:
        raise HTTPException(422, f'{field} must be a valid amount') from e
    if not amount.is_finite():
        raise HTTPException(422, f'{field} must be a finite amount')
    try:
        quantized = amount.quantize(Decimal('0.01'))
    except InvalidOperation as e:
        raise HTTPException(422, f'{field} must be a valid amount') from e
    if amount != quantized:
        raise HTTPException(422, f'{field} must have at most two decimal places')
    return quantized

def staff_email(c: sqlite3.Connection, staff_id: int, staff: sqlite3.Row | None = None) -> str | None:
    """Resolve a recipient without exposing provider credentials to the browser."""
    row = staff or staff_row(c, staff_id)
    direct = (row['email'] or '').strip() if row is not None and 'email' in row.keys() else ''
    if direct:
        return direct
    try:
        mapping = json.loads(EMAIL_STAFF_MAP or '{}')
        mapped = mapping.get(str(staff_id)) or mapping.get(staff_id)
        return str(mapped).strip() if mapped else None
    except (TypeError, json.JSONDecodeError):
        return None

def validate_email_address(value: str | None) -> str:
    address = (value or '').strip()
    _, parsed = parseaddr(address)
    if not parsed or '@' not in parsed or parsed.startswith('@') or parsed.endswith('@'):
        raise HTTPException(422, 'staff email is missing or invalid')
    return parsed

def format_money(value: Any) -> str:
    try:
        return f"{float(value or 0):,.0f} đ".replace(',', '.')
    except (TypeError, ValueError):
        return '0 đ'

def salary_email_html(staff_name: str, submission: sqlite3.Row, details: dict[str, Any]) -> str:
    classes = details.get('classes') if isinstance(details, dict) else []
    rows = ''.join(
        f'<tr><td>{html_escape(str(item.get("description", "Ca học")))}</td>'
        f'<td>{float(item.get("shifts", 0) or 0):g}</td>'
        f'<td>{float(item.get("hours", 0) or 0):g}</td>'
        f'<td>{format_money(item.get("amount", 0))}</td></tr>'
        for item in classes if isinstance(item, dict)
    )
    if not rows:
        rows = '<tr><td colspan="4">Không có chi tiết ca học</td></tr>'
    return f'''<!doctype html><html lang="vi"><body style="font-family:Arial,sans-serif;color:#172033">
      <h2>Bảng lương Aurora English Center</h2>
      <p>Xin chào {html_escape(staff_name)},</p>
      <p>Bảng lương kỳ <strong>{html_escape(submission['period_from'])} - {html_escape(submission['period_to'])}</strong>:</p>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse">
        <thead><tr><th>Ca học</th><th>Số ca</th><th>Giờ</th><th>Thành tiền</th></tr></thead>
        <tbody>{rows}</tbody>
      </table>
      <p>Lương cơ bản: <strong>{format_money(submission['base_salary'])}</strong><br>
      Trợ cấp: <strong>{format_money(submission['allowance'])}</strong><br>
      Thưởng: <strong>{format_money(submission['bonus'])}</strong><br>
      Giảm trừ: <strong>{format_money(submission['deduction'])}</strong><br>
      <strong>Thực nhận: {format_money(submission['total'])}</strong></p>
      <p>Đây là email được gửi từ hệ thống Aurora.</p>
    </body></html>'''

def send_salary_email(to_email: str, subject: str, html: str) -> str:
    """Send through Resend or SendGrid; credentials stay server-side in .env."""
    if EMAIL_PROVIDER not in {'resend', 'sendgrid'}:
        raise HTTPException(503, 'Email chưa được cấu hình. Hãy chọn Resend hoặc SendGrid trong file .env.')
    if not EMAIL_API_KEY or not EMAIL_FROM:
        raise HTTPException(503, 'Thiếu AURORA_EMAIL_API_KEY hoặc AURORA_EMAIL_FROM trong file .env.')
    if EMAIL_PROVIDER == 'resend':
        endpoint = os.getenv('AURORA_EMAIL_API_URL', 'https://api.resend.com/emails')
        payload = {'from': EMAIL_FROM, 'to': [to_email], 'subject': subject, 'html': html}
    else:
        endpoint = os.getenv('AURORA_EMAIL_API_URL', 'https://api.sendgrid.com/v3/mail/send')
        payload = {'personalizations': [{'to': [{'email': to_email}]}], 'from': {'email': EMAIL_FROM}, 'subject': subject, 'content': [{'type': 'text/html', 'value': html}]}
    request = Request(endpoint, data=json.dumps(payload, ensure_ascii=False).encode('utf-8'), headers={'Authorization': f'Bearer {EMAIL_API_KEY}', 'Content-Type': 'application/json'}, method='POST')
    try:
        with urlopen(request, timeout=15) as response:
            response_body = response.read().decode('utf-8', errors='replace')
            try:
                parsed = json.loads(response_body) if response_body else {}
            except json.JSONDecodeError:
                parsed = {}
            return str(parsed.get('id') or parsed.get('message_id') or response.headers.get('X-Message-Id') or 'accepted')
    except HTTPError as error:
        detail = error.read().decode('utf-8', errors='replace')[:300]
        raise HTTPException(502, f'Nhà cung cấp email từ chối gửi: {detail or error.reason}') from error
    except URLError as error:
        raise HTTPException(502, f'Không kết nối được nhà cung cấp email: {error.reason}') from error

class SalaryLine(BaseModel):
    class_date: str | None = None
    description: str = ''
    shifts: float = 0
    hours: float = 0
    rate: float = 0
    amount: float | None = None
class SalarySubmissionIn(BaseModel):
    staff_id: int
    period_from: str
    period_to: str
    base_salary: FiniteFloat = Field(0, ge=0)
    allowance: FiniteFloat = Field(0, ge=0)
    bonus: FiniteFloat = Field(0, ge=0)
    deduction: FiniteFloat = Field(0, ge=0)
    penalty: FiniteFloat | None = Field(None, ge=0)
    total: FiniteFloat | None = Field(None, ge=0)
    classes: list[SalaryLine] = Field(default_factory=list)
    details: dict[str, Any] = Field(default_factory=dict)
class PaymentVoucherIn(BaseModel):
    voucher_no: str | None = None
    submission_id: int | None = None
    staff_id: int | None = None
    amount: FiniteFloat = Field(..., gt=0)
    payment_date: str
    payment_method: Literal['cash', 'bank_transfer'] = 'cash'
    status: Literal['draft', 'paid'] = 'draft'
    description: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
class ExpenseVoucherIn(BaseModel):
    voucher_no: str | None = None
    category: str
    amount: FiniteFloat = Field(..., gt=0)
    expense_date: str
    payment_method: Literal['cash', 'bank_transfer'] = 'cash'
    payee: str | None = None
    description: str | None = None
    status: Literal['draft', 'paid'] = 'draft'
    metadata: dict[str, Any] = Field(default_factory=dict)

app = FastAPI(title='Aurora Attendance & Payroll', docs_url=None, redoc_url=None, openapi_url=None)
app.mount('/static', StaticFiles(directory=str(BASE_DIR / 'static')), name='static')
@app.on_event('startup')
def startup(): init_db()
init_db()
@app.get('/')
def home(): return FileResponse(str(BASE_DIR / 'index.html'))
@app.get('/api/health')
def health():
    # Keep the probe useful without exposing the server's filesystem layout.
    try:
        with db() as c:
            c.execute('SELECT 1').fetchone()
    except sqlite3.Error as e:
        raise HTTPException(503, 'database unavailable') from e
    return {'ok': True}
@app.post('/api/demo/reset', include_in_schema=False)
def reset_demo_data():
    """Clear workflow records so the local demo can be replayed from F5."""
    if not DEMO_RESET_ENABLED:
        raise HTTPException(404, 'demo reset is disabled')
    with db() as c:
        c.execute('DELETE FROM expense_vouchers')
        c.execute('DELETE FROM payment_vouchers')
        c.execute('DELETE FROM salary_submissions')
    return {'ok': True, 'reset': ['salary_submissions', 'payment_vouchers', 'expense_vouchers']}
@app.get('/api/staff')
def list_staff():
    with db() as c:
        rows = c.execute('SELECT id,full_name,role,email FROM staff ORDER BY id').fetchall()
        if not rows:
            rows = c.execute('SELECT id,full_name,role,email,base_salary,hourly_rate FROM demo_staff WHERE active=1 ORDER BY id').fetchall()
        try:
            salary_types = {row['name']: float(row['amount'] or 0) for row in c.execute('SELECT name,amount FROM salary_types').fetchall()}
        except sqlite3.OperationalError:
            salary_types = {}
    default_base = {
        'teacher': salary_types.get('Lương cơ bản GV chính thức', 0),
        'staff': salary_types.get('Lương nhân viên hành chính', 0),
        'manager': salary_types.get('Phụ cấp quản lý', 0),
    }
    default_rate = {
        'teacher': salary_types.get('Phụ cấp dạy thêm theo ca', 0),
        'staff': salary_types.get('Lương gia sư theo giờ', 0),
        'manager': salary_types.get('Phụ cấp dạy thêm theo ca', 0),
    }
    return [
        {
            **dict(row),
            'base_salary': float((row['base_salary'] if 'base_salary' in row.keys() else 0) or default_base.get(row['role'], 0)),
            'hourly_rate': float((row['hourly_rate'] if 'hourly_rate' in row.keys() else 0) or default_rate.get(row['role'], 0)),
        }
        for row in rows
    ]
@app.get('/api/attendance')
def attendance(from_date: str = Query(..., alias='from'), to_date: str = Query(..., alias='to')):
    start,end=parse_date(from_date,'from'),parse_date(to_date,'to')
    if start>end: raise HTTPException(422,'from must be before to')
    with db() as c:
        # A staff member can have several shifts on the same day while the
        # attendance table stores a check-in/out interval for that day.  Match
        # an interval to a shift only when their time ranges overlap, then
        # clamp the duration to the shift window.  The correlated lookup also
        # keeps one API row per scheduled shift if bad data contains duplicate
        # attendance records for a day.
        rows=c.execute('''SELECT s.id AS shift_id,s.staff_id,COALESCE(st.full_name,ds.full_name) AS staff_name,
          s.shift_date,s.shift_code,s.start_time,s.end_time,
          a.id AS attendance_id,a.status,a.checkin_at,a.checkout_at,
          CASE WHEN a.checkout_at IS NULL OR a.checkin_at IS NULL THEN 0
            ELSE ROUND(CASE WHEN (
                SELECT COUNT(*) FROM staff_shifts s2
                WHERE s2.staff_id=s.staff_id AND s2.shift_date=s.shift_date
              )=1 AND (
                datetime(a.checkout_at)<=datetime(s.shift_date||' '||s.start_time)
                OR datetime(a.checkin_at)>=datetime(s.shift_date||' '||s.end_time)
              ) THEN (julianday(a.checkout_at)-julianday(a.checkin_at))*24
              ELSE MAX(0,(julianday(MIN(datetime(a.checkout_at),datetime(s.shift_date||' '||s.end_time)))
                -julianday(MAX(datetime(a.checkin_at),datetime(s.shift_date||' '||s.start_time))))*24)
            END,2)
          END AS hours
          FROM staff_shifts s LEFT JOIN staff st ON st.id=s.staff_id
          LEFT JOIN demo_staff ds ON ds.id=s.staff_id
          LEFT JOIN staff_attendance a ON a.id=(
            SELECT a2.id FROM staff_attendance a2
            WHERE a2.staff_id=s.staff_id AND a2.attendance_date=s.shift_date
              AND ((a2.checkout_at IS NULL
                    AND datetime(a2.checkin_at)>=datetime(s.shift_date||' '||s.start_time)
                    AND datetime(a2.checkin_at)<datetime(s.shift_date||' '||s.end_time))
                OR (a2.checkout_at IS NOT NULL
                    AND datetime(a2.checkin_at)<datetime(s.shift_date||' '||s.end_time)
                    AND datetime(a2.checkout_at)>datetime(s.shift_date||' '||s.start_time))
                OR (a2.checkout_at IS NOT NULL AND (
                    SELECT COUNT(*) FROM staff_shifts s2
                    WHERE s2.staff_id=s.staff_id AND s2.shift_date=s.shift_date
                  )=1))
            ORDER BY a2.id DESC LIMIT 1)
          WHERE s.shift_date BETWEEN ? AND ? ORDER BY s.shift_date,s.staff_id,s.id''',(start,end)).fetchall()
    return {'from':start,'to':end,'staff':list_staff(),'rows':[dict(r) for r in rows]}
@app.get('/api/payroll/submissions')
def list_submissions(period_from: str|None=None,period_to: str|None=None,staff_id: int|None=None):
    clauses=[]; vals=[]
    if period_from: clauses.append('period_from=?'); vals.append(parse_date(period_from,'period_from'))
    if period_to: clauses.append('period_to=?'); vals.append(parse_date(period_to,'period_to'))
    if staff_id is not None: clauses.append('staff_id=?'); vals.append(staff_id)
    where=' WHERE '+' AND '.join(clauses) if clauses else ''
    with db() as c: rows=c.execute('SELECT * FROM salary_submissions'+where+' ORDER BY period_from DESC,staff_id',vals).fetchall()
    return [row_dict(r) for r in rows]
@app.get('/api/payroll/{staff_id}')
def payroll(staff_id:int,period_from:str=Query(...,alias='from'),period_to:str=Query(...,alias='to')):
    start,end=parse_date(period_from,'from'),parse_date(period_to,'to')
    with db() as c:
        staff=staff_row(c, staff_id)
        if staff is None: raise HTTPException(404,'staff not found')
        classes=c.execute('''SELECT s.shift_date AS class_date,s.shift_code AS description,
          CASE WHEN a.checkout_at IS NULL OR a.checkin_at IS NULL THEN 0
            ELSE ROUND(CASE WHEN (
                SELECT COUNT(*) FROM staff_shifts s2
                WHERE s2.staff_id=s.staff_id AND s2.shift_date=s.shift_date
              )=1 AND (
                datetime(a.checkout_at)<=datetime(s.shift_date||' '||s.start_time)
                OR datetime(a.checkin_at)>=datetime(s.shift_date||' '||s.end_time)
              ) THEN (julianday(a.checkout_at)-julianday(a.checkin_at))*24
              ELSE MAX(0,(julianday(MIN(datetime(a.checkout_at),datetime(s.shift_date||' '||s.end_time)))
                -julianday(MAX(datetime(a.checkin_at),datetime(s.shift_date||' '||s.start_time))))*24)
            END,2)
          END AS hours,0 AS rate,0 AS amount
          FROM staff_shifts s LEFT JOIN staff_attendance a ON a.id=(
            SELECT a2.id FROM staff_attendance a2
            WHERE a2.staff_id=s.staff_id AND a2.attendance_date=s.shift_date
              AND ((a2.checkout_at IS NULL
                    AND datetime(a2.checkin_at)>=datetime(s.shift_date||' '||s.start_time)
                    AND datetime(a2.checkin_at)<datetime(s.shift_date||' '||s.end_time))
                OR (a2.checkout_at IS NOT NULL
                    AND datetime(a2.checkin_at)<datetime(s.shift_date||' '||s.end_time)
                    AND datetime(a2.checkout_at)>datetime(s.shift_date||' '||s.start_time))
                OR (a2.checkout_at IS NOT NULL AND (
                    SELECT COUNT(*) FROM staff_shifts s2
                    WHERE s2.staff_id=s.staff_id AND s2.shift_date=s.shift_date
                  )=1))
            ORDER BY a2.id DESC LIMIT 1)
          WHERE s.staff_id=? AND s.shift_date BETWEEN ? AND ? ORDER BY s.shift_date,s.id''',(staff_id,start,end)).fetchall()
        sub=c.execute('SELECT * FROM salary_submissions WHERE staff_id=? AND period_from=? AND period_to=?',(staff_id,start,end)).fetchone()
    staff_payload = next((item for item in list_staff() if int(item['id']) == int(staff_id)), dict(staff))
    default_rate = float(staff_payload.get('hourly_rate') or 0)
    class_payload = []
    for row in classes:
        item = dict(row)
        item['rate'] = default_rate
        item['amount'] = round(default_rate * float(item['hours'] or 0), 2)
        class_payload.append(item)
    out={'staff':staff_payload,'period_from':start,'period_to':end,'classes':class_payload}
    if sub: out.update(row_dict(sub) or {})
    return out
@app.post('/api/payroll/submit',status_code=201)
def submit_salary(p: SalarySubmissionIn):
    start,end=parse_date(p.period_from,'period_from'),parse_date(p.period_to,'period_to')
    if start>end: raise HTTPException(422,'period_from must be before period_to')
    deduction=p.penalty if p.penalty is not None else p.deduction
    calculated_total = (
        money_value(p.base_salary, 'base_salary')
        + money_value(p.allowance, 'allowance')
        + money_value(p.bonus, 'bonus')
        - money_value(deduction, 'deduction')
    )
    if p.total is not None and money_value(p.total, 'total') != calculated_total:
        raise HTTPException(422, 'total must equal base_salary + allowance + bonus - deduction')
    if calculated_total < 0:
        raise HTTPException(422, 'total must be greater than or equal to zero')
    total=float(money_value(p.total, 'total') if p.total is not None else calculated_total)
    details={**p.details,'classes':[x.model_dump() for x in p.classes]}
    with db() as c:
        if staff_row(c, p.staff_id) is None:
            raise HTTPException(404, 'staff not found')
        c.execute('''INSERT INTO salary_submissions(staff_id,period_from,period_to,status,base_salary,allowance,bonus,deduction,total,details_json,submitted_at)
          VALUES(?,?,?,'submitted',?,?,?,?,?,?,?) ON CONFLICT(staff_id,period_from,period_to) DO UPDATE SET status='submitted',base_salary=excluded.base_salary,allowance=excluded.allowance,bonus=excluded.bonus,deduction=excluded.deduction,total=excluded.total,details_json=excluded.details_json,submitted_at=excluded.submitted_at''',(p.staff_id,start,end,p.base_salary,p.allowance,p.bonus,deduction,total,json.dumps(details,ensure_ascii=False),now_iso()))
        sid=c.execute('SELECT id FROM salary_submissions WHERE staff_id=? AND period_from=? AND period_to=?',(p.staff_id,start,end)).fetchone()[0]
        return row_dict(c.execute('SELECT * FROM salary_submissions WHERE id=?',(sid,)).fetchone())

@app.get('/api/payroll')
def payroll_list(period_from: str = Query(..., alias='from'), period_to: str = Query(..., alias='to')):
    """Return all staff payroll submissions for a period, including draft staff."""
    start, end = parse_date(period_from, 'from'), parse_date(period_to, 'to')
    with db() as c:
        rows = c.execute('SELECT * FROM salary_submissions WHERE period_from=? AND period_to=? ORDER BY staff_id', (start, end)).fetchall()
    return [row_dict(r) for r in rows]

@app.post('/api/payroll/{staff_id}/submit', status_code=201, include_in_schema=False)
def submit_salary_for_staff(staff_id: int, p: SalarySubmissionIn):
    """Path-parameter variant convenient for the payroll drawer UI."""
    if p.staff_id != staff_id:
        raise HTTPException(422, 'staff_id does not match path parameter')
    return submit_salary(p)

@app.post('/api/payroll/{submission_id}/email', include_in_schema=False)
def email_salary(submission_id: int):
    with db() as c:
        submission = c.execute('SELECT * FROM salary_submissions WHERE id=?', (submission_id,)).fetchone()
        if submission is None:
            raise HTTPException(404, 'salary submission not found')
        if submission['status'] not in {'submitted', 'paid'}:
            raise HTTPException(409, 'salary must be submitted before sending email')
        if submission['email_status'] == 'sent' and submission['email_provider_id']:
            return {'ok': True, 'status': 'sent', 'provider_id': submission['email_provider_id'], 'message': 'Bảng lương đã được gửi trước đó.'}
        staff = staff_row(c, submission['staff_id'])
        if staff is None:
            raise HTTPException(422, 'salary submission references an unknown staff member')
        recipient = validate_email_address(staff_email(c, submission['staff_id'], staff))
        details = row_dict(submission) or {}
        provider_id = send_salary_email(
            recipient,
            f"Bảng lương Aurora - {submission['period_from']} đến {submission['period_to']}",
            salary_email_html(staff['full_name'], submission, details.get('details') or {}),
        )
        sent_at = now_iso()
        c.execute("UPDATE salary_submissions SET email_status='sent',email_sent_at=?,email_provider_id=?,email_error=NULL WHERE id=?", (sent_at, provider_id, submission_id))
    return {'ok': True, 'status': 'sent', 'provider_id': provider_id, 'sent_at': sent_at, 'recipient': recipient, 'message': f'Đã gửi bảng lương đến {recipient}.'}

@app.post('/api/payment-vouchers',status_code=201)
@app.post('/api/payments',status_code=201,include_in_schema=False)
def create_payment_voucher(p: PaymentVoucherIn):
    d=parse_date(p.payment_date,'payment_date'); no=p.voucher_no or f"PAY-{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    requested_amount = money_value(p.amount, 'amount')
    if p.submission_id is None and p.staff_id is None:
        raise HTTPException(422, 'submission_id or staff_id is required')
    with db() as c:
        submission = None
        if p.submission_id is not None:
            submission = c.execute('SELECT * FROM salary_submissions WHERE id=?',(p.submission_id,)).fetchone()
            if submission is None:
                raise HTTPException(404,'salary submission not found')
            if staff_row(c, submission['staff_id']) is None:
                raise HTTPException(422, 'salary submission references an unknown staff member')
            if p.staff_id is not None and p.staff_id != submission['staff_id']:
                raise HTTPException(422, 'staff_id does not match salary submission')
            submission_amount = money_value(submission['total'], 'submission total')
            if requested_amount != submission_amount:
                raise HTTPException(422, 'amount must match salary submission total')
            canonical_staff_id = submission['staff_id']
        else:
            canonical_staff_id = p.staff_id
            if canonical_staff_id is not None and staff_row(c, canonical_staff_id) is None:
                raise HTTPException(404, 'staff not found')
        if p.submission_id is not None:
            existing = c.execute('SELECT * FROM payment_vouchers WHERE submission_id=? ORDER BY id DESC LIMIT 1',(p.submission_id,)).fetchone()
            if existing is not None:
                return row_dict(existing)
        paid_at = now_iso() if p.status == 'paid' else None
        try: cur=c.execute('INSERT INTO payment_vouchers(voucher_no,submission_id,staff_id,amount,payment_date,payment_method,status,description,metadata_json,paid_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',(no,p.submission_id,canonical_staff_id,float(requested_amount),d,p.payment_method,p.status,p.description,json.dumps(p.metadata,ensure_ascii=False),paid_at,now_iso()))
        except sqlite3.IntegrityError as e: raise HTTPException(409,'voucher_no already exists') from e
        payment = row_dict(c.execute('SELECT * FROM payment_vouchers WHERE id=?',(cur.lastrowid,)).fetchone())
        if p.submission_id is not None:
            c.execute("UPDATE salary_submissions SET status=?, paid_at=? WHERE id=?", ('paid' if p.status == 'paid' else 'submitted', now_iso() if p.status == 'paid' else None, p.submission_id))
            submission = c.execute('SELECT staff_id,period_from,period_to FROM salary_submissions WHERE id=?',(p.submission_id,)).fetchone()
            staff = staff_row(c, submission['staff_id'])
            payee = staff['full_name'] if staff else None
            next_expense_id = c.execute('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM expense_vouchers').fetchone()['next_id']
            expense_no = f"C{int(next_expense_id):05d}"
            c.execute('''INSERT OR IGNORE INTO expense_vouchers(voucher_no,category,amount,expense_date,payment_method,payee,description,status,metadata_json,paid_at,created_at)
                         VALUES(?,?,?,?,?,?,?,?,?,?,?)''',(expense_no,'salary',float(requested_amount),d,p.payment_method,payee,p.description or f"Chi lương {submission['period_from']} - {submission['period_to']}",p.status,json.dumps({'payment_voucher_id':payment['id'],'submission_id':p.submission_id},ensure_ascii=False),now_iso() if p.status == 'paid' else None,now_iso()))
        return payment
@app.get('/api/payment-vouchers')
def list_payment_vouchers(status:str|None=None):
    with db() as c: rows=c.execute('SELECT * FROM payment_vouchers'+(' WHERE status=?' if status else '')+' ORDER BY payment_date DESC,id DESC',(status,) if status else ()).fetchall()
    return [row_dict(r) for r in rows]
@app.post('/api/payment-vouchers/{voucher_id}/pay')
def pay_voucher(voucher_id:int):
    with db() as c:
        existing = c.execute('SELECT * FROM payment_vouchers WHERE id=?', (voucher_id,)).fetchone()
        if existing is None:
            raise HTTPException(404,'payment voucher not found')
        if existing['submission_id'] is not None:
            submission = c.execute('SELECT * FROM salary_submissions WHERE id=?',(existing['submission_id'],)).fetchone()
            if submission is None:
                raise HTTPException(422, 'payment voucher references a missing salary submission')
            if existing['staff_id'] != submission['staff_id']:
                raise HTTPException(422, 'payment voucher staff does not match salary submission')
            if money_value(existing['amount'], 'payment amount') != money_value(submission['total'], 'submission total'):
                raise HTTPException(422, 'payment amount must match salary submission total')
        elif existing['staff_id'] is not None and staff_row(c, existing['staff_id']) is None:
            raise HTTPException(422, 'payment voucher references an unknown staff member')
        if existing['status'] == 'paid':
            return row_dict(existing)
        cur=c.execute("UPDATE payment_vouchers SET status='paid',paid_at=? WHERE id=?",(now_iso(),voucher_id))
        payment = row_dict(c.execute('SELECT * FROM payment_vouchers WHERE id=?',(voucher_id,)).fetchone())
        if payment.get('submission_id') is not None:
            c.execute("UPDATE salary_submissions SET status='paid',paid_at=? WHERE id=?",(now_iso(),payment['submission_id']))
            submission = c.execute('SELECT staff_id,period_from,period_to FROM salary_submissions WHERE id=?',(payment['submission_id'],)).fetchone()
            staff = staff_row(c, submission['staff_id'])
            payee = staff['full_name'] if staff else None
            next_expense_id = c.execute('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM expense_vouchers').fetchone()['next_id']
            c.execute('''INSERT OR IGNORE INTO expense_vouchers(voucher_no,category,amount,expense_date,payment_method,payee,description,status,metadata_json,paid_at,created_at)
                         VALUES(?,?,?,?,?,?,?,?,?,?,?)''',(f"C{int(next_expense_id):05d}",'salary',payment['amount'],payment['payment_date'],payment.get('payment_method','cash'),payee,payment.get('description') or f"Chi lương {submission['period_from']} - {submission['period_to']}",'paid',json.dumps({'payment_voucher_id':payment['id'],'submission_id':payment['submission_id']},ensure_ascii=False),now_iso(),now_iso()))
        return payment
@app.post('/api/expense-vouchers',status_code=201)
def create_expense_voucher(p: ExpenseVoucherIn):
    d=parse_date(p.expense_date,'expense_date'); no=p.voucher_no or f"EXP-{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    with db() as c:
        try: cur=c.execute('INSERT INTO expense_vouchers(voucher_no,category,amount,expense_date,payment_method,payee,description,status,metadata_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',(no,p.category,p.amount,d,p.payment_method,p.payee,p.description,p.status,json.dumps(p.metadata,ensure_ascii=False),now_iso()))
        except sqlite3.IntegrityError as e: raise HTTPException(409,'voucher_no already exists') from e
        return row_dict(c.execute('SELECT * FROM expense_vouchers WHERE id=?',(cur.lastrowid,)).fetchone())
@app.get('/api/expense-vouchers')
def list_expense_vouchers(status:str|None=None):
    with db() as c: rows=c.execute('SELECT * FROM expense_vouchers'+(' WHERE status=?' if status else '')+' ORDER BY expense_date DESC,id DESC',(status,) if status else ()).fetchall()
    return [row_dict(r) for r in rows]
@app.post('/api/expense-vouchers/{voucher_id}/pay')
def pay_expense_voucher(voucher_id:int):
    with db() as c:
        cur=c.execute("UPDATE expense_vouchers SET status='paid',paid_at=? WHERE id=?",(now_iso(),voucher_id))
        if cur.rowcount==0: raise HTTPException(404,'expense voucher not found')
        return row_dict(c.execute('SELECT * FROM expense_vouchers WHERE id=?',(voucher_id,)).fetchone())
