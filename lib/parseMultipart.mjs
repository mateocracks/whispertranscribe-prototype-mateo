import busboy from 'busboy'

const MAX_FILE_BYTES = 25 * 1024 * 1024

/**
 * Parse multipart/form-data from a Node request (Express-style or Vercel).
 * Collects field `file` into a buffer plus optional `model` and `language` fields.
 * @param {import('http').IncomingMessage} req
 */
export function parseTranscribeMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = busboy({
      headers: req.headers,
      limits: { fileSize: MAX_FILE_BYTES },
    })

    /** @type {Buffer[]} */
    const chunks = []
    let fileInfo = { filename: 'upload', mimeType: 'application/octet-stream' }
    const fields = { model: '', language: '' }
    let sawFile = false

    bb.on('file', (name, file, info) => {
      if (name !== 'file') {
        file.resume()
        return
      }
      sawFile = true
      fileInfo = {
        filename: info.filename || 'upload',
        mimeType: info.mimeType || 'application/octet-stream',
      }
      file.on('data', (d) => chunks.push(d))
      file.on('limit', () => {
        reject(Object.assign(new Error('File is too large (max 25 MB).'), { code: 'TOO_LARGE' }))
      })
      file.on('error', reject)
    })

    bb.on('field', (name, val) => {
      if (name === 'model' || name === 'language') {
        fields[name] = String(val || '')
      }
    })

    bb.on('finish', () => {
      if (!sawFile || !chunks.length) {
        reject(Object.assign(new Error('Missing multipart field "file" (audio).'), { code: 'NO_FILE' }))
        return
      }
      resolve({
        buffer: Buffer.concat(chunks),
        filename: fileInfo.filename,
        mimeType: fileInfo.mimeType,
        model: fields.model,
        language: fields.language,
      })
    })

    bb.on('error', reject)
    req.pipe(bb)
  })
}
