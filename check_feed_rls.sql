-- check_feed_rls.sql
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('app_feed_sections', 'app_banners', 'banners', 'system_settings');
SELECT tablename, policyname, roles, cmd, qual FROM pg_policies WHERE tablename IN ('app_feed_sections', 'app_banners', 'banners', 'system_settings');
