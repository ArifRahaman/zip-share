const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer to store chunks in memory
const chunkStorage = multer.memoryStorage();

const uploadChunk = multer({ 
    storage: chunkStorage,
    fileFilter: (req, file, cb) => {
        if (file.originalname.toLowerCase().endsWith('.zip')) {
            cb(null, true);
        } else {
            cb(new Error('Only ZIP files are allowed. Please upload a .zip file.'));
        }
    }
});

app.post('/api/upload-chunk', uploadChunk.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file chunk uploaded.');
    }

    const { uploadSessionId, currentChunk, totalChunks } = req.body;
    const fileName = req.file.originalname;
    
    // Assemble file sequentially
    const tempFilePath = path.join(uploadsDir, `${uploadSessionId}_temp.zip`);
    fs.appendFileSync(tempFilePath, req.file.buffer);
    
    if (parseInt(currentChunk) === parseInt(totalChunks) - 1) {
        const fileId = uuidv4();
        const finalFilename = `${fileId}___${fileName}`;
        const finalFilePath = path.join(uploadsDir, finalFilename);
        
        fs.renameSync(tempFilePath, finalFilePath);
        
        const host = req.headers.host;
        const downloadLink = `http://${host}/download/${fileId}`;
        
        res.json({
            message: 'File assembled successfully',
            fileId: fileId,
            downloadLink: downloadLink
        });
    } else {
        res.json({ message: 'Chunk received' });
    }
});

app.use((err, req, res, next) => {
    console.error('Error handling upload:', err);
    res.status(500).send('Server Error: ' + err.message);
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

const server = app.listen(port, '0.0.0.0', () => {
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

// Disable timeout for large file uploads
server.timeout = 0;

