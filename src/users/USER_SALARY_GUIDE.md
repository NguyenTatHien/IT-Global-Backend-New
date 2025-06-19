# Hướng dẫn quản lý thông tin lương trong module Users

## Tổng quan

Module Users đã được cải tiến để hỗ trợ quản lý thông tin lương khi tạo và cập nhật user. Hệ thống sẽ tự động thiết lập giá trị lương mặc định theo loại nhân viên.

## 1. Các trường lương mới

### CreateUserDto và UpdateUserDto

```typescript
{
  // Các trường cơ bản...
  employeeType: 'official' | 'contract' | 'intern',

  // Các trường lương (tùy chọn)
  salary?: number;      // Lương cơ bản
  allowance?: number;   // Phụ cấp/Trợ cấp
  bonus?: number;       // Thưởng
}
```

## 2. Giá trị mặc định theo loại nhân viên

### Khi tạo user mới:

#### **Nhân viên chính thức (Official)**

```typescript
{
  employeeType: 'official',
  salary: 15000000,     // 15 triệu VNĐ
  allowance: 500000,    // 500k VNĐ
  bonus: 1000000        // 1 triệu VNĐ
}
```

#### **Nhân viên hợp đồng (Contract)**

```typescript
{
  employeeType: 'contract',
  salary: 12000000,     // 12 triệu VNĐ
  allowance: 300000,    // 300k VNĐ
  bonus: 500000         // 500k VNĐ
}
```

#### **Thực tập sinh (Intern)**

```typescript
{
  employeeType: 'intern',
  salary: 0,            // Không có lương cơ bản
  allowance: 3000000,   // 3 triệu VNĐ (trợ cấp thực tập)
  bonus: 200000         // 200k VNĐ
}
```

## 3. API Endpoints

### Tạo user mới với thông tin lương

```http
POST /users
Content-Type: multipart/form-data

{
  "name": "Nguyễn Văn A",
  "email": "nguyenvana@company.com",
  "password": "123456",
  "age": 25,
  "gender": "male",
  "address": "{\"city\":\"Hà Nội\",\"district\":\"Cầu Giấy\",\"ward\":\"Dịch Vọng\",\"detail\":\"123 ABC\"}",
  "department": "64f1a2b3c4d5e6f7g8h9i0j1",
  "role": "64f1a2b3c4d5e6f7g8h9i0j2",
  "employeeType": "official",
  "salary": 18000000,      // Tùy chọn: ghi đè giá trị mặc định
  "allowance": 800000,     // Tùy chọn: ghi đè giá trị mặc định
  "bonus": 1500000         // Tùy chọn: ghi đè giá trị mặc định
}
```

### Cập nhật thông tin lương

```http
PATCH /users/:id
Content-Type: application/json

{
  "employeeType": "contract",  // Thay đổi loại nhân viên
  "salary": 14000000,          // Cập nhật lương cơ bản
  "allowance": 400000,         // Cập nhật phụ cấp
  "bonus": 800000              // Cập nhật thưởng
}
```

## 4. Logic tự động điều chỉnh lương

### Khi thay đổi loại nhân viên:

-   **Official → Contract**: Lương giảm từ 15M → 12M, phụ cấp giảm từ 500k → 300k
-   **Contract → Intern**: Lương giảm từ 12M → 0, phụ cấp tăng từ 300k → 3M
-   **Intern → Official**: Lương tăng từ 0 → 15M, phụ cấp giảm từ 3M → 500k

### Ví dụ cập nhật:

```typescript
// User hiện tại: Official với lương 15M
{
  employeeType: 'official',
  salary: 15000000,
  allowance: 500000,
  bonus: 1000000
}

// Cập nhật thành Contract
PATCH /users/123
{
  "employeeType": "contract"
}

// Kết quả: Tự động điều chỉnh
{
  employeeType: 'contract',
  salary: 12000000,     // Tự động giảm
  allowance: 300000,    // Tự động giảm
  bonus: 500000         // Tự động giảm
}
```

## 5. Validation Rules

### Salary

-   **Type**: Number
-   **Min**: 0 (không được âm)
-   **Default**: Theo loại nhân viên

### Allowance

-   **Type**: Number
-   **Min**: 0 (không được âm)
-   **Default**: Theo loại nhân viên

### Bonus

-   **Type**: Number
-   **Min**: 0 (không được âm)
-   **Default**: Theo loại nhân viên

## 6. Tích hợp với module Salary

Thông tin lương từ User sẽ được sử dụng trong module Salary:

```typescript
// Trong salary.service.ts
const user = await this.userModel.findById(userId);
const baseSalary = user.salary; // Lấy từ user.salary
const allowance = user.allowance; // Lấy từ user.allowance
const bonus = user.bonus; // Lấy từ user.bonus
```

## 7. Lưu ý quan trọng

1. **Thực tập sinh**: Luôn có `salary = 0`, chỉ có `allowance` (trợ cấp thực tập)
2. **Tự động điều chỉnh**: Khi thay đổi `employeeType`, hệ thống tự động cập nhật lương
3. **Ghi đè thủ công**: Có thể ghi đè giá trị mặc định bằng cách truyền trực tiếp
4. **Validation**: Tất cả giá trị lương phải >= 0
5. **Tích hợp**: Thông tin lương được sử dụng trong tính lương hàng tháng

## 8. Ví dụ sử dụng đầy đủ

### Tạo nhân viên chính thức với lương tùy chỉnh:

```http
POST /users
{
  "name": "Trần Thị B",
  "email": "tranthib@company.com",
  "password": "123456",
  "age": 28,
  "gender": "female",
  "address": "{\"city\":\"TP.HCM\",\"district\":\"Quận 1\",\"ward\":\"Bến Nghé\",\"detail\":\"456 XYZ\"}",
  "department": "64f1a2b3c4d5e6f7g8h9i0j1",
  "role": "64f1a2b3c4d5e6f7g8h9i0j2",
  "employeeType": "official",
  "salary": 20000000,      // Lương cao hơn mặc định
  "allowance": 1000000,    // Phụ cấp cao hơn mặc định
  "bonus": 2000000         // Thưởng cao hơn mặc định
}
```

### Tạo thực tập sinh:

```http
POST /users
{
  "name": "Lê Văn C",
  "email": "levanc@company.com",
  "password": "123456",
  "age": 22,
  "gender": "male",
  "address": "{\"city\":\"Đà Nẵng\",\"district\":\"Hải Châu\",\"ward\":\"Thạch Thang\",\"detail\":\"789 DEF\"}",
  "department": "64f1a2b3c4d5e6f7g8h9i0j1",
  "role": "64f1a2b3c4d5e6f7g8h9i0j3",
  "employeeType": "intern"
  // Không cần truyền salary, allowance, bonus - sẽ tự động thiết lập
}
```
