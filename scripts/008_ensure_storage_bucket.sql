-- Ensure the ventychat-files bucket exists with proper configuration
DO $$
BEGIN
    -- Check if bucket exists, if not create it
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'ventychat-files'
    ) THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'ventychat-files',
            'ventychat-files', 
            true,
            10485760, -- 10MB limit
            ARRAY[
                'image/jpeg',
                'image/png', 
                'image/gif',
                'image/webp',
                'application/pdf',
                'text/plain',
                'text/markdown',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ]
        );
    END IF;
END $$;

-- Ensure RLS policies exist for the bucket
DO $$
BEGIN
    -- Policy for uploading files
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can upload their own files'
    ) THEN
        CREATE POLICY "Users can upload their own files" ON storage.objects
        FOR INSERT WITH CHECK (
            bucket_id = 'ventychat-files' 
            AND (storage.foldername(name))[1] IS NOT NULL
        );
    END IF;

    -- Policy for viewing files
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can view their own files'
    ) THEN
        CREATE POLICY "Users can view their own files" ON storage.objects
        FOR SELECT USING (
            bucket_id = 'ventychat-files'
        );
    END IF;

    -- Policy for deleting files
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can delete their own files'
    ) THEN
        CREATE POLICY "Users can delete their own files" ON storage.objects
        FOR DELETE USING (
            bucket_id = 'ventychat-files' 
            AND (storage.foldername(name))[1] IS NOT NULL
        );
    END IF;
END $$;
