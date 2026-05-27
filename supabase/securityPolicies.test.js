import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readSql = (relativePath) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8').replace(/\s+/g, ' ').trim()

describe('Supabase security policies', () => {
  const schemaSql = readSql('supabase/migrations/001_initial_schema.sql')
  const storageSql = readSql('supabase/migrations/003_storage_buckets.sql')

  it('limits session updates to the owning teacher', () => {
    expect(schemaSql).toMatch(
      /CREATE POLICY "Teachers can update own sessions" ON sessions FOR UPDATE USING \( auth\.uid\(\) = created_by AND EXISTS \(SELECT 1 FROM users WHERE id = auth\.uid\(\) AND role = 'teacher'\) \)/
    )
  })

  it('lets students read only their own enrollments and teachers read only their session enrollments', () => {
    expect(schemaSql).toMatch(
      /CREATE POLICY "Students can read own enrollments" ON enrollments FOR SELECT USING \(auth\.uid\(\) = student_id\)/
    )
    expect(schemaSql).toMatch(
      /CREATE POLICY "Teachers can read session enrollments" ON enrollments FOR SELECT USING \( EXISTS \( SELECT 1 FROM sessions WHERE sessions\.id = enrollments\.session_id AND sessions\.created_by = auth\.uid\(\) \) \)/
    )
  })

  it('restricts payment proof reads to the owning student or session teacher using the storage path', () => {
    expect(storageSql).toMatch(
      /CREATE POLICY "Students can read own payment proofs" ON storage\.objects FOR SELECT USING \( bucket_id = 'payment-proofs' AND \(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text \)/
    )
    expect(storageSql).toMatch(
      /CREATE POLICY "Teachers can read session payment proofs" ON storage\.objects FOR SELECT USING \( bucket_id = 'payment-proofs' AND auth\.uid\(\) IN \( SELECT created_by FROM public\.sessions WHERE id::text = \(storage\.foldername\(name\)\)\[2\] \) \)/
    )
  })

  it('locks media and payment proof uploads to approved folder structures and file extensions', () => {
    expect(storageSql).toMatch(
      /CREATE POLICY "Teachers can upload media" ON storage\.objects FOR INSERT WITH CHECK \( bucket_id = 'media' AND auth\.uid\(\) IN \(SELECT id FROM public\.users WHERE role = 'teacher'\) AND .*?\(storage\.foldername\(name\)\)\[1\] = 'videos'.*?lower\(storage\.extension\(name\)\) = ANY \(ARRAY\['mp4', 'webm'\]\).*?\(storage\.foldername\(name\)\)\[1\] = 'thumbnails'.*?lower\(storage\.extension\(name\)\) = ANY \(ARRAY\['jpg', 'jpeg', 'png'\]\).*?\)/
    )
    expect(storageSql).toMatch(
      /CREATE POLICY "Students can upload payment proofs" ON storage\.objects FOR INSERT WITH CHECK \( bucket_id = 'payment-proofs' AND auth\.uid\(\) IN \(SELECT id FROM public\.users WHERE role = 'student'\) AND \(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text AND EXISTS \( SELECT 1 FROM public\.sessions WHERE id::text = \(storage\.foldername\(name\)\)\[2\] \) AND lower\(storage\.extension\(name\)\) = ANY \(ARRAY\['jpg', 'jpeg', 'png'\]\) \)/
    )
  })
})
