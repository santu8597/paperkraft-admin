# Moderator Question Paper Upload API Documentation

## Overview
This API endpoint allows uploading a moderator's question paper Word document (.doc or .docx) to Pinata (IPFS) and updates the subject document in MongoDB with the file metadata.

## Endpoint Details

### URL
```
POST /api/upload-mod-paper/{subjectId}
```

### Parameters

#### Path Parameters
- **subjectId** (required): The MongoDB ObjectId of the subject document
  - Type: `string`
  - Format: 24-character hexadecimal string (MongoDB ObjectId)
  - Example: `507f1f77bcf86cd799439011`

#### Request Body (Multipart Form Data)
- **file** (required): The Word document file to upload
  - Type: `File`
  - Accepted MIME types: `application/msword` (.doc), `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
  - Maximum size: Depends on Pinata limits

### Environment Variables Required
```env
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_secret_key
```

### MongoDB Connection
The API uses the connection defined in `@/lib/mongodb` and the `Subject` model from `@/lib/models/Subject`.

## Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "fileName": "moderator-paper.docx",
    "fileType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "fileSize": 1024000,
    "ipfsHash": "QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx",
    "pinataUrl": "https://gateway.pinata.cloud/ipfs/QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx"
  },
  "message": "Moderator question paper uploaded successfully"
}
```

### Error Responses

#### 400 Bad Request - No File
```json
{
  "success": false,
  "error": "Word document file is required"
}
```

#### 400 Bad Request - Invalid File Type
```json
{
  "success": false,
  "error": "Only Word documents (.doc, .docx) are allowed"
}
```

#### 404 Not Found - Subject Not Found
```json
{
  "success": false,
  "error": "Subject not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Error message details"
}
```

## Database Schema Updates

When a file is successfully uploaded, the following fields in the `Subject` document are updated:

```javascript
{
  mod_questionPaper: {
    fileName: String,      // Original filename
    fileType: String,      // MIME type (application/msword or application/vnd.openxmlformats-officedocument.wordprocessingml.document)
    fileSize: Number,      // File size in bytes
    ipfsHash: String,      // IPFS CID hash
    pinataUrl: String      // Full Pinata gateway URL
  },
  is_mod_questionPaperUploaded: true  // Boolean flag set to true
}
```

## Integration Examples

### 1. JavaScript / Fetch API
```javascript
async function uploadModeratorPaper(subjectId, pdfFile) {
  const formData = new FormData();
  formData.append('file', pdfFile);
  
  try {
    const response = await fetch(`/api/upload-mod-paper/${subjectId}`, {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Upload successful:', result.data);
      return result.data;
    } else {
      console.error('Upload failed:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Usage
const fileInput = document.getElementById('pdfInput');
const file = fileInput.files[0];
uploadModeratorPaper('507f1f77bcf86cd799439011', file);
```

### 2. React / Next.js
```jsx
import { useState } from 'react';

export default function UploadModPaper({ subjectId }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/upload-mod-paper/${subjectId}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data.data);
        alert('Upload successful!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept="application/pdf" 
        onChange={handleFileChange} 
      />
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      {result && (
        <div>
          <p>File: {result.fileName}</p>
          <p>IPFS Hash: {result.ipfsHash}</p>
          <a href={result.pinataUrl} target="_blank">View on IPFS</a>
        </div>
      )}
    </div>
  );
}
```

### 3. Node.js / Backend
```javascript
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function uploadModeratorPaper(subjectId, filePath) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));

  const response = await fetch(
    `http://localhost:3001/api/upload-mod-paper/${subjectId}`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const result = await response.json();
  return result;
}

// Usage
uploadModeratorPaper('507f1f77bcf86cd799439011', './paper.pdf')
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

### 4. Python / Requests
```python
import requests

def upload_moderator_paper(subject_id, file_path):
    url = f"http://localhost:3001/api/upload-mod-paper/{subject_id}"
    
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(url, files=files)
    
    return response.json()

# Usage
result = upload_moderator_paper('507f1f77bcf86cd799439011', 'paper.pdf')
print(result)
```

### 5. cURL
```bash
curl -X POST \
  http://localhost:3001/api/upload-mod-paper/507f1f77bcf86cd799439011 \
  -F "file=@/path/to/moderator-paper.pdf"
```

### 6. Postman / Thunder Client
1. Method: `POST`
2. URL: `http://localhost:3001/api/upload-mod-paper/507f1f77bcf86cd799439011`
3. Body Type: `form-data`
4. Add field:
   - Key: `file` (Type: File)
   - Value: Select your PDF file

## File Flow

1. **Client** → Uploads PDF file with subject ID in URL
2. **API** → Validates file type (must be PDF)
3. **API** → Uploads file to Pinata IPFS
4. **Pinata** → Returns IPFS hash (CID)
5. **API** → Saves metadata to MongoDB Subject document
6. **API** → Returns success response with file details
7. **Client** → Receives IPFS URL and metadata

## Error Handling Best Practices

```javascript
async function safeUpload(subjectId, file) {
  // Validate file before upload
  if (!file) {
    throw new Error('No file selected');
  }
  
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are allowed');
  }
  
  if (file.size > 50 * 1024 * 1024) { // 50MB limit
    throw new Error('File too large (max 50MB)');
  }
  
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`/api/upload-mod-paper/${subjectId}`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }
  
  return await response.json();
}
```

## Testing

### Test with Sample Data
```javascript
// Test Subject ID (replace with actual MongoDB ObjectId)
const testSubjectId = '507f1f77bcf86cd799439011';

// Create test function
async function testUpload() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/pdf';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    
    try {
      const result = await uploadModeratorPaper(testSubjectId, file);
      console.log('Success:', result);
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  input.click();
}
```

## Security Considerations

1. **File Validation**: Only PDF files are accepted
2. **Subject Existence**: Validates subject exists before upload
3. **Environment Variables**: API keys stored securely in `.env` file
4. **Error Messages**: Sensitive information not exposed in error responses

## Rate Limits

Rate limits depend on your Pinata plan:
- Free tier: 100 MB storage, 1 GB bandwidth/month
- Paid plans: Higher limits available

## Related Endpoints

- `POST /api/upload-paper` - Upload regular question paper and syllabus
- `GET /api/subjects` - Get all subjects (if exists)
- `PUT /api/subjects/{id}` - Update subject (if exists)

## Support

For issues or questions:
1. Check MongoDB connection is working
2. Verify Pinata API keys are valid
3. Ensure subject ID exists in database
4. Check file is valid PDF format

## Changelog

### Version 1.0
- Initial release
- Support for PDF upload to Pinata IPFS
- MongoDB integration with Subject model
- File metadata storage
