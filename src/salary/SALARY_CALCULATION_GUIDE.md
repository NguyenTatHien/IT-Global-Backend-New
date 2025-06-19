# Hướng dẫn tính lương theo loại nhân viên

## Tổng quan

Hệ thống tính lương được cải tiến để xử lý khác nhau cho từng loại nhân viên:

-   **Nhân viên chính thức** (`official`)
-   **Nhân viên hợp đồng** (`contract`)
-   **Thực tập sinh** (`intern`)

## 1. Nhân viên chính thức (Official)

### Công thức tính lương:

```
Tổng lương = Lương cơ bản + Lương làm thêm giờ + Phụ cấp + Thưởng - Khấu trừ
```

### Chi tiết:

-   **Lương cơ bản**: `user.salary` (VD: 15,000,000 VNĐ/tháng)
-   **Lương làm thêm giờ**:
    -   Hệ số: 1.5
    -   Công thức: `Số giờ làm thêm × (Lương cơ bản ÷ (8 × 22)) × 1.5`
-   **Phụ cấp**: `user.allowance` (VD: 500,000 VNĐ/tháng)
-   **Thưởng**: `user.bonus` + bonus thêm
-   **Khấu trừ**:
    -   Đi muộn: 50,000 VNĐ/lần
    -   Vắng mặt: 200,000 VNĐ/lần
    -   Về sớm: 30,000 VNĐ/lần

### Ví dụ:

```
Lương cơ bản: 15,000,000 VNĐ
Làm thêm giờ: 10 giờ × (15,000,000 ÷ 176) × 1.5 = 1,278,409 VNĐ
Phụ cấp: 500,000 VNĐ
Thưởng: 1,000,000 VNĐ
Khấu trừ: 100,000 VNĐ (2 lần đi muộn)
Tổng lương: 17,678,409 VNĐ
```

## 2. Nhân viên hợp đồng (Contract)

### Công thức tính lương:

```
Tổng lương = Lương cơ bản + Lương làm thêm giờ + Phụ cấp + Thưởng - Khấu trừ
```

### Chi tiết:

-   **Lương cơ bản**: `user.salary` (VD: 12,000,000 VNĐ/tháng)
-   **Lương làm thêm giờ**:
    -   Hệ số: 1.2 (thấp hơn nhân viên chính thức)
    -   Công thức: `Số giờ làm thêm × (Lương cơ bản ÷ (8 × 22)) × 1.2`
-   **Phụ cấp**: `user.allowance` (VD: 300,000 VNĐ/tháng)
-   **Thưởng**: `user.bonus` + bonus thêm
-   **Khấu trừ**: Giống nhân viên chính thức

### Ví dụ:

```
Lương cơ bản: 12,000,000 VNĐ
Làm thêm giờ: 10 giờ × (12,000,000 ÷ 176) × 1.2 = 818,182 VNĐ
Phụ cấp: 300,000 VNĐ
Thưởng: 500,000 VNĐ
Khấu trừ: 50,000 VNĐ (1 lần đi muộn)
Tổng lương: 13,568,182 VNĐ
```

## 3. Thực tập sinh (Intern)

### Công thức tính lương:

```
Tổng lương = Trợ cấp thực tập + Thưởng - Khấu trừ
```

### Chi tiết:

-   **Lương cơ bản**: 0 VNĐ (thực tập sinh không có lương cơ bản)
-   **Lương làm thêm giờ**: 0 VNĐ (không được tính)
-   **Trợ cấp thực tập**: `user.allowance` (VD: 3,000,000 VNĐ/tháng)
-   **Thưởng**: `user.bonus` + bonus thêm
-   **Khấu trừ** (giảm 50% so với nhân viên chính thức):
    -   Đi muộn: 20,000 VNĐ/lần
    -   Vắng mặt: 100,000 VNĐ/lần
    -   Về sớm: 15,000 VNĐ/lần

### Ví dụ:

```
Lương cơ bản: 0 VNĐ
Làm thêm giờ: 0 VNĐ
Trợ cấp thực tập: 3,000,000 VNĐ
Thưởng: 200,000 VNĐ
Khấu trừ: 40,000 VNĐ (2 lần đi muộn)
Tổng lương: 3,160,000 VNĐ
```

## 4. So sánh các loại nhân viên

| Tiêu chí     | Nhân viên chính thức | Nhân viên hợp đồng | Thực tập sinh    |
| ------------ | -------------------- | ------------------ | ---------------- |
| Lương cơ bản | Có                   | Có                 | Không            |
| Làm thêm giờ | Hệ số 1.5            | Hệ số 1.2          | Không            |
| Phụ cấp      | Có                   | Có                 | Trợ cấp thực tập |
| Khấu trừ     | 100%                 | 100%               | 50%              |
| Bảo hiểm     | Đầy đủ               | Theo hợp đồng      | Không            |

## 5. Cấu hình trong database

### User Schema:

```typescript
{
  employeeType: 'official' | 'contract' | 'intern',
  salary: number,        // Lương cơ bản
  allowance: number,     // Phụ cấp/Trợ cấp
  bonus: number          // Thưởng
}
```

### Ví dụ dữ liệu:

```javascript
// Nhân viên chính thức
{
  employeeType: 'official',
  salary: 15000000,
  allowance: 500000,
  bonus: 1000000
}

// Nhân viên hợp đồng
{
  employeeType: 'contract',
  salary: 12000000,
  allowance: 300000,
  bonus: 500000
}

// Thực tập sinh
{
  employeeType: 'intern',
  salary: 0,
  allowance: 3000000,  // Trợ cấp thực tập
  bonus: 200000
}
```

## 6. Lưu ý quan trọng

1. **Thực tập sinh không được tính lương làm thêm giờ**
2. **Mức khấu trừ của thực tập sinh giảm 50%**
3. **Nhân viên hợp đồng có hệ số làm thêm giờ thấp hơn**
4. **Tất cả đều dựa trên dữ liệu chấm công thực tế**
5. **Có thể điều chỉnh bonus và deduction thủ công**

## 7. API Endpoints

-   `POST /salary` - Tạo bảng lương cho 1 nhân viên
-   `POST /salary/all` - Tạo bảng lương cho tất cả nhân viên
-   `GET /salary` - Xem danh sách bảng lương
-   `PATCH /salary/:id` - Cập nhật bảng lương
-   `PATCH /salary/:id/status` - Duyệt/từ chối bảng lương
