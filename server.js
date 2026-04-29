const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.static('public'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer for disk storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const fileId = uuidv4();
        const originalName = file.originalname;
        // The generated filename has the format: UUID___OriginalName
        cb(null, `${fileId}___${originalName}`);
    }
});

const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    
    const fileId = req.file.filename.split('___')[0];
    const host = req.headers.host;
    const downloadLink = `http://${host}/download/${fileId}`;
    
    res.json({
        message: 'File uploaded successfully',
        fileId: fileId,
        downloadLink: downloadLink
    });
});

app.get('/download/:id', (req, res) => {
    const fileId = req.params.id;
    
    fs.readdir(uploadsDir, (err, files) => {
        if (err) {
            return res.status(500).send('Error reading files.');
        }
        
        const targetFile = files.find(f => f.startsWith(`${fileId}___`));
        
        if (!targetFile) {
            return res.status(404).send('File not found or has expired.');
        }
        
        const filePath = path.join(uploadsDir, targetFile);
        const originalName = targetFile.split('___').slice(1).join('___');
        
        res.download(filePath, originalName);
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`\n=========================================`);
    console.log(`Server is running!`);
    console.log(`Local link: http://localhost:${port}`);
    
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log(`Network link: http://${iface.address}:${port}`);
            }
        }
    }
    console.log(`=========================================\n`);
});
