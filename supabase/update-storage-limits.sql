-- 將 bucket 上限調整為 Free 方案允許的 50 MB
-- 若已升級 Pro，可到 Storage → Settings 提高 Global file size limit 後再改大

update storage.buckets
set file_size_limit = 52428800
where id = 'game-files';

update storage.buckets
set file_size_limit = 5242880
where id = 'game-covers';
