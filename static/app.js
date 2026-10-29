const FALLBACK_STAFF = [
  { id: 2, full_name: 'GV Thảo', role: 'teacher' },
  { id: 3, full_name: 'GV Minh', role: 'teacher' },
  { id: 4, full_name: 'NV Linh', role: 'staff' },
  { id: 5, full_name: 'Mgr Hùng', role: 'manager' }
];
const DEFAULT_FROM = '2026-10-01';
const DEFAULT_TO = '2026-10-31';
const state = { period: '2026-10', grid: null, staff: FALLBACK_STAFF, payrollId: null, payroll: null, search: '', payrollAdjustments: {}, salarySelections: {}, submittedStaff: {}, emailSent: {}, emailMessages: {}, salarySubmissions: [], paymentVouchers: [], expenses: [], salaryTab: 'payroll', salaryLoading: false, payingStaff: {}, attendanceSource: 'demo' };
let lastFocusedElement = null;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const monthName = (period) => { const [year, month] = period.split('-'); return `tháng ${Number(month)}/${year}`; };
const money = (value) => `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(value || 0)))} đ`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const roleLabel = { teacher: 'Giáo viên', staff: 'Nhân viên', manager: 'Quản lý' };
async function apiJSON(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || `HTTP ${response.status}`);
  return body;
}
async function resetDemoData() {
  try {
    await apiJSON('/api/demo/reset', { method: 'POST' });
    state.salarySubmissions = [];
    state.paymentVouchers = [];
    state.expenses = [];
    state.submittedStaff = {};
    state.emailSent = {};
    state.emailMessages = {};
  } catch (error) {
    // The reset endpoint is intentionally available only in the local demo .bat.
    // A normal server simply continues without changing persisted data.
    if (!String(error.message).includes('HTTP 404') && !String(error.message).includes('demo reset is disabled')) console.warn('Demo reset skipped:', error.message);
  }
}
function salaryDates() { return { from: $('#salaryFrom')?.value || DEFAULT_FROM, to: $('#salaryTo')?.value || DEFAULT_TO }; }
function periodLabel(from, to) { return `${from.slice(8, 10)}/${from.slice(5, 7)}/${from.slice(0, 4)} - ${to.slice(8, 10)}/${to.slice(5, 7)}/${to.slice(0, 4)}`; }

function dateParts(value) {
  const date = new Date(`${value}T00:00:00`);
  return { day: String(date.getDate()).padStart(2, '0'), weekday: ['CN','T2','T3','T4','T5','T6','T7'][date.getDay()] };
}
function datesBetween(from, to) {
  const output = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end) {
    output.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return output;
}
function initials(name) { return name.split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase(); }
function shiftInfo(code) { return ({ morning: ['Sáng', 4], afternoon: ['Chiều', 4], evening: ['Tối', 3], sunday_afternoon: ['CN', 4], admin: ['HC', 8] }[code] || [code || '—', 0]); }
function shortShift(code) { return shiftInfo(code)[0]; }

function virtualShift(staffId, date) {
  const day = new Date(`${date}T00:00:00`).getDay();
  if (staffId === 2) {
    if ([1, 3, 5].includes(day)) return 'morning';
    if ([2, 4].includes(day)) return 'evening';
  }
  if (staffId === 3) {
    if ([2, 4].includes(day)) return 'afternoon';
    if (day === 0) return 'sunday_afternoon';
  }
  if (staffId === 4 && day >= 1 && day <= 5) return 'admin';
  if (staffId === 5 && day >= 1 && day <= 5) return 'admin';
  return null;
}
function buildVirtualGrid(from, to) {
  const rows = [];
  datesBetween(from, to).forEach(date => FALLBACK_STAFF.forEach(staff => {
    const shift_code = virtualShift(staff.id, date);
    if (!shift_code) return;
    const [, scheduledHours] = shiftInfo(shift_code);
    const day = Number(date.slice(-2));
    const status = (staff.id === 4 && day === 9) ? 'incomplete' : (staff.id === 3 && day === 14 ? 'late' : 'on_time');
    rows.push({ staff_id: staff.id, staff_name: staff.full_name, shift_date: date, shift_code, hours: status === 'incomplete' ? 0 : scheduledHours, attendance: { staff_id: staff.id, attendance_date: date, status } });
  }));
  return { staff: FALLBACK_STAFF, rows, from, to };
}

function currentStaff() { return state.staff?.length ? state.staff : FALLBACK_STAFF; }
function staffById(staffId) { return currentStaff().find(item => Number(item.id) === Number(staffId)) || FALLBACK_STAFF.find(item => Number(item.id) === Number(staffId)); }
function normalizeAttendance(payload, from, to) {
  const staff = Array.isArray(payload.staff) && payload.staff.length ? payload.staff : FALLBACK_STAFF;
  const rows = (payload.rows || []).map(row => {
    const hasAttendance = row.attendance_id != null || row.status != null || row.checkin_at != null || row.checkout_at != null;
    return {
      ...row,
      hours: Number(row.hours || 0),
      // Keep attendance separate from the scheduled shift. A missing match is
      // meaningful for a shift with no check-in, so don't turn it into a shared
      // same-day attendance object. The fallback fields keep old API payloads
      // usable while newer responses identify the attendance row explicitly.
      attendance: hasAttendance ? {
        id: row.attendance_id,
        staff_id: row.staff_id,
        attendance_date: row.shift_date,
        status: row.status,
        checkin_at: row.checkin_at,
        checkout_at: row.checkout_at
      } : null
    };
  });
  return { staff, rows, from: payload.from || from, to: payload.to || to };
}

async function loadAll() {
  const from = $('#fromDate').value || DEFAULT_FROM;
  const to = $('#toDate').value || DEFAULT_TO;
  state.period = from.slice(0, 7);
  if (from > to) {
    $('#fromDate').setAttribute('aria-invalid', 'true');
    $('#toDate').setAttribute('aria-invalid', 'true');
    $('#attendanceStatus').textContent = 'Ngày bắt đầu phải trước hoặc cùng ngày kết thúc.';
    $('#attendanceStatus').className = 'form-status error';
    return;
  }
  $('#fromDate').removeAttribute('aria-invalid');
  $('#toDate').removeAttribute('aria-invalid');
  $('#attendanceStatus').textContent = 'Đang tải dữ liệu chấm công…';
  $('#attendanceStatus').className = 'form-status loading';
  try {
    const payload = await apiJSON(`/api/attendance?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    if (Array.isArray(payload.rows) && payload.rows.length) {
      state.grid = normalizeAttendance(payload, from, to);
      state.staff = state.grid.staff;
      state.attendanceSource = 'backend';
      $('#attendanceStatus').textContent = 'Đã tải dữ liệu chấm công từ backend.';
      $('#attendanceStatus').className = 'form-status success';
    } else {
      state.staff = FALLBACK_STAFF;
      state.grid = buildVirtualGrid(from, to);
      state.attendanceSource = 'demo';
      $('#attendanceStatus').textContent = 'Chưa có dữ liệu backend trong kỳ này · đang hiển thị dữ liệu mẫu.';
      $('#attendanceStatus').className = 'form-status';
    }
  } catch (error) {
    state.staff = FALLBACK_STAFF;
    state.grid = buildVirtualGrid(from, to);
    state.attendanceSource = 'demo';
    $('#attendanceStatus').textContent = `Không tải được backend · đang hiển thị dữ liệu mẫu (${error.message}).`;
    $('#attendanceStatus').className = 'form-status error';
  }
  renderAttendance(state.grid, state.grid.from, state.grid.to);
}

function renderAttendance(grid, from, to) {
  const dates = datesBetween(from, to);
  const byStaff = new Map((grid.staff || []).map(staff => [staff.id, { staff, entries: new Map() }]));
  (grid.rows || []).forEach(row => {
    const bucket = byStaff.get(row.staff_id);
    if (!bucket.entries.has(row.shift_date)) bucket.entries.set(row.shift_date, []);
    bucket.entries.get(row.shift_date).push(row);
  });
  const people = [...byStaff.values()].filter(({ staff }) => !state.search || staff.full_name.toLowerCase().includes(state.search.toLowerCase()));
  const table = $('#attendanceTable');
  $('#emptyState').classList.toggle('hidden', people.length > 0);
  table.classList.toggle('hidden', people.length === 0);
  table.querySelector('thead').innerHTML = `<tr><th scope="col">Nhân viên</th>${dates.map(date => { const parts = dateParts(date); return `<th scope="col" class="day-head">${parts.day}<small>${parts.weekday}</small></th>`; }).join('')}</tr>`;
  table.querySelector('tbody').innerHTML = people.map(({ staff, entries }) => {
    const dayCells = dates.map(date => {
      const list = entries.get(date) || [];
      if (!list.length) return '<td class="day-cell empty">—</td>';
      const hasWarning = list.some(row => row.attendance?.status !== 'on_time');
      return `<td class="day-cell ${hasWarning ? 'warning' : ''}">${list.map(row => {
        const hoursLabel = row.attendance?.status === 'incomplete' ? 'Thiếu checkout' : row.attendance ? `${Number(row.hours || 0).toLocaleString('vi-VN')}h` : 'Chưa chấm';
        return `<span class="shift-chip"><span class="shift-code">${escapeHtml(shortShift(row.shift_code))}</span><span class="shift-hours">${hoursLabel}</span></span>`;
      }).join('<br>')}</td>`;
    }).join('');
    return `<tr class="staff-row"><th scope="row"><div class="staff-cell"><span class="staff-avatar" aria-hidden="true">${initials(staff.full_name)}</span><div><span class="staff-name">${escapeHtml(staff.full_name)}</span><span class="staff-role">${escapeHtml(roleLabel[staff.role])}</span><button type="button" aria-label="Mở bảng lương của ${escapeHtml(staff.full_name)}" class="salary-button" data-salary-id="${staff.id}">Lương</button></div></div></th>${dayCells}</tr>`;
  }).join('');
}

function virtualPayroll(staffId) {
  const staff = staffById(staffId);
  const rows = (state.grid?.rows || []).filter(row => row.staff_id === staffId);
  const shifts = rows.length;
  const hours = rows.reduce((sum, row) => sum + Number(row.hours || 0), 0);
  const lateCount = rows.filter(row => row.attendance?.status === 'late').length;
  const selection = state.salarySelections[staffId] || {};
  const classRows = staff.role === 'teacher'
    ? [
        { name: 'BIG 1A', shifts: Math.ceil(shifts * 0.6), hours: Math.round(hours * 0.6 * 10) / 10, options: [{ label: 'Lương theo ca 200k', mode: 'shift', rate: 200000 }, { label: 'Lương theo ca 250k', mode: 'shift', rate: 250000 }] },
        { name: 'BIG 1B', shifts: Math.floor(shifts * 0.4), hours: Math.round(hours * 0.4 * 10) / 10, options: [{ label: 'Lương theo ca 200k', mode: 'shift', rate: 200000 }, { label: 'Lương theo ca 250k', mode: 'shift', rate: 250000 }] }
      ]
    : staff.role === 'staff'
      ? [{ name: 'Hành chính', shifts, hours, options: [{ label: 'Lương nhân viên 6tr', mode: 'fixed', rate: 6000000 }, { label: 'Theo ca 150k', mode: 'shift', rate: 150000 }] }]
      : [{ name: 'Quản lý trung tâm', shifts, hours, options: [{ label: 'Lương quản lý 8tr', mode: 'fixed', rate: 8000000 }, { label: 'Lương quản lý 10tr', mode: 'fixed', rate: 10000000 }] }];
  classRows.forEach((row, index) => {
    row.selected = selection[index] ?? 0;
    row.salary = row.options[row.selected];
    row.amount = row.salary.mode === 'fixed' ? row.salary.rate : row.salary.rate * row.shifts;
  });
  const classAmount = classRows.reduce((sum, row) => sum + row.amount, 0);
  const base = 0;
  const teachingAmount = classAmount;
  const eveningAmount = 0;
  const managementAmount = 0;
  const adjustment = state.payrollAdjustments[staffId] || { bonus: 0, penalty: 0 };
  const subtotal = classAmount;
  return { staff, period: state.period, from: state.grid?.from, to: state.grid?.to, classes: classRows, base_salary: base, allowance: teachingAmount + eveningAmount + managementAmount, bonus: adjustment.bonus, penalty: adjustment.penalty, total: subtotal + adjustment.bonus - adjustment.penalty, shift_count: shifts, hours, late_count: lateCount, ...payrollAttendanceValidation(rows) };
}

function payrollRateOptions(staff) {
  const defaultRate = Number(staff.hourly_rate || (staff.role === 'teacher' ? 180000 : staff.role === 'manager' ? 220000 : 150000));
  return [
    { label: `Theo ca ${money(defaultRate)}`, mode: 'shift', rate: defaultRate },
    { label: `Theo ca ${money(defaultRate + 50000)}`, mode: 'shift', rate: defaultRate + 50000 }
  ];
}
function payrollAttendanceValidation(rows) {
  const issues = rows.flatMap(row => {
    const attendance = row.attendance;
    const problems = !attendance ? ['chưa chấm công'] : [
      ...(attendance.checkin_at === null ? ['thiếu check-in'] : []),
      ...(attendance.checkout_at === null || (attendance.status === 'incomplete' && attendance.checkout_at === undefined) ? ['thiếu checkout'] : []),
      ...(attendance.status === 'incomplete' && attendance.checkin_at && attendance.checkout_at ? ['chấm công chưa hoàn tất'] : [])
    ];
    if (!problems.length) return [];
    const date = row.shift_date || row.class_date || '';
    const label = date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : 'Chưa rõ ngày';
    const time = row.start_time && row.end_time ? ` (${row.start_time}–${row.end_time})` : '';
    return [{ missing: !attendance, text: `${label} · ${shortShift(row.shift_code)}${time}: ${problems.join(', ')}.` }];
  });
  return {
    incomplete_count: issues.filter(issue => !issue.missing).length,
    missing_count: issues.filter(issue => issue.missing).length,
    valid: issues.length === 0,
    validation: issues.map(issue => issue.text)
  };
}
function payrollFromBackend(payload, staffId, attendanceRows) {
  const staff = payload.staff || staffById(staffId);
  if (payload.email_status === 'sent') {
    state.emailSent[staffId] = true;
    state.emailMessages[staffId] = 'Đã gửi bảng lương thật đến email đã cấu hình.';
  }
  const from = payload.period_from || state.grid?.from;
  const to = payload.period_to || state.grid?.to;
  const sourceRows = (attendanceRows || state.grid?.rows || []).filter(row => Number(row.staff_id) === Number(staffId) && (!from || row.shift_date >= from) && (!to || row.shift_date <= to));
  const savedClasses = payload.details?.classes;
  const rawRows = savedClasses?.length
    ? savedClasses.map(row => ({ name: row.description || 'Ca học', shifts: Number(row.shifts ?? 1), hours: Number(row.hours || 0), amount: Number(row.amount || 0), rate: Number(row.rate || 0) }))
    : [...sourceRows.reduce((groups, row) => {
        const key = row.shift_code || row.description || 'Ca học';
        const group = groups.get(key) || { name: shortShift(row.shift_code), shifts: 0, hours: 0 };
        group.shifts += 1; group.hours += Number(row.hours || 0);
        groups.set(key, group); return groups;
      }, new Map()).values()];
  const options = payrollRateOptions(staff);
  const classes = rawRows.map(row => {
    const selected = options.findIndex(option => Number(option.rate) === Number(row.rate));
    const salary = options[selected >= 0 ? selected : 0];
    const amount = Number(row.amount ?? (salary.rate * Number(row.shifts || 0)));
    return { ...row, options, selected: selected >= 0 ? selected : 0, salary, amount };
  });
  const adjustment = state.payrollAdjustments[staffId] || { bonus: Number(payload.bonus || 0), penalty: Number(payload.deduction || 0) };
  const attendanceValidation = payrollAttendanceValidation(sourceRows);
  const subtotal = classes.reduce((sum, row) => sum + row.amount, 0);
  const baseSalary = Number(payload.base_salary ?? staff.base_salary ?? 0);
  return { staff, period: (payload.period_from || state.period), from, to, classes, base_salary: baseSalary, allowance: Number(payload.allowance ?? subtotal), bonus: Number(adjustment.bonus || 0), penalty: Number(adjustment.penalty || 0), total: Number(payload.total ?? (baseSalary + subtotal + adjustment.bonus - adjustment.penalty)), shift_count: classes.reduce((sum, row) => sum + Number(row.shifts || 0), 0), hours: classes.reduce((sum, row) => sum + Number(row.hours || 0), 0), ...attendanceValidation };
}
async function openPayroll(staffId) {
  lastFocusedElement = document.activeElement;
  state.payrollId = staffId;
  const from = $('#fromDate').value || state.grid?.from || '2026-10-01';
  const to = $('#toDate').value || state.grid?.to || '2026-10-31';
  state.payroll = { staff: staffById(staffId), from, to, period: from.slice(0, 7), classes: [], bonus: 0, penalty: 0, total: 0, valid: true, validation: [] };
  $('#drawer').classList.remove('hidden');
  document.body.classList.add('drawer-open');
  $('#detail').innerHTML = '<div class="payroll-loading" role="status">Đang tải dữ liệu lương…</div>';
  $('#closeDrawer').focus();
  try {
    const query = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const [payload, attendance] = await Promise.all([
      apiJSON(`/api/payroll/${encodeURIComponent(staffId)}?${query}`),
      apiJSON(`/api/attendance?${query}`)
    ]);
    state.payroll = payrollFromBackend(payload, staffId, normalizeAttendance(attendance, from, to).rows);
    renderPayroll();
  } catch (error) {
    state.payroll = virtualPayroll(staffId);
    renderPayroll(`Không tải được chi tiết backend, đang dùng dữ liệu mẫu: ${error.message}`);
  }
}

function renderPayroll(message = '') {
  const p = state.payroll;
  const validation = p.valid ? '' : `<div id="payrollValidation" class="validation bad"><strong>Chưa thể Submit: ${p.validation.length} ca chưa đủ dữ liệu chấm công.</strong><ul>${p.validation.map(issue => `<li>${escapeHtml(issue)}</li>`).join('')}</ul><p>Đối chiếu và bổ sung chấm công cho các ca trên, sau đó mở lại bảng lương để kiểm tra.</p></div>`;
  const staffButtons = currentStaff().map(staff => `<button class="payroll-staff ${staff.id === p.staff.id ? 'selected' : ''}" data-staff-id="${staff.id}">${escapeHtml(staff.full_name)}</button>`).join('');
  const classRows = p.classes.map((row, index) => `<tr><td>${escapeHtml(row.name)}</td><td>${row.shifts}</td><td>${row.hours.toLocaleString('vi-VN')}</td><td><select aria-label="Mức lương ${escapeHtml(row.name)}" data-salary-class="${index}">${row.options.map((option, optionIndex) => `<option value="${optionIndex}" ${optionIndex === row.selected ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select></td><td class="line-total">${money(row.amount)}</td></tr>`).join('');
  const classTotal = p.classes.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const allowanceDifference = Number(p.allowance || 0) - classTotal;
  const breakdownRows = `<tr><td>Lương cơ bản</td><td>—</td><td>—</td><td>${money(p.base_salary)}</td></tr>` + p.classes.map(row => `<tr><td>${escapeHtml(row.name)}<span class="payroll-calculation">${row.salary.mode === 'fixed' ? escapeHtml(row.salary.label) : `${row.shifts} ca × ${money(row.salary.rate)}/ca`}</span></td><td>${row.shifts}</td><td>${row.hours.toLocaleString('vi-VN')}</td><td>${money(row.amount)}</td></tr>`).join('') + (allowanceDifference ? `<tr><td>Điều chỉnh lương/phụ cấp đã lưu</td><td>—</td><td>—</td><td>${money(allowanceDifference)}</td></tr>` : '') + `<tr class="payroll-subtotal"><td colspan="3">Cộng trước thưởng và giảm trừ</td><td>${money(Number(p.base_salary || 0) + Number(p.allowance || 0))}</td></tr>`;
  const fromLabel = (p.from || `${p.period}-01`).slice(8, 10) + '/' + (p.from || `${p.period}-01`).slice(5, 7);
  const toLabel = (p.to || `${p.period}-28`).slice(8, 10) + '/' + (p.to || `${p.period}-28`).slice(5, 7);
  const submitted = Boolean(state.submittedStaff[p.staff.id]);
  const emailSent = Boolean(state.emailSent[p.staff.id]);
  const actionButton = submitted ? `<span class="submitted-status">✓ Đã Submit</span><button class="drawer-button email-button" data-action="email" ${emailSent ? 'disabled' : ''}>${emailSent ? 'Đã gửi Email' : 'Gửi Email'}</button>` : `<button class="drawer-button primary" data-action="submit" ${p.valid ? '' : 'disabled aria-describedby="payrollValidation"'}>Submit</button>`;
  const emailMessage = emailSent ? `<div class="email-success">✓ ${escapeHtml(state.emailMessages[p.staff.id] || `Đã gửi bảng lương cho ${p.staff.full_name}.`)}</div>` : '';
  $('#detail').innerHTML = `<div class="payroll-layout">
    <aside class="payroll-sidebar"><input class="payroll-search" id="payrollSearch" placeholder="Lọc" aria-label="Lọc nhân viên"><div class="payroll-staff-list">${staffButtons}</div></aside>
    <section class="payroll-main">
      <div class="payroll-heading"><h2>${escapeHtml(p.staff.full_name)} <span>- ${fromLabel} - ${toLabel}</span></h2></div>
      <div class="payroll-body" tabindex="0" role="region" aria-label="Nội dung chi tiết bảng lương">
        <p class="payroll-attendance-note">${p.shift_count} ca theo lịch · ${Number(p.hours || 0).toLocaleString('vi-VN')} giờ ghi nhận${p.valid ? '' : ' · Lương tạm tính, cần hoàn tất chấm công.'}</p>
        <div class="payroll-table-wrap"><table class="payroll-table"><caption class="sr-only">Chi tiết mức lương của ${escapeHtml(p.staff.full_name)}</caption><thead><tr><th scope="col">Lớp / công việc</th><th scope="col">Số ca</th><th scope="col">Giờ</th><th scope="col">Mức lương</th><th scope="col">Tổng</th></tr></thead><tbody>${classRows}</tbody></table></div>
        <div class="salary-breakdown"><h3>Cấu thành lương</h3><table class="salary-lines"><caption class="sr-only">Tóm tắt lương của ${escapeHtml(p.staff.full_name)}</caption><thead><tr><th scope="col">Khoản lương</th><th scope="col">Số ca</th><th scope="col">Giờ</th><th scope="col">Thành tiền</th></tr></thead><tbody>${breakdownRows}</tbody></table></div>
        <div class="payroll-form"><label for="bonus">Thưởng<input id="bonus" type="number" min="0" step="1000" value="${p.bonus}"></label><label for="penalty">Giảm trừ<input id="penalty" type="number" min="0" step="1000" value="${p.penalty}"></label><div class="payroll-total"><span>${p.valid ? 'Thành tiền' : 'Thành tiền tạm tính'}</span><strong id="payrollTotal" aria-live="polite">${money(p.total)}</strong></div></div>${validation}${emailMessage}
      </div>
      <footer class="payroll-footer"><div class="payroll-submit">${actionButton}</div><p class="save-message" role="status" aria-live="polite">${escapeHtml(message)}</p></footer>
    </section></div>`;
}

function submissionFor(staffId) { return state.salarySubmissions.find(item => Number(item.staff_id) === Number(staffId)); }
function voucherForSubmission(submissionId) { return state.paymentVouchers.find(item => Number(item.submission_id) === Number(submissionId)); }
function salaryTotalFor(staffId) {
  const submission = submissionFor(staffId);
  if (submission) return Number(submission.total || 0);
  return Number(virtualPayroll(staffId).total || 0);
}
function submissionDetails(submission) {
  if (!submission) return {};
  if (submission.details && typeof submission.details === 'object') return submission.details;
  if (typeof submission.details === 'string') {
    try { return JSON.parse(submission.details) || {}; } catch { return {}; }
  }
  return {};
}
function submissionWork(submission) {
  const classes = submissionDetails(submission).classes;
  if (!Array.isArray(classes) || !classes.length) return '<span class="salary-muted">—</span>';
  const shifts = classes.reduce((sum, row) => sum + Number(row.shifts || 0), 0);
  const hours = classes.reduce((sum, row) => sum + Number(row.hours || 0), 0);
  const parts = [];
  if (shifts) parts.push(`${shifts.toLocaleString('vi-VN')} ca`);
  if (hours) parts.push(`${hours.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} giờ`);
  return parts.length ? parts.join(' · ') : '<span class="salary-muted">—</span>';
}
function submissionOptionalAmount(submission, keys) {
  const details = submissionDetails(submission);
  const key = keys.find(name => submission?.[name] !== undefined && submission?.[name] !== null && submission?.[name] !== '')
    || keys.find(name => details[name] !== undefined && details[name] !== null && details[name] !== '');
  return key ? money(submission?.[key] ?? details[key]) : '<span class="salary-muted">—</span>';
}
function submissionDate(submission) {
  const value = String(submission?.submitted_at || '').slice(0, 10);
  return value ? escapeHtml(value.split('-').reverse().join('/')) : '<span class="salary-muted">—</span>';
}
function submissionPeriod(submission) {
  if (!submission?.period_from || !submission?.period_to) return '<span class="salary-muted">—</span>';
  return `${escapeHtml(submission.period_from)} - ${escapeHtml(submission.period_to)}`;
}
function renderSalaryReport() {
  const { from, to } = salaryDates();
  const query = ($('#salarySearch')?.value || '').toLowerCase().trim();
  const staff = currentStaff().filter(person => !query || person.full_name.toLowerCase().includes(query));
  $('#salaryPeriodLabel').textContent = periodLabel(from, to);
  const head = '<tr><th scope="col">Nhân viên</th><th scope="col">Lương cơ bản</th><th scope="col">Số tiền trợ cấp</th><th scope="col">Công thực tế</th><th scope="col">Tổng lương</th><th scope="col">Thưởng</th><th scope="col">Giảm trừ</th><th scope="col">Ngày Submit</th><th scope="col">Giảm trừ QC</th><th scope="col">Trừ chi phí thuê</th><th scope="col">Thực nhận</th><th scope="col">Kỳ nhận</th><th scope="col">Trạng thái</th><th scope="col">Thanh toán</th></tr>';
  $('#salaryTable').querySelector('thead').innerHTML = head;
  $('#salaryTable').querySelector('tbody').innerHTML = staff.map(person => {
    const submission = submissionFor(person.id);
    const voucher = submission && voucherForSubmission(submission.id);
    const submitted = Boolean(submission && ['submitted', 'paid'].includes(submission.status));
    const paid = Boolean(submission && submission.status === 'paid') || Boolean(voucher && voucher.status === 'paid');
    const status = paid ? '<span class="salary-status paid">● Đã thanh toán</span>' : submitted ? '<span class="salary-status submitted">● Đã Submit</span>' : '<span class="salary-status">○ Chưa Submit</span>';
    const methodLabel = (method) => method === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt';
    const action = paid ? voucher ? `<span class="paid-method">${methodLabel(voucher.payment_method)}</span><button type="button" aria-label="Xem phiếu chi của ${escapeHtml(person.full_name)}" class="voucher-link" data-voucher-id="${voucher.id}">Xem phiếu chi</button>` : '<span class="salary-status paid">● Đã thanh toán</span>' : submitted ? `<fieldset class="payment-action"><legend class="sr-only">Phương thức thanh toán cho ${escapeHtml(person.full_name)}</legend><label><input type="radio" name="payment-method-${person.id}" value="cash" checked> Tiền mặt</label><label><input type="radio" name="payment-method-${person.id}" value="bank_transfer"> Chuyển khoản</label><button type="button" aria-label="Thanh toán lương cho ${escapeHtml(person.full_name)}" class="pay-button" data-pay-staff="${person.id}" ${state.payingStaff[person.id] ? 'disabled' : ''}>${state.payingStaff[person.id] ? 'Đang xử lý…' : 'Thanh toán'}</button></fieldset>` : '<span class="salary-muted">Chờ Submit</span>';
    const base = submission ? Number(submission.base_salary || 0) : 0;
    const allowance = submission ? Number(submission.allowance || 0) : 0;
    const bonus = submission ? Number(submission.bonus || 0) : 0;
    const deduction = submission ? Number(submission.deduction || 0) : 0;
    return `<tr><td><div class="staff-cell"><span class="staff-avatar">${initials(person.full_name)}</span><div><span class="staff-name">${escapeHtml(person.full_name)}</span><span class="staff-role">${escapeHtml(roleLabel[person.role] || person.role)}</span></div></div></td><td>${base ? money(base) : '<span class="salary-muted">—</span>'}</td><td>${allowance ? money(allowance) : '<span class="salary-muted">—</span>'}</td><td>${submissionWork(submission)}</td><td class="line-total">${submission ? money(submission.total) : '<span class="salary-muted">—</span>'}</td><td>${submission ? money(bonus) : '<span class="salary-muted">—</span>'}</td><td>${submission ? money(deduction) : '<span class="salary-muted">—</span>'}</td><td>${submissionDate(submission)}</td><td>${submissionOptionalAmount(submission, ['quality_deduction', 'qc_deduction'])}</td><td>${submissionOptionalAmount(submission, ['rental_deduction', 'rent_deduction', 'hire_cost'])}</td><td>${submission ? money(submission.total) : '<span class="salary-muted">—</span>'}</td><td>${submissionPeriod(submission)}</td><td>${status}</td><td>${action}</td></tr>`;
  }).join('');
  $('#salaryEmptyState').classList.toggle('hidden', staff.length > 0);
  $('#salaryTable').classList.toggle('hidden', staff.length === 0);
}
function renderExpenseReport() {
  const query = ($('#salarySearch')?.value || '').toLowerCase().trim();
  const { from, to } = salaryDates();
  const rows = state.expenses.filter(item => {
    const text = `${item.payee || ''} ${item.description || ''} ${item.voucher_no || ''}`.toLowerCase();
    const inPeriod = !item.expense_date || (item.expense_date >= from && item.expense_date <= to);
    return inPeriod && (!query || text.includes(query));
  });
  $('#expensesTable').querySelector('thead').innerHTML = '<tr><th scope="col">Số phiếu</th><th scope="col">Ngày chi</th><th scope="col">Nội dung</th><th scope="col">Người nhận</th><th scope="col">Số tiền</th><th scope="col">Phương thức</th><th scope="col">Trạng thái</th><th scope="col"><span class="sr-only">Thao tác</span></th></tr>';
  $('#expensesTable').querySelector('tbody').innerHTML = rows.map(item => `<tr><td>${escapeHtml(item.voucher_no)}</td><td>${escapeHtml(item.expense_date)}</td><td>${escapeHtml(item.description || 'Chi lương')}</td><td>${escapeHtml(item.payee || '—')}</td><td class="line-total">${money(item.amount)}</td><td>${item.payment_method === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</td><td><span class="salary-status paid">● Đã chi</span></td><td><button type="button" class="voucher-link" data-expense-id="${item.id}">Chi tiết</button></td></tr>`).join('');
  $('#expensesEmptyState').classList.toggle('hidden', rows.length > 0);
  $('#expensesTable').classList.toggle('hidden', rows.length === 0);
}
const VN_DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
function readThreeDigits(value, full = false) {
  const n = Number(value) || 0;
  const hundred = Math.floor(n / 100); const ten = Math.floor((n % 100) / 10); const one = n % 10;
  const words = [];
  if (hundred || full) words.push(`${VN_DIGITS[hundred]} trăm`);
  if (ten > 1) { words.push(`${VN_DIGITS[ten]} mươi`); if (one === 1) words.push('mốt'); else if (one === 5) words.push('lăm'); else if (one) words.push(VN_DIGITS[one]); }
  else if (ten === 1) { words.push('mười'); if (one === 5) words.push('lăm'); else if (one) words.push(VN_DIGITS[one]); }
  else if (one) { if (hundred || full) words.push('lẻ'); words.push(one === 5 ? 'năm' : VN_DIGITS[one]); }
  return words.join(' ');
}
function amountInVietnamese(value) {
  const amount = Math.round(Number(value) || 0);
  if (!amount) return 'Không đồng chẵn';
  const groups = []; let rest = amount;
  while (rest > 0) { groups.unshift(rest % 1000); rest = Math.floor(rest / 1000); }
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ'];
  const words = groups.map((group, index) => {
    if (!group) return '';
    const unitIndex = groups.length - index - 1;
    return `${readThreeDigits(group, unitIndex < groups.length - 1 && index > 0)} ${units[unitIndex] || ''}`.trim();
  }).filter(Boolean).join(' ');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} đồng chẵn`;
}
async function loadSalaryReport(message = '') {
  const { from, to } = salaryDates();
  if (from > to) {
    $('#salaryFrom').setAttribute('aria-invalid', 'true');
    $('#salaryTo').setAttribute('aria-invalid', 'true');
    $('#salaryStatus').textContent = 'Ngày bắt đầu phải trước hoặc cùng ngày kết thúc.';
    $('#salaryStatus').className = 'form-status error';
    return;
  }
  $('#salaryFrom').removeAttribute('aria-invalid');
  $('#salaryTo').removeAttribute('aria-invalid');
  $('#salaryStatus').className = 'form-status loading';
  $('#salaryStatus').textContent = 'Đang tải dữ liệu lương…';
  $('#salaryView').setAttribute('aria-busy', 'true');
  state.salaryLoading = true;
  try {
    const [submissions, staff, vouchers, expenses] = await Promise.all([
      apiJSON(`/api/payroll?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
      apiJSON('/api/staff'),
      apiJSON('/api/payment-vouchers'),
      apiJSON('/api/expense-vouchers')
    ]);
    state.salarySubmissions = Array.isArray(submissions) ? submissions : [];
    if (Array.isArray(staff) && staff.length) state.staff = staff;
    state.paymentVouchers = Array.isArray(vouchers) ? vouchers : [];
    state.expenses = Array.isArray(expenses) ? expenses : [];
    state.salarySubmissions.forEach(item => {
      if (['submitted', 'paid'].includes(item.status)) state.submittedStaff[item.staff_id] = true;
      if (item.email_status === 'sent') {
        state.emailSent[item.staff_id] = true;
        state.emailMessages[item.staff_id] = 'Đã gửi bảng lương thật đến email đã cấu hình.';
      }
    });
    renderSalaryReport();
    renderExpenseReport();
    $('#salaryStatus').className = 'form-status';
    $('#salaryStatus').textContent = '';
    if (message) showToast(message);
  } catch (error) {
    $('#salaryStatus').className = 'form-status error';
    $('#salaryStatus').textContent = `Không tải được dữ liệu lương: ${error.message}`;
    $('#salaryTable').querySelector('tbody').innerHTML = '';
    $('#salaryTable').classList.add('hidden');
    $('#salaryEmptyState').classList.remove('hidden');
    $('#salaryEmptyState').textContent = 'Không tải được dữ liệu lương. Vui lòng thử lại.';
  } finally { state.salaryLoading = false; $('#salaryView').setAttribute('aria-busy', 'false'); }
}
function showToast(message) { const node = $('#salaryView .save-message') || document.createElement('p'); node.className = 'salary-toast'; node.textContent = message; if (!node.parentElement) $('#salaryView').prepend(node); setTimeout(() => node.remove(), 3500); }
async function paySalary(staffId) {
  const submission = submissionFor(staffId);
  if (!submission || state.payingStaff[staffId]) return;
  const method = document.querySelector(`input[name="payment-method-${staffId}"]:checked`)?.value || 'cash';
  state.payingStaff[staffId] = true; renderSalaryReport();
  try {
    const payment = await apiJSON('/api/payment-vouchers', { method: 'POST', body: JSON.stringify({ submission_id: submission.id, staff_id: staffId, amount: Number(submission.total || 0), payment_date: new Date().toISOString().slice(0, 10), payment_method: method, status: 'paid', description: `Chi lương ${submission.period_from} - ${submission.period_to}` }) });
    await loadSalaryReport('Đã thanh toán lương và tạo phiếu chi.');
  } catch (error) { showToast(`Không thể thanh toán: ${error.message}`); }
  finally { delete state.payingStaff[staffId]; renderSalaryReport(); }
}
function openVoucher(voucher) {
  if ($('#voucherModal').classList.contains('hidden')) lastFocusedElement = document.activeElement;
  const paymentMethod = voucher.payment_method === 'bank_transfer' ? 'Chuyển khoản' : 'Tiền mặt';
  const dateValue = voucher.expense_date || voucher.payment_date || new Date().toISOString().slice(0, 10);
  const datePartsValue = dateValue.split('-');
  const voucherDate = `${datePartsValue[2] || '—'} / ${datePartsValue[1] || '—'} / ${datePartsValue[0] || '—'}`;
  const voucherNo = escapeHtml(voucher.voucher_no || 'C00003');
  $('#voucherDetail').innerHTML = `<div class="voucher-sheet"><div class="voucher-titlebar"><h2 id="voucherTitle">Chi tiết chi</h2><button type="button" class="voucher-x" data-close-voucher="true" aria-label="Đóng phiếu chi">×</button></div><div class="voucher-paper"><div class="voucher-paper-head"><div class="voucher-brand"><span class="voucher-logo" aria-hidden="true">A</span><div><strong>AURORA ENGLISH CENTER</strong><span>Địa chỉ: Số 17 Phúc Lợi, Long Biên, Hà Nội</span><span>Điện thoại: 0894758934</span></div></div><div class="voucher-form-code"><strong>MẪU SỐ 02 - TT</strong><span>(Ban hành theo Thông tư số 133/2016/TT-BTC</span><span>Ngày 26/08/2016 của Bộ Tài chính)</span></div></div><div class="voucher-doc-head"><div><h1>PHIẾU CHI</h1><p>${voucherDate}</p></div><div class="voucher-number"><strong>PHIẾU CHI</strong><span>Quyển số: —</span><span>Số: ${voucherNo}</span><span>Nợ: —</span><span>Có: —</span></div></div><div class="voucher-fields"><div><span>Họ và tên người nhận tiền:</span><strong>${escapeHtml(voucher.payee || '—')}</strong></div><div><span>Địa chỉ:</span><strong> </strong></div><div><span>Lý do chi:</span><strong>Trả lương</strong></div><div><span>Số tiền:</span><strong>${money(voucher.amount)} (${paymentMethod})</strong></div><div><span>Viết bằng chữ:</span><strong>${amountInVietnamese(voucher.amount)}</strong></div><div><span>Kèm theo:</span><strong>........................................ Chứng từ gốc;</strong></div></div><div class="voucher-sign-date">Ngày ...... tháng ...... năm ......</div><div class="voucher-signatures"><strong>Giám đốc</strong><strong>Kế toán trưởng</strong><strong>Người nhận</strong><strong>Người lập phiếu</strong><strong>Thủ quỹ</strong></div><div class="voucher-org">AURORA ENGLISH CENTER</div></div><div class="voucher-actions"><button type="button" class="voucher-close-button" data-close-voucher="true">Đóng</button><label><input type="checkbox"> In hai bản trên A4</label><button type="button" class="voucher-print-button" data-voucher-print="true" aria-label="In phiếu chi">In</button></div></div>`;
  $('#voucherModal').classList.remove('hidden');
  document.body.classList.add('drawer-open');
  $('#voucherModal').querySelector('.voucher-x').focus();
}
function syncModalLock() {
  const anyOpen = !$('#drawer').classList.contains('hidden') || !$('#voucherModal').classList.contains('hidden');
  document.body.classList.toggle('drawer-open', anyOpen);
}
function closeVoucher() {
  if ($('#voucherModal').classList.contains('hidden')) return;
  $('#voucherModal').classList.add('hidden');
  syncModalLock();
  if (lastFocusedElement && document.contains(lastFocusedElement)) lastFocusedElement.focus();
}
async function savePayroll(action) {
  const bonus = Math.max(0, Number($('#bonus').value || 0));
  const penalty = Math.max(0, Number($('#penalty').value || 0));
  if (action === 'submit' && state.payroll.valid) {
    state.payrollAdjustments[state.payrollId] = { bonus, penalty };
    const p = state.payroll;
    try {
      const gross = p.classes.reduce((sum, row) => sum + Number(row.amount || 0), 0);
      const total = Number(p.base_salary || 0) + Number(p.allowance ?? gross) + bonus - penalty;
      const saved = await apiJSON('/api/payroll/submit', { method: 'POST', body: JSON.stringify({ staff_id: p.staff.id, period_from: p.from, period_to: p.to, base_salary: p.base_salary, allowance: p.allowance, bonus, deduction: penalty, total, classes: p.classes.map(row => ({ description: row.name, shifts: row.shifts, hours: row.hours, rate: row.salary.rate, amount: row.amount })), details: { staff_name: p.staff.full_name } }) });
      state.salarySubmissions = [...state.salarySubmissions.filter(item => !(Number(item.staff_id) === Number(p.staff.id) && item.period_from === p.from && item.period_to === p.to)), saved];
      state.submittedStaff[state.payrollId] = true;
      state.payroll = payrollFromBackend({ ...saved, staff: p.staff }, state.payrollId);
      renderPayroll('Đã Submit và lưu bảng lương vào cơ sở dữ liệu. Bạn có thể gửi email bảng lương.');
    } catch (error) { renderPayroll(`Không thể lưu bảng lương: ${error.message}`); }
  } else if (action === 'email' && state.submittedStaff[state.payrollId]) {
    const submission = submissionFor(state.payrollId);
    if (!submission) {
      renderPayroll('Không tìm thấy bản ghi bảng lương đã Submit.');
      return;
    }
    try {
      const result = await apiJSON(`/api/payroll/${encodeURIComponent(submission.id)}/email`, { method: 'POST' });
      state.emailSent[state.payrollId] = result.status === 'sent';
      state.emailMessages[state.payrollId] = result.message || 'Đã gửi bảng lương thật.';
      renderPayroll(result.message || 'Đã gửi bảng lương thật.');
    } catch (error) {
      renderPayroll(`Không thể gửi email thật: ${error.message}`);
    }
  } else if (action === 'check') {
    state.payroll = virtualPayroll(state.payrollId);
    renderPayroll('Đã kiểm tra lại dữ liệu chấm công.');
  }
}

function closeDrawer() {
  if ($('#drawer').classList.contains('hidden')) return;
  $('#drawer').classList.add('hidden');
  syncModalLock();
  if (lastFocusedElement && document.contains(lastFocusedElement)) lastFocusedElement.focus();
}

$('#reportToggle').addEventListener('click', () => {
  const section = $('.nav-section');
  const open = section.classList.toggle('open');
  $('#reportToggle').setAttribute('aria-expanded', String(open));
  $('#reportSubnav').hidden = !open;
});
$('#reportSubnav').hidden = !$('.nav-section').classList.contains('open');
$('#mobileMenuButton').addEventListener('click', () => {
  const expanded = $('#mobileMenuButton').getAttribute('aria-expanded') === 'true';
  $('#mobileMenuButton').setAttribute('aria-expanded', String(!expanded));
  $('.sidebar').classList.toggle('mobile-open', !expanded);
});
$('.main-shell').addEventListener('click', event => {
  if (event.target.closest('#mobileMenuButton')) return;
  $('#mobileMenuButton').setAttribute('aria-expanded', 'false');
  $('.sidebar').classList.remove('mobile-open');
});
document.addEventListener('click', event => {
  if (!$('.sidebar').classList.contains('mobile-open')) return;
  if (event.target.closest('.sidebar') || event.target.closest('#mobileMenuButton')) return;
  $('#mobileMenuButton').setAttribute('aria-expanded', 'false');
  $('.sidebar').classList.remove('mobile-open');
});
$('#filterButton').addEventListener('click', loadAll);
$('#resetButton').addEventListener('click', () => { $('#search').value = ''; state.search = ''; $('#fromDate').value = DEFAULT_FROM; $('#toDate').value = DEFAULT_TO; loadAll(); });
$('#search').addEventListener('input', (event) => { state.search = event.target.value; if (state.grid) renderAttendance(state.grid, state.grid.from, state.grid.to); });
$('#attendanceTable').addEventListener('click', (event) => { const button = event.target.closest('[data-salary-id]'); if (button) openPayroll(Number(button.dataset.salaryId)); });
$('#detail').addEventListener('click', (event) => { const button = event.target.closest('[data-action]'); if (button && !button.disabled) savePayroll(button.dataset.action); });
$('#detail').addEventListener('change', (event) => {
  const select = event.target.closest('[data-salary-class]');
  if (!select) return;
  state.salarySelections[state.payrollId] = { ...(state.salarySelections[state.payrollId] || {}), [select.dataset.salaryClass]: Number(select.value) };
  state.payroll.classes.forEach((row, index) => {
    if (index !== Number(select.dataset.salaryClass)) return;
    row.selected = Number(select.value);
    row.salary = row.options[row.selected];
    row.amount = row.salary.mode === 'fixed' ? row.salary.rate : row.salary.rate * Number(row.shifts || 0);
  });
  state.payroll.allowance = state.payroll.classes.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  state.payroll.total = state.payroll.base_salary + state.payroll.allowance + state.payroll.bonus - state.payroll.penalty;
  renderPayroll();
});
$('#detail').addEventListener('input', (event) => {
  if (event.target.id === 'bonus' || event.target.id === 'penalty') {
    const p = state.payroll;
    p.bonus = Math.max(0, Number($('#bonus').value || 0));
    p.penalty = Math.max(0, Number($('#penalty').value || 0));
    state.payrollAdjustments[state.payrollId] = { bonus: p.bonus, penalty: p.penalty };
    p.total = Number(p.base_salary || 0) + Number(p.allowance || 0) + p.bonus - p.penalty;
    $('#payrollTotal').textContent = money(p.total);
    return;
  }
  if (event.target.id !== 'payrollSearch') return;
  const query = event.target.value.toLowerCase();
  $$('.payroll-staff').forEach(button => { button.classList.toggle('hidden', !button.textContent.toLowerCase().includes(query)); });
});
$('#detail').addEventListener('click', (event) => { const staffButton = event.target.closest('[data-staff-id]'); if (staffButton) openPayroll(Number(staffButton.dataset.staffId)); });
$('#closeDrawer').addEventListener('click', closeDrawer);
$('#drawer').addEventListener('click', (event) => { if (event.target.dataset.close) closeDrawer(); });
$('#salarySearch').addEventListener('input', () => { renderSalaryReport(); renderExpenseReport(); });
$('#salaryFilterButton').addEventListener('click', () => loadSalaryReport());
$('#salaryResetButton').addEventListener('click', () => { $('#salarySearch').value = ''; $('#salaryFrom').value = DEFAULT_FROM; $('#salaryTo').value = DEFAULT_TO; loadSalaryReport(); });
function printReport(target) {
  document.body.dataset.printTarget = target;
  window.print();
}
// Browser-menu printing uses the open voucher or the currently selected report.
window.addEventListener('beforeprint', () => {
  if (document.body.dataset.printTarget) return;
  if (!$('#voucherModal').classList.contains('hidden')) document.body.dataset.printTarget = 'voucher';
  else if (!$('#salaryView').classList.contains('hidden')) document.body.dataset.printTarget = state.salaryTab;
});
window.addEventListener('afterprint', () => { delete document.body.dataset.printTarget; });
$('#salaryPrintButton').addEventListener('click', () => printReport('payroll'));
$$('[data-salary-tab]').forEach(tab => tab.addEventListener('click', () => {
  state.salaryTab = tab.dataset.salaryTab;
  $$('[data-salary-tab]').forEach(item => {
    const active = item === tab;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
  });
  $('#payrollReportCard').classList.toggle('hidden', state.salaryTab !== 'payroll');
  $('#expensesCard').classList.toggle('hidden', state.salaryTab !== 'expenses');
}));
$$('[data-salary-tab]').forEach(tab => tab.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const tabs = $$('[data-salary-tab]');
  const currentIndex = Array.from(document.querySelectorAll('[data-salary-tab]')).indexOf(event.currentTarget);
  const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (currentIndex + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
  tabs[index].click();
  tabs[index].focus();
}));
$('#salaryTable').addEventListener('click', event => {
  const payButton = event.target.closest('[data-pay-staff]');
  if (payButton) return paySalary(Number(payButton.dataset.payStaff));
  const voucherButton = event.target.closest('[data-voucher-id]');
  if (voucherButton) {
    const voucher = state.paymentVouchers.find(item => Number(item.id) === Number(voucherButton.dataset.voucherId));
    if (voucher) openVoucher({ ...voucher, expense_date: voucher.payment_date, payee: staffById(voucher.staff_id)?.full_name });
  }
});
$('#expensesTable').addEventListener('click', event => {
  const button = event.target.closest('[data-expense-id]');
  if (!button) return;
  const voucher = state.expenses.find(item => Number(item.id) === Number(button.dataset.expenseId));
  if (voucher) openVoucher(voucher);
});
$('#closeVoucher').addEventListener('click', closeVoucher);
$('#voucherModal').addEventListener('click', event => { if (event.target.dataset.closeVoucher) closeVoucher(); if (event.target.dataset.voucherPrint) printReport('voucher'); });
document.addEventListener('keydown', (event) => {
  const dialog = !$('#voucherModal').classList.contains('hidden') ? $('#voucherModal') : !$('#drawer').classList.contains('hidden') ? $('#drawer') : null;
  if (!dialog) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    if (dialog.id === 'voucherModal') closeVoucher(); else closeDrawer();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')].filter(node => node.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0]; const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
$$('[data-view]').forEach(item => item.addEventListener('click', (event) => {
  event.preventDefault();
  $$('[data-view]').forEach(nav => nav.classList.remove('active'));
  item.classList.add('active');
  $$('[data-view]').forEach(nav => nav.removeAttribute('aria-current'));
  item.setAttribute('aria-current', 'page');
  const view = item.dataset.view;
  const attendance = view === 'attendance';
  const salary = view === 'salary';
  $('#attendanceView').classList.toggle('hidden', !attendance);
  $('#salaryView').classList.toggle('hidden', !salary);
  $('#updateView').classList.toggle('hidden', attendance || salary);
  $('#breadcrumbTitle').textContent = attendance ? 'Bảng chấm công' : item.textContent.trim();
  $('#mobileMenuButton').setAttribute('aria-expanded', 'false');
  $('.sidebar').classList.remove('mobile-open');
  if (salary) loadSalaryReport();
}));
(async () => { await resetDemoData(); await loadAll(); })();

