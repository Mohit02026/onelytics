import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { encrypt, decrypt } from '@/lib/encryption'

const TEST_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'

describe('encryption', () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY
  })

  afterAll(() => {
    delete process.env.ENCRYPTION_KEY
  })

  // U1
  it('encrypt returns iv:tag:data format, not the original value', () => {
    const result = encrypt('my-secret-token')
    expect(result).not.toBe('my-secret-token')
    const parts = result.split(':')
    expect(parts).toHaveLength(3)
    // iv = 12 bytes = 24 hex chars, tag = 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(24)
    expect(parts[1]).toHaveLength(32)
    expect(parts[2].length).toBeGreaterThan(0)
  })

  // U2
  it('decrypt(encrypt(value)) round-trips to original string', () => {
    const original = 'ya29.oauth-token-example-12345'
    expect(decrypt(encrypt(original))).toBe(original)
  })

  // U3
  it('same input produces different ciphertext each time (IV randomness)', () => {
    const a = encrypt('same-input')
    const b = encrypt('same-input')
    expect(a).not.toBe(b)
  })

  // U4
  it('decrypt throws when auth tag is tampered (GCM integrity check)', () => {
    const encoded = encrypt('integrity-test')
    const [iv, tag, data] = encoded.split(':')
    // Flip first hex char to guarantee a change
    const flipped = tag[0] === '0' ? '1' : '0'
    const tamperedTag = flipped + tag.slice(1)
    expect(() => decrypt(`${iv}:${tamperedTag}:${data}`)).toThrow()
  })

  // U5
  it('decrypt throws when ENCRYPTION_KEY is wrong', () => {
    const encoded = encrypt('test-value')
    vi.stubEnv('ENCRYPTION_KEY', 'b1b2c3d4e5f6b1b2c3d4e5f6b1b2c3d4e5f6b1b2c3d4e5f6b1b2c3d4e5f6b1b2')
    expect(() => decrypt(encoded)).toThrow()
    vi.unstubAllEnvs()
    process.env.ENCRYPTION_KEY = TEST_KEY
  })

  // U6
  it('decrypt throws on malformed input with no colons', () => {
    expect(() => decrypt('notvalidatall')).toThrow()
  })
})
