# Dữ liệu kiểm thử được tạo

Đây là bản xem đầy đủ; các file CSV tương ứng có thể mở bằng Excel/Google Sheets.

## `staff` (4 dòng)

| id | full_name | role |
| --- | --- | --- |
| 2 | GV Thảo | teacher |
| 3 | GV Minh | teacher |
| 4 | NV Linh | staff |
| 5 | Mgr Hùng | manager |

## `salary_types` (7 dòng)

| id | name | type | amount | unit | description |
| --- | --- | --- | --- | --- | --- |
| 1 | Lương cơ bản GV chính thức | fixed | 8000000 | VND/tháng | Giáo viên chính thức |
| 2 | Lương cơ bản GV thỉnh giảng | fixed | 5000000 | VND/tháng | Giáo viên thỉnh giảng |
| 3 | Hoa hồng theo học phí | percentage | 30 | % | Tính theo học phí |
| 4 | Phụ cấp dạy thêm theo ca | per_shift | 200000 | VND/ca | Dạy thêm theo ca |
| 5 | Lương gia sư theo giờ | per_hour | 150000 | VND/giờ | Tính theo giờ |
| 6 | Lương nhân viên hành chính | fixed | 6000000 | VND/tháng | Nhân viên hành chính |
| 7 | Phụ cấp quản lý | fixed | 2000000 | VND/tháng | Phụ cấp quản lý |

## `staff_shifts` (93 dòng)

| id | staff_id | shift_date | shift_code | start_time | end_time | source |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2 | 2026-10-01 | morning | 08:00 | 12:00 | schedule |
| 2 | 4 | 2026-10-01 | admin | 08:30 | 17:30 | schedule |
| 3 | 5 | 2026-10-01 | admin | 08:30 | 17:30 | schedule |
| 4 | 2 | 2026-10-01 | evening | 18:00 | 21:00 | schedule |
| 5 | 3 | 2026-10-01 | afternoon | 13:30 | 17:30 | schedule |
| 6 | 2 | 2026-10-02 | morning | 08:00 | 12:00 | schedule |
| 7 | 4 | 2026-10-02 | admin | 08:30 | 17:30 | schedule |
| 8 | 5 | 2026-10-02 | admin | 08:30 | 17:30 | schedule |
| 9 | 3 | 2026-10-03 | morning | 08:00 | 12:00 | schedule |
| 10 | 3 | 2026-10-04 | sunday_afternoon | 13:30 | 17:30 | schedule |
| 11 | 2 | 2026-10-05 | morning | 08:00 | 12:00 | schedule |
| 12 | 4 | 2026-10-05 | admin | 08:30 | 17:30 | schedule |
| 13 | 5 | 2026-10-05 | admin | 08:30 | 17:30 | schedule |
| 14 | 2 | 2026-10-06 | morning | 08:00 | 12:00 | schedule |
| 15 | 4 | 2026-10-06 | admin | 08:30 | 17:30 | schedule |
| 16 | 5 | 2026-10-06 | admin | 08:30 | 17:30 | schedule |
| 17 | 2 | 2026-10-06 | evening | 18:00 | 21:00 | schedule |
| 18 | 3 | 2026-10-06 | afternoon | 13:30 | 17:30 | schedule |
| 19 | 2 | 2026-10-07 | morning | 08:00 | 12:00 | schedule |
| 20 | 4 | 2026-10-07 | admin | 08:30 | 17:30 | schedule |
| 21 | 5 | 2026-10-07 | admin | 08:30 | 17:30 | schedule |
| 22 | 2 | 2026-10-08 | morning | 08:00 | 12:00 | schedule |
| 23 | 4 | 2026-10-08 | admin | 08:30 | 17:30 | schedule |
| 24 | 5 | 2026-10-08 | admin | 08:30 | 17:30 | schedule |
| 25 | 2 | 2026-10-08 | evening | 18:00 | 21:00 | schedule |
| 26 | 3 | 2026-10-08 | afternoon | 13:30 | 17:30 | schedule |
| 27 | 2 | 2026-10-09 | morning | 08:00 | 12:00 | schedule |
| 28 | 4 | 2026-10-09 | admin | 08:30 | 17:30 | schedule |
| 29 | 5 | 2026-10-09 | admin | 08:30 | 17:30 | schedule |
| 30 | 3 | 2026-10-10 | morning | 08:00 | 12:00 | schedule |
| 31 | 3 | 2026-10-11 | sunday_afternoon | 13:30 | 17:30 | schedule |
| 32 | 2 | 2026-10-12 | morning | 08:00 | 12:00 | schedule |
| 33 | 4 | 2026-10-12 | admin | 08:30 | 17:30 | schedule |
| 34 | 5 | 2026-10-12 | admin | 08:30 | 17:30 | schedule |
| 35 | 2 | 2026-10-13 | morning | 08:00 | 12:00 | schedule |
| 36 | 4 | 2026-10-13 | admin | 08:30 | 17:30 | schedule |
| 37 | 5 | 2026-10-13 | admin | 08:30 | 17:30 | schedule |
| 38 | 2 | 2026-10-13 | evening | 18:00 | 21:00 | schedule |
| 39 | 3 | 2026-10-13 | afternoon | 13:30 | 17:30 | schedule |
| 40 | 2 | 2026-10-14 | morning | 08:00 | 12:00 | schedule |
| 41 | 4 | 2026-10-14 | admin | 08:30 | 17:30 | schedule |
| 42 | 5 | 2026-10-14 | admin | 08:30 | 17:30 | schedule |
| 43 | 2 | 2026-10-15 | morning | 08:00 | 12:00 | schedule |
| 44 | 4 | 2026-10-15 | admin | 08:30 | 17:30 | schedule |
| 45 | 5 | 2026-10-15 | admin | 08:30 | 17:30 | schedule |
| 46 | 2 | 2026-10-15 | evening | 18:00 | 21:00 | schedule |
| 47 | 3 | 2026-10-15 | afternoon | 13:30 | 17:30 | schedule |
| 48 | 2 | 2026-10-16 | morning | 08:00 | 12:00 | schedule |
| 49 | 4 | 2026-10-16 | admin | 08:30 | 17:30 | schedule |
| 50 | 5 | 2026-10-16 | admin | 08:30 | 17:30 | schedule |
| 51 | 3 | 2026-10-17 | morning | 08:00 | 12:00 | schedule |
| 52 | 3 | 2026-10-18 | sunday_afternoon | 13:30 | 17:30 | schedule |
| 53 | 2 | 2026-10-19 | morning | 08:00 | 12:00 | schedule |
| 54 | 4 | 2026-10-19 | admin | 08:30 | 17:30 | schedule |
| 55 | 5 | 2026-10-19 | admin | 08:30 | 17:30 | schedule |
| 56 | 2 | 2026-10-20 | morning | 08:00 | 12:00 | schedule |
| 57 | 4 | 2026-10-20 | admin | 08:30 | 17:30 | schedule |
| 58 | 5 | 2026-10-20 | admin | 08:30 | 17:30 | schedule |
| 59 | 2 | 2026-10-20 | evening | 18:00 | 21:00 | schedule |
| 60 | 3 | 2026-10-20 | afternoon | 13:30 | 17:30 | schedule |
| 61 | 2 | 2026-10-21 | morning | 08:00 | 12:00 | schedule |
| 62 | 4 | 2026-10-21 | admin | 08:30 | 17:30 | schedule |
| 63 | 5 | 2026-10-21 | admin | 08:30 | 17:30 | schedule |
| 64 | 2 | 2026-10-22 | morning | 08:00 | 12:00 | schedule |
| 65 | 4 | 2026-10-22 | admin | 08:30 | 17:30 | schedule |
| 66 | 5 | 2026-10-22 | admin | 08:30 | 17:30 | schedule |
| 67 | 2 | 2026-10-22 | evening | 18:00 | 21:00 | schedule |
| 68 | 3 | 2026-10-22 | afternoon | 13:30 | 17:30 | schedule |
| 69 | 2 | 2026-10-23 | morning | 08:00 | 12:00 | schedule |
| 70 | 4 | 2026-10-23 | admin | 08:30 | 17:30 | schedule |
| 71 | 5 | 2026-10-23 | admin | 08:30 | 17:30 | schedule |
| 72 | 3 | 2026-10-24 | morning | 08:00 | 12:00 | schedule |
| 73 | 3 | 2026-10-25 | sunday_afternoon | 13:30 | 17:30 | schedule |
| 74 | 2 | 2026-10-26 | morning | 08:00 | 12:00 | schedule |
| 75 | 4 | 2026-10-26 | admin | 08:30 | 17:30 | schedule |
| 76 | 5 | 2026-10-26 | admin | 08:30 | 17:30 | schedule |
| 77 | 2 | 2026-10-27 | morning | 08:00 | 12:00 | schedule |
| 78 | 4 | 2026-10-27 | admin | 08:30 | 17:30 | schedule |
| 79 | 5 | 2026-10-27 | admin | 08:30 | 17:30 | schedule |
| 80 | 2 | 2026-10-27 | evening | 18:00 | 21:00 | schedule |
| 81 | 3 | 2026-10-27 | afternoon | 13:30 | 17:30 | schedule |
| 82 | 2 | 2026-10-28 | morning | 08:00 | 12:00 | schedule |
| 83 | 4 | 2026-10-28 | admin | 08:30 | 17:30 | schedule |
| 84 | 5 | 2026-10-28 | admin | 08:30 | 17:30 | schedule |
| 85 | 2 | 2026-10-29 | morning | 08:00 | 12:00 | schedule |
| 86 | 4 | 2026-10-29 | admin | 08:30 | 17:30 | schedule |
| 87 | 5 | 2026-10-29 | admin | 08:30 | 17:30 | schedule |
| 88 | 2 | 2026-10-29 | evening | 18:00 | 21:00 | schedule |
| 89 | 3 | 2026-10-29 | afternoon | 13:30 | 17:30 | schedule |
| 90 | 2 | 2026-10-30 | morning | 08:00 | 12:00 | schedule |
| 91 | 4 | 2026-10-30 | admin | 08:30 | 17:30 | schedule |
| 92 | 5 | 2026-10-30 | admin | 08:30 | 17:30 | schedule |
| 93 | 3 | 2026-10-31 | morning | 08:00 | 12:00 | schedule |

## `staff_attendance` (91 dòng)

| id | staff_id | attendance_date | checkin_at | checkout_at | checkin_source | checkout_source | status | note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2 | 2026-10-01 | 2026-10-01 08:20:00 | 2026-10-01 12:00:00 | camera | camera | late | Đi muộn 20 phút |
| 2 | 4 | 2026-10-01 | 2026-10-01 08:30:00 | 2026-10-01 17:30:00 | manual | manual | on_time |  |
| 3 | 5 | 2026-10-01 | 2026-10-01 08:30:00 | 2026-10-01 17:30:00 | camera | camera | on_time |  |
| 4 | 3 | 2026-10-01 | 2026-10-01 13:30:00 | 2026-10-01 17:30:00 | manual | manual | on_time |  |
| 5 | 2 | 2026-10-02 | 2026-10-02 08:00:00 | 2026-10-02 12:00:00 | camera | camera | on_time |  |
| 6 | 4 | 2026-10-02 | 2026-10-02 08:30:00 | 2026-10-02 17:30:00 | camera | camera | on_time |  |
| 7 | 5 | 2026-10-02 | 2026-10-02 08:30:00 | 2026-10-02 17:30:00 | camera | camera | on_time |  |
| 8 | 3 | 2026-10-03 | 2026-10-03 13:30:00 | 2026-10-03 17:30:00 | manual | manual | on_time |  |
| 9 | 3 | 2026-10-04 | 2026-10-04 13:30:00 | 2026-10-04 17:30:00 | manual | manual | on_time |  |
| 10 | 2 | 2026-10-05 | 2026-10-05 08:05:00 | 2026-10-05 12:00:00 | camera | camera | late | Đi muộn 5 phút |
| 11 | 4 | 2026-10-05 | 2026-10-05 08:30:00 | 2026-10-05 17:30:00 | camera | camera | on_time |  |
| 12 | 5 | 2026-10-05 | 2026-10-05 08:30:00 | 2026-10-05 17:30:00 | camera | camera | on_time |  |
| 13 | 2 | 2026-10-06 | 2026-10-06 08:00:00 | 2026-10-06 12:00:00 | camera | camera | on_time |  |
| 14 | 4 | 2026-10-06 | 2026-10-06 08:30:00 | 2026-10-06 17:30:00 | camera | camera | on_time |  |
| 15 | 5 | 2026-10-06 | 2026-10-06 08:30:00 | 2026-10-06 17:30:00 | camera | camera | on_time |  |
| 16 | 3 | 2026-10-06 | 2026-10-06 13:30:00 | 2026-10-06 17:30:00 | manual | manual | on_time |  |
| 17 | 2 | 2026-10-07 | 2026-10-07 08:00:00 | 2026-10-07 12:00:00 | camera | camera | on_time |  |
| 18 | 4 | 2026-10-07 | 2026-10-07 08:30:00 | 2026-10-07 17:30:00 | manual | manual | on_time |  |
| 19 | 5 | 2026-10-07 | 2026-10-07 08:30:00 | 2026-10-07 17:30:00 | camera | camera | on_time |  |
| 20 | 2 | 2026-10-08 | 2026-10-08 08:00:00 | 2026-10-08 12:00:00 | camera | camera | on_time |  |
| 21 | 4 | 2026-10-08 | 2026-10-08 08:30:00 |  | camera | camera | incomplete | Chưa checkout |
| 22 | 5 | 2026-10-08 | 2026-10-08 08:30:00 | 2026-10-08 17:30:00 | camera | camera | on_time |  |
| 23 | 3 | 2026-10-08 | 2026-10-08 13:30:00 | 2026-10-08 17:30:00 | manual | manual | on_time |  |
| 24 | 2 | 2026-10-09 | 2026-10-09 08:05:00 | 2026-10-09 12:00:00 | camera | camera | late | Đi muộn 5 phút |
| 25 | 4 | 2026-10-09 | 2026-10-09 08:30:00 | 2026-10-09 16:45:00 | camera | camera | early_leave | Về sớm 45 phút |
| 26 | 5 | 2026-10-09 | 2026-10-09 08:30:00 | 2026-10-09 17:30:00 | camera | camera | on_time |  |
| 27 | 3 | 2026-10-10 | 2026-10-10 13:30:00 | 2026-10-10 17:30:00 | manual | manual | on_time |  |
| 28 | 3 | 2026-10-11 | 2026-10-11 13:30:00 | 2026-10-11 17:30:00 | manual | manual | on_time |  |
| 29 | 2 | 2026-10-12 | 2026-10-12 08:00:00 | 2026-10-12 12:00:00 | camera | camera | on_time |  |
| 30 | 4 | 2026-10-12 | 2026-10-12 08:30:00 | 2026-10-12 17:30:00 | camera | camera | on_time |  |
| 31 | 5 | 2026-10-12 | 2026-10-12 08:30:00 | 2026-10-12 17:30:00 | camera | camera | on_time |  |
| 32 | 2 | 2026-10-13 | 2026-10-13 08:05:00 | 2026-10-13 12:00:00 | camera | camera | late | Đi muộn 5 phút |
| 33 | 4 | 2026-10-13 | 2026-10-13 08:30:00 | 2026-10-13 17:30:00 | manual | manual | on_time |  |
| 34 | 5 | 2026-10-13 | 2026-10-13 08:30:00 | 2026-10-13 17:30:00 | camera | camera | on_time |  |
| 35 | 2 | 2026-10-14 | 2026-10-14 08:00:00 | 2026-10-14 12:00:00 | camera | camera | on_time |  |
| 36 | 4 | 2026-10-14 | 2026-10-14 08:30:00 | 2026-10-14 17:30:00 | camera | camera | on_time |  |
| 37 | 5 | 2026-10-14 | 2026-10-14 08:30:00 | 2026-10-14 17:30:00 | camera | camera | on_time |  |
| 38 | 2 | 2026-10-15 | 2026-10-15 08:00:00 | 2026-10-15 12:00:00 | camera | camera | on_time |  |
| 39 | 4 | 2026-10-15 | 2026-10-15 08:30:00 | 2026-10-15 17:30:00 | camera | camera | on_time |  |
| 40 | 5 | 2026-10-15 | 2026-10-15 08:30:00 | 2026-10-15 17:30:00 | camera | camera | on_time |  |
| 41 | 3 | 2026-10-15 | 2026-10-15 13:30:00 | 2026-10-15 17:30:00 | manual | manual | on_time |  |
| 42 | 2 | 2026-10-16 | 2026-10-16 08:00:00 | 2026-10-16 12:00:00 | camera | camera | on_time |  |
| 43 | 4 | 2026-10-16 | 2026-10-16 08:30:00 | 2026-10-16 17:30:00 | manual | manual | on_time |  |
| 44 | 5 | 2026-10-16 | 2026-10-16 08:30:00 | 2026-10-16 17:30:00 | camera | camera | on_time |  |
| 45 | 3 | 2026-10-17 | 2026-10-17 13:30:00 | 2026-10-17 17:30:00 | manual | manual | on_time |  |
| 46 | 3 | 2026-10-18 | 2026-10-18 13:30:00 | 2026-10-18 17:30:00 | manual | manual | on_time |  |
| 47 | 2 | 2026-10-19 | 2026-10-19 08:20:00 | 2026-10-19 12:00:00 | camera | camera | late | Đi muộn 20 phút |
| 48 | 4 | 2026-10-19 | 2026-10-19 08:30:00 | 2026-10-19 17:30:00 | manual | manual | on_time |  |
| 49 | 5 | 2026-10-19 | 2026-10-19 08:30:00 | 2026-10-19 17:30:00 | camera | camera | on_time |  |
| 50 | 2 | 2026-10-20 | 2026-10-20 08:00:00 | 2026-10-20 12:00:00 | camera | camera | on_time |  |
| 51 | 4 | 2026-10-20 | 2026-10-20 08:30:00 | 2026-10-20 17:30:00 | camera | camera | on_time |  |
| 52 | 5 | 2026-10-20 | 2026-10-20 08:30:00 | 2026-10-20 17:30:00 | camera | camera | on_time |  |
| 53 | 3 | 2026-10-20 | 2026-10-20 13:30:00 | 2026-10-20 17:30:00 | manual | manual | on_time |  |
| 54 | 2 | 2026-10-21 | 2026-10-21 08:05:00 | 2026-10-21 12:00:00 | camera | camera | late | Đi muộn 5 phút |
| 55 | 4 | 2026-10-21 | 2026-10-21 08:30:00 | 2026-10-21 17:30:00 | camera | camera | on_time |  |
| 56 | 5 | 2026-10-21 | 2026-10-21 08:30:00 | 2026-10-21 17:30:00 | camera | camera | on_time |  |
| 57 | 2 | 2026-10-22 | 2026-10-22 08:00:00 | 2026-10-22 12:00:00 | camera | camera | on_time |  |
| 58 | 4 | 2026-10-22 | 2026-10-22 08:30:00 |  | manual | manual | incomplete | Chưa checkout |
| 59 | 5 | 2026-10-22 | 2026-10-22 08:30:00 | 2026-10-22 17:30:00 | camera | camera | on_time |  |
| 60 | 2 | 2026-10-23 | 2026-10-23 08:00:00 | 2026-10-23 12:00:00 | camera | camera | on_time |  |
| 61 | 4 | 2026-10-23 | 2026-10-23 08:30:00 | 2026-10-23 17:30:00 | camera | camera | on_time |  |
| 62 | 5 | 2026-10-23 | 2026-10-23 08:30:00 | 2026-10-23 17:30:00 | camera | camera | on_time |  |
| 63 | 3 | 2026-10-24 | 2026-10-24 13:30:00 | 2026-10-24 17:30:00 | manual | manual | on_time |  |
| 64 | 3 | 2026-10-25 | 2026-10-25 13:30:00 | 2026-10-25 17:30:00 | manual | manual | on_time |  |
| 65 | 2 | 2026-10-26 | 2026-10-26 08:00:00 | 2026-10-26 12:00:00 | camera | camera | on_time |  |
| 66 | 4 | 2026-10-26 | 2026-10-26 08:30:00 | 2026-10-26 17:30:00 | camera | camera | on_time |  |
| 67 | 5 | 2026-10-26 | 2026-10-26 08:30:00 | 2026-10-26 17:30:00 | camera | camera | on_time |  |
| 68 | 2 | 2026-10-27 | 2026-10-27 08:00:00 | 2026-10-27 12:00:00 | camera | camera | on_time |  |
| 69 | 4 | 2026-10-27 | 2026-10-27 08:30:00 | 2026-10-27 17:30:00 | camera | camera | on_time |  |
| 70 | 5 | 2026-10-27 | 2026-10-27 08:30:00 | 2026-10-27 17:30:00 | camera | camera | on_time |  |
| 71 | 3 | 2026-10-27 | 2026-10-27 13:30:00 | 2026-10-27 17:30:00 | manual | manual | on_time |  |
| 72 | 2 | 2026-10-28 | 2026-10-28 08:20:00 | 2026-10-28 12:00:00 | camera | camera | late | Đi muộn 20 phút |
| 73 | 4 | 2026-10-28 | 2026-10-28 08:30:00 | 2026-10-28 17:30:00 | manual | manual | on_time |  |
| 74 | 5 | 2026-10-28 | 2026-10-28 08:30:00 | 2026-10-28 17:30:00 | camera | camera | on_time |  |
| 75 | 2 | 2026-10-29 | 2026-10-29 08:05:00 | 2026-10-29 12:00:00 | camera | camera | late | Đi muộn 5 phút |
| 76 | 4 | 2026-10-29 | 2026-10-29 08:30:00 | 2026-10-29 17:30:00 | camera | camera | on_time |  |
| 77 | 5 | 2026-10-29 | 2026-10-29 08:30:00 | 2026-10-29 17:30:00 | camera | camera | on_time |  |
| 78 | 3 | 2026-10-29 | 2026-10-29 13:30:00 | 2026-10-29 17:30:00 | manual | manual | on_time |  |
| 79 | 2 | 2026-10-30 | 2026-10-30 08:00:00 | 2026-10-30 12:00:00 | camera | camera | on_time |  |
| 80 | 4 | 2026-10-30 | 2026-10-30 08:30:00 | 2026-10-30 17:30:00 | camera | camera | on_time |  |
| 81 | 5 | 2026-10-30 | 2026-10-30 08:30:00 | 2026-10-30 17:30:00 | camera | camera | on_time |  |
| 82 | 3 | 2026-10-31 | 2026-10-31 13:30:00 | 2026-10-31 17:30:00 | manual | manual | on_time |  |
| 83 | 2 | 2026-10-01 | 2026-10-01 18:00:00 | 2026-10-01 21:00:00 | manual | manual | on_time | Bổ sung dữ liệu demo |
| 84 | 2 | 2026-10-06 | 2026-10-06 18:00:00 | 2026-10-06 21:00:00 | manual | manual | on_time | Bổ sung dữ liệu demo |
| 85 | 2 | 2026-10-08 | 2026-10-08 18:00:00 | 2026-10-08 21:00:00 | manual | manual | on_time | Bổ sung dữ liệu demo |
| 86 | 2 | 2026-10-13 | 2026-10-13 18:00:00 | 2026-10-13 21:00:00 | manual | manual | on_time | Bổ sung dữ liệu demo |
| 87 | 2 | 2026-10-15 | 2026-10-15 18:00:00 | 2026-10-15 21:00:00 | manual | manual | on_time | Bổ sung dữ liệu demo |
| 88 | 2 | 2026-10-20 | 2026-10-20 18:00:00 | 2026-10-20 21:00:00 | manual | manual | on_time | Bổ sung dữ liệu demo |
| 89 | 2 | 2026-10-22 | 2026-10-22 18:00:00 | 2026-10-22 21:00:00 | manual | manual | on_time | Bổ sung dữ liệu demo |
| 90 | 2 | 2026-10-27 | 2026-10-27 18:00:00 | 2026-10-27 21:00:00 | manual | manual | on_time | Bổ sung dữ liệu demo |
| 91 | 2 | 2026-10-29 | 2026-10-29 18:00:00 | 2026-10-29 21:00:00 | manual | manual | on_time | Bổ sung dữ liệu demo |

## `transactions` (5 dòng)

| id | staff_id | category | amount | transaction_date | description |
| --- | --- | --- | --- | --- | --- |
| 1 | 2 | salary | 8000000 | 2026-10-31 | Chi lương tháng 10 - GV Thảo |
| 2 | 3 | salary | 5000000 | 2026-10-31 | Chi lương tháng 10 - GV Minh |
| 3 | 4 | salary | 6000000 | 2026-10-31 | Chi lương tháng 10 - NV Linh |
| 4 | 5 | salary | 8000000 | 2026-10-31 | Lương cơ bản + phụ cấp quản lý - Mgr Hùng |
| 5 | 2 | salary | 200000 | 2026-10-31 | Phụ cấp dạy thêm theo ca |

