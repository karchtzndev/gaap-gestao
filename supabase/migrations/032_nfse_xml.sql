-- 029: NFS-e do Emissor Nacional — o XML da nota também pode ser guardado no bucket de documentos
update storage.buckets set allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp','application/xml','text/xml'] where id = 'documentos';
