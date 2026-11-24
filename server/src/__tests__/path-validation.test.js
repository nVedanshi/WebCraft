import { describe, it, expect } from 'vitest'
import { validateFilePath } from '../repositories/projectFile.repository.js'

describe('validateFilePath', () => {
  it('accepts normal relative paths', () => {
    expect(validateFilePath('src/App.jsx')).toBe('src/App.jsx')
    expect(validateFilePath('src/components/Button.jsx')).toBe(
      'src/components/Button.jsx'
    )
    expect(validateFilePath('README.md')).toBe('README.md')
  })

  it('normalizes backslashes and duplicate slashes', () => {
    expect(validateFilePath('src\\App.jsx')).toBe('src/App.jsx')
    expect(validateFilePath('src//App.jsx')).toBe('src/App.jsx')
    expect(validateFilePath('./src/App.jsx')).toBe('src/App.jsx')
  })

  it('rejects directory traversal', () => {
    expect(() => validateFilePath('../../etc/passwd')).toThrow()
    expect(() => validateFilePath('src/../../secret')).toThrow()
    expect(() => validateFilePath('..')).toThrow()
  })

  it('rejects absolute paths', () => {
    expect(() => validateFilePath('/etc/passwd')).toThrow()
    expect(() => validateFilePath('/absolute/path')).toThrow()
  })

  it('rejects Windows drive letters', () => {
    expect(() => validateFilePath('C:\\Windows\\system32')).toThrow()
  })

  it('rejects null bytes', () => {
    expect(() => validateFilePath('src/app.jsx\0')).toThrow()
  })

  it('rejects empty path', () => {
    expect(() => validateFilePath('')).toThrow()
    expect(() => validateFilePath('   ')).toThrow()
  })
})
