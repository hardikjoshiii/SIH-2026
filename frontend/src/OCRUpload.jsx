import { useState } from 'react';

const API_URL = 'http://localhost:5000';

function OCRUpload() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setExtractedText('');
    setError(null);
  };

  const runOCR = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const res = await fetch(`${API_URL}/api/ocr`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'OCR failed');

      setExtractedText(data.extractedText);
      setConfidence(data.confidence);
    } catch (err) {
      setError(err.message);
    }
    setProcessing(false);
  };

  return (
    <div>
      <p className="hint" style={{ marginBottom: '1rem' }}>
        Upload a photo or scan of a compliance document (safety certificate, inspection report, etc.)
        to automatically extract its text — no manual retyping needed.
      </p>

      <input type="file" accept="image/*" onChange={handleFileChange} />

      {preview && (
        <div style={{ marginTop: '1rem' }}>
          <img src={preview} alt="Document preview" style={{ maxWidth: '300px', borderRadius: '8px', border: '1px solid #374151' }} />
        </div>
      )}

      {file && (
        <button onClick={runOCR} disabled={processing} className="secondary-btn" style={{ marginTop: '1rem' }}>
          {processing ? 'Reading document... (may take 10-20s)' : '📄 Extract Text (OCR)'}
        </button>
      )}

      {error && <p className="error" style={{ marginTop: '1rem' }}>{error}</p>}

      {extractedText && (
        <div style={{ marginTop: '1.5rem' }}>
          <p className="hint">
            Extracted text {confidence !== null && `(confidence: ${Math.round(confidence)}%)`}
          </p>
          <textarea
            readOnly
            value={extractedText}
            rows={10}
            style={{
              width: '100%',
              background: '#1f2937',
              border: '1px solid #374151',
              color: '#e5e7eb',
              padding: '0.75rem',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
            }}
          />
        </div>
      )}
    </div>
  );
}

export default OCRUpload;