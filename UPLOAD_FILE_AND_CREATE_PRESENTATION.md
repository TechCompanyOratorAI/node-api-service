# Hướng Dẫn Upload File và Tạo Presentation

## Mục Lục
1. [Tổng Quan](#tổng-quan)
2. [Tạo Presentation](#tạo-presentation)
3. [Upload Slide](#upload-slide)
4. [Upload Media (Audio/Video)](#upload-media-audiovideo)
5. [Submit Presentation](#submit-presentation)
6. [Lấy Danh Sách Presentations](#lấy-danh-sách-presentations)
7. [Quản Lý Storage](#quản-lý-storage)
8. [Ví Dụ Sử Dụng](#ví-dụ-sử-dụng)
9. [Lỗi Thường Gặp](#lỗi-thường-gặp)

---

## Tổng Quan

Hệ thống cho phép sinh viên tạo presentation, upload slides và media (audio/video) để thực hiện bài thuyết trình. Tất cả các API đều yêu cầu xác thực (JWT token) và email đã được xác minh.

### Các Loại File Được Hỗ Trợ

#### Slide Files
- **PDF**: `application/pdf`
- **PowerPoint**: `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`
- **Images**: `image/jpeg`, `image/png`
- **Kích thước tối đa**: 50MB

#### Media Files (Audio/Video)
- **Audio**: Tất cả các định dạng audio (`audio/*`)
- **Video**: Tất cả các định dạng video (`video/*`)
- **Kích thước tối đa**: 500MB

---

## Tạo Presentation

### Endpoint
```
POST /api/v1/presentations
```

### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Request Body
```json
{
  "topicId": 1,
  "title": "Bài thuyết trình về AI",
  "description": "Mô tả về bài thuyết trình",
  "groupCode": "GROUP001" // Optional
}
```

### Response Success (201)
```json
{
  "success": true,
  "message": "Presentation created successfully",
  "data": {
    "id": 1,
    "topicId": 1,
    "studentId": 123,
    "title": "Bài thuyết trình về AI",
    "description": "Mô tả về bài thuyết trình",
    "groupCode": "GROUP001",
    "status": "draft",
    "createdAt": "2026-01-23T10:00:00.000Z",
    "updatedAt": "2026-01-23T10:00:00.000Z"
  }
}
```

### Response Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "topicId",
      "message": "Topic ID is required"
    }
  ]
}
```

### Yêu Cầu
- Người dùng phải đã đăng ký vào topic (`topicId`)
- Phải có quyền Student
- Email phải đã được xác minh

---

## Upload Slide

### Endpoint
```
POST /api/v1/presentations/:presentationId/slides
```

### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

### Request Body (Form Data)
- `file`: File slide (PDF, PowerPoint, hoặc Image)
- `slideNumber`: (Optional) Số thứ tự slide

### Response Success (200)
```json
{
  "success": true,
  "message": "Slide uploaded successfully",
  "data": {
    "id": 1,
    "presentationId": 1,
    "slideNumber": 1,
    "fileUrl": "https://s3.amazonaws.com/bucket/path/to/slide.pdf",
    "fileKey": "presentations/1/slides/slide_1.pdf",
    "mimeType": "application/pdf",
    "fileSize": 1024000,
    "createdAt": "2026-01-23T10:05:00.000Z"
  }
}
```

### Response Error (400)
```json
{
  "success": false,
  "message": "Slide file is required"
}
```

hoặc

```json
{
  "success": false,
  "message": "Unsupported slide file type"
}
```

### Lưu Ý
- Có thể upload nhiều slides cho một presentation
- Nếu không chỉ định `slideNumber`, hệ thống sẽ tự động gán số thứ tự
- File được lưu trữ trên AWS S3

---

## Upload Media (Audio/Video)

### Endpoint
```
POST /api/v1/presentations/:presentationId/media
```

### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

### Request Body (Form Data)
- `file`: File audio hoặc video
- `durationSeconds`: (Optional) Thời lượng tính bằng giây
- `sampleRate`: (Optional) Tần số lấy mẫu (cho audio)
- `recordingMethod`: (Optional) Phương pháp ghi âm

### Response Success (200)
```json
{
  "success": true,
  "message": "Media uploaded successfully",
  "data": {
    "id": 1,
    "presentationId": 1,
    "fileUrl": "https://s3.amazonaws.com/bucket/path/to/media.mp4",
    "fileKey": "presentations/1/media/media.mp4",
    "mimeType": "video/mp4",
    "fileSize": 52428800,
    "durationSeconds": 300,
    "sampleRate": 44100,
    "recordingMethod": "web",
    "createdAt": "2026-01-23T10:10:00.000Z"
  }
}
```

### Response Error (400)
```json
{
  "success": false,
  "message": "Media file is required"
}
```

hoặc

```json
{
  "success": false,
  "message": "Unsupported media file type"
}
```

### Lưu Ý
- Mỗi presentation chỉ nên có một file media
- File media lớn có thể mất thời gian upload
- Hệ thống sẽ tự động xử lý transcription và phân tích sau khi submit

---

## Submit Presentation

Sau khi đã upload đầy đủ slides và media, cần submit presentation để hệ thống bắt đầu xử lý.

### Endpoint
```
POST /api/v1/presentations/:presentationId/submit
```

### Headers
```
Authorization: Bearer <JWT_TOKEN>
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Presentation submitted successfully",
  "data": {
    "id": 1,
    "status": "processing",
    "submittedAt": "2026-01-23T10:15:00.000Z"
  }
}
```

### Response Error (400)
```json
{
  "success": false,
  "message": "Presentation must have at least one slide and media file"
}
```

### Trạng Thái Presentation
- `draft`: Đang soạn thảo
- `processing`: Đang xử lý (transcription, phân tích)
- `completed`: Đã hoàn thành
- `failed`: Xử lý thất bại

---

## Lấy Danh Sách Presentations

API này cho phép student lấy tất cả các presentations của mình với các tùy chọn lọc và phân trang.

### Endpoint
```
GET /api/v1/presentations
```

### Headers
```
Authorization: Bearer <JWT_TOKEN>
```

### Query Parameters
- `status`: (Optional) Lọc theo trạng thái (`draft`, `processing`, `completed`, `failed`)
- `limit`: (Optional) Số lượng kết quả trả về (mặc định: 50)
- `offset`: (Optional) Số lượng bỏ qua (mặc định: 0)

### Ví Dụ Request
```
GET /api/v1/presentations?status=completed&limit=10&offset=0
```

### Response Success (200)
```json
{
  "success": true,
  "presentations": [
    {
      "presentationId": 1,
      "topicId": 5,
      "studentId": 123,
      "title": "Bài thuyết trình về AI",
      "description": "Mô tả về bài thuyết trình",
      "groupCode": "GROUP001",
      "status": "completed",
      "createdAt": "2026-01-23T10:00:00.000Z",
      "updatedAt": "2026-01-23T10:15:00.000Z",
      "topic": {
        "topicId": 5,
        "title": "Chủ đề về AI"
      },
      "audioRecord": {
        "audioId": 1,
        "durationSeconds": 300
      }
    },
    {
      "presentationId": 2,
      "topicId": 6,
      "studentId": 123,
      "title": "Bài thuyết trình về Machine Learning",
      "description": "Mô tả",
      "groupCode": null,
      "status": "draft",
      "createdAt": "2026-01-22T09:00:00.000Z",
      "updatedAt": "2026-01-22T09:00:00.000Z",
      "topic": {
        "topicId": 6,
        "title": "Chủ đề về ML"
      },
      "audioRecord": null
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0
}
```

### Response Error (400)
```json
{
  "success": false,
  "message": "Failed to get presentations"
}
```

### Lưu Ý
- API chỉ trả về presentations của user hiện tại (dựa trên JWT token)
- Kết quả được sắp xếp theo thời gian tạo mới nhất (DESC)
- Mỗi presentation bao gồm thông tin topic và audio record (nếu có)
- Sử dụng `limit` và `offset` để phân trang

### Ví Dụ Sử Dụng

```javascript
// Lấy tất cả presentations
const getAllPresentations = async () => {
  const response = await fetch('http://localhost:3000/api/v1/presentations', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const result = await response.json();
  return result;
};

// Lấy presentations đã hoàn thành với phân trang
const getCompletedPresentations = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const response = await fetch(
    `http://localhost:3000/api/v1/presentations?status=completed&limit=${limit}&offset=${offset}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const result = await response.json();
  return {
    presentations: result.presentations,
    total: result.total,
    currentPage: page,
    totalPages: Math.ceil(result.total / limit)
  };
};
```

---

## Quản Lý Storage

### Lấy Presigned URL để Upload

#### Endpoint
```
POST /api/v1/storage/presigned-upload
```

#### Request Body
```json
{
  "key": "presentations/1/slides/slide_1.pdf",
  "contentType": "application/pdf",
  "expiresIn": 3600
}
```

#### Response
```json
{
  "success": true,
  "uploadUrl": "https://s3.amazonaws.com/bucket/path?signature=...",
  "key": "presentations/1/slides/slide_1.pdf",
  "expiresIn": 3600
}
```

### Lấy Presigned URL để Download

#### Endpoint
```
POST /api/v1/storage/presigned-download
```

#### Request Body
```json
{
  "key": "presentations/1/slides/slide_1.pdf",
  "expiresIn": 3600,
  "filename": "slide_1.pdf"
}
```

#### Response
```json
{
  "success": true,
  "downloadUrl": "https://s3.amazonaws.com/bucket/path?signature=...",
  "expiresIn": 3600
}
```

### Xóa File

#### Endpoint
```
DELETE /api/v1/storage/file
```

#### Request Body
```json
{
  "key": "presentations/1/slides/slide_1.pdf"
}
```

#### Response
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

## Ví Dụ Sử Dụng

### Ví Dụ 1: Tạo Presentation và Upload Slide (JavaScript/Fetch)

```javascript
// Bước 1: Tạo presentation
const createPresentation = async () => {
  const response = await fetch('http://localhost:3000/api/v1/presentations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      topicId: 1,
      title: 'Bài thuyết trình về AI',
      description: 'Mô tả chi tiết',
      groupCode: 'GROUP001'
    })
  });
  
  const result = await response.json();
  return result.data.id; // presentationId
};

// Bước 2: Upload slide
const uploadSlide = async (presentationId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('slideNumber', 1);
  
  const response = await fetch(
    `http://localhost:3000/api/v1/presentations/${presentationId}/slides`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }
  );
  
  return await response.json();
};

// Sử dụng
const presentationId = await createPresentation();
await uploadSlide(presentationId, slideFile);
```

### Ví Dụ 2: Upload Media và Submit (cURL)

```bash
# Upload media
curl -X POST \
  http://localhost:3000/api/v1/presentations/1/media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/media.mp4" \
  -F "durationSeconds=300" \
  -F "sampleRate=44100"

# Submit presentation
curl -X POST \
  http://localhost:3000/api/v1/presentations/1/submit \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Ví Dụ 3: Kiểm Tra Trạng Thái Xử Lý

```javascript
const checkStatus = async (presentationId) => {
  const response = await fetch(
    `http://localhost:3000/api/v1/presentations/${presentationId}/status`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const result = await response.json();
  console.log('Status:', result.data.status);
  console.log('Progress:', result.data.progress);
  
  return result.data;
};
```

---

## Lỗi Thường Gặp

### 1. File Size Exceeds Limit
**Lỗi**: `File size exceeds the allowed limit`

**Giải pháp**: 
- Slide: Giảm kích thước file xuống dưới 50MB
- Media: Giảm kích thước file xuống dưới 500MB
- Nén file hoặc sử dụng định dạng có tỷ lệ nén tốt hơn

### 2. Unsupported File Type
**Lỗi**: `Unsupported slide file type` hoặc `Unsupported media file type`

**Giải pháp**:
- Slide: Chỉ sử dụng PDF, PowerPoint (.ppt, .pptx), hoặc Image (JPEG, PNG)
- Media: Chỉ sử dụng file audio hoặc video hợp lệ

### 3. Presentation Not Found
**Lỗi**: `Presentation not found`

**Giải pháp**:
- Kiểm tra `presentationId` có đúng không
- Đảm bảo presentation thuộc về user hiện tại (hoặc user có quyền truy cập)

### 4. Topic Enrollment Required
**Lỗi**: `User is not enrolled in this topic`

**Giải pháp**:
- Đăng ký vào topic trước khi tạo presentation
- Kiểm tra `topicId` có đúng không

### 5. Email Not Verified
**Lỗi**: `Email verification required`

**Giải pháp**:
- Xác minh email trước khi sử dụng API
- Kiểm tra email verification status

### 6. Authentication Failed
**Lỗi**: `Unauthorized` hoặc `Invalid token`

**Giải pháp**:
- Kiểm tra JWT token có hợp lệ không
- Đảm bảo token chưa hết hạn
- Đăng nhập lại để lấy token mới

---

## Best Practices

1. **Upload Thứ Tự**: 
   - Tạo presentation trước
   - Upload slides theo thứ tự
   - Upload media cuối cùng
   - Submit để bắt đầu xử lý

2. **Error Handling**:
   - Luôn kiểm tra response `success` field
   - Xử lý các lỗi validation
   - Retry logic cho upload lớn

3. **File Management**:
   - Đặt tên file có ý nghĩa
   - Kiểm tra kích thước file trước khi upload
   - Xóa file không cần thiết để tiết kiệm storage

4. **Performance**:
   - Upload file lớn trong background
   - Hiển thị progress bar cho user
   - Sử dụng presigned URLs cho upload trực tiếp lên S3 (nếu cần)

5. **Security**:
   - Không expose JWT token trong client-side code
   - Validate file type ở client trước khi upload
   - Kiểm tra quyền truy cập trước mỗi request

---

## API Endpoints Tổng Hợp

| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| POST | `/api/v1/presentations` | Tạo presentation mới |
| POST | `/api/v1/presentations/:id/slides` | Upload slide |
| POST | `/api/v1/presentations/:id/media` | Upload media |
| POST | `/api/v1/presentations/:id/submit` | Submit presentation |
| GET | `/api/v1/presentations/:id` | Lấy thông tin presentation |
| GET | `/api/v1/presentations` | Lấy danh sách presentations |
| GET | `/api/v1/presentations/:id/status` | Kiểm tra trạng thái xử lý |
| GET | `/api/v1/presentations/:id/results` | Lấy kết quả phân tích |
| PUT | `/api/v1/presentations/:id` | Cập nhật presentation |
| DELETE | `/api/v1/presentations/:id` | Xóa presentation |
| POST | `/api/v1/storage/presigned-upload` | Lấy presigned URL upload |
| POST | `/api/v1/storage/presigned-download` | Lấy presigned URL download |
| DELETE | `/api/v1/storage/file` | Xóa file |

---

## Tài Liệu Tham Khảo

- [Express.js Documentation](https://expressjs.com/)
- [Multer Documentation](https://github.com/expressjs/multer)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [JWT Authentication](https://jwt.io/)

---

**Lưu ý**: Tài liệu này dựa trên phiên bản hiện tại của API. Có thể có thay đổi trong tương lai, vui lòng cập nhật khi cần thiết.
