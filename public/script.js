const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');

const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const fileNameDisplay = document.getElementById('file-name');
const fileSizeDisplay = document.getElementById('file-size');

const resultContainer = document.getElementById('result-container');
const shareLinkInput = document.getElementById('share-link');
const copyBtn = document.getElementById('copy-btn');
const uploadAnotherBtn = document.getElementById('upload-another-btn');

// Browse button triggers file input
browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});
dropZone.addEventListener('click', () => {
    fileInput.click();
});

// Drag and drop effects
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
});

dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', function() {
    if (this.files.length > 0) {
        handleFile(this.files[0]);
    }
});

function handleFile(file) {
    // Hide dropzone, show progress
    dropZone.style.display = 'none';
    progressContainer.style.display = 'block';

    fileNameDisplay.textContent = file.name;
    fileSizeDisplay.textContent = formatBytes(file.size);

    uploadFile(file);
}

function uploadFile(file) {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            progressBar.style.width = percentComplete + '%';
            progressText.textContent = Math.round(percentComplete) + '%';
        }
    });

    xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText);
            showResult(response.downloadLink);
        } else {
            alert('Upload failed: ' + xhr.statusText);
            resetUI();
        }
    });

    xhr.addEventListener('error', () => {
        alert('An error occurred during the upload.');
        resetUI();
    });

    xhr.open('POST', '/api/upload', true);
    xhr.send(formData);
}

function showResult(link) {
    progressContainer.style.display = 'none';
    resultContainer.style.display = 'block';
    shareLinkInput.value = link;
}

function resetUI() {
    progressContainer.style.display = 'none';
    resultContainer.style.display = 'none';
    dropZone.style.display = 'block';
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    fileInput.value = '';
}

uploadAnotherBtn.addEventListener('click', resetUI);

copyBtn.addEventListener('click', () => {
    shareLinkInput.select();
    document.execCommand('copy');
    copyBtn.textContent = 'Copied!';
    copyBtn.style.backgroundColor = 'var(--success)';
    setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.style.backgroundColor = '';
    }, 2000);
});

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
