##### DELETE BOARD####
drop index boards_string_id;
DELETE FROM comments WHERE id IN (SELECT id FROM comments WHERE comments.parent_thread IN (SELECT id FROM threads WHERE parent_board = 3));
DELETE FROM posts WHERE id IN (SELECT id FROM posts WHERE posts.parent_thread IN (SELECT id FROM threads WHERE parent_board = 3));
DELETE FROM user_thread_identities WHERE thread_id IN (SELECT id FROM threads WHERE parent_board = 3);
DELETE FROM user_thread_last_visits WHERE thread_id IN (SELECT id FROM threads WHERE parent_board = 3);
DELETE FROM threads WHERE parent_board = 3;
DELETE FROM user_board_last_visits WHERE board_id = 3;
DELETE FROM boards WHERE id = 3;

#### MOVE THREADS ####
UPDATE threads SET parent_board=6 WHERE string_id = '9fd12dfb-3f56-48e0-b000-58f224e99885';

### ALTER INDEX TO BE UNIQUE ###
DROP INDEX tags_tag;
CREATE UNIQUE INDEX tags_tag on tags(tag);

### ADD COLUMN TO TABLE ####
ALTER TABLE comments
ADD COLUMN chain_parent_comment BIGINT REFERENCES comments(id) ON DELETE RESTRICT;


select id from threads where string_id = '74182381-1c36-44e8-9455-2c4f787320da';
select * from posts where parent_thread = 974;
select * from comments where parent_post in (select id from posts where parent_thread = 974)

### DELETE THREAD ###
BEGIN;
delete from comments where parent_post in (select id from posts where parent_thread = 974);
delete from posts where parent_thread = 974;
DELETE FROM user_thread_identities WHERE thread_id = 974;
DELETE FROM user_thread_last_visits WHERE thread_id = 974;
delete from threads where string_id = '74182381-1c36-44e8-9455-2c4f787320da';
COMMIT;


#### ADD USER ####

INSERT INTO Users(firebase_id, username, avatar_reference_id, invited_by)
VALUES
    ('7373xPwLzwRH8kTRBozHEXtdZkB2', 'feral', 'https://firebasestorage.googleapis.com/v0/b/bobaboard-fb.appspot.com/o/images%2Fbobaland%2Fc26e8ce9-a547-4ff4-9486-7a2faca4d873%2F12dd461b-7682-4939-a314-1553adc0b86e?alt=media&token=67a80025-6c88-4f13-a606-ef86d3cac130', NULL),
    ('ze90q35VP0g5f5TT3Rgm2KpqXWB3', 'Lynx', 'https://firebasestorage.googleapis.com/v0/b/bobaboard-fb.appspot.com/o/images%2Fbobaland%2Fc26e8ce9-a547-4ff4-9486-7a2faca4d873%2F5d33305a-0acc-4be7-ac6f-b94ffdb335a7?alt=media&token=feefdb97-6adc-4f51-b8da-ed0bbf7636c9', NULL),
    ('ihjzyqnDPjaDE5NusPkTuLEncJb2', 'gazimon', 'https://firebasestorage.googleapis.com/v0/b/bobaboard-fb.appspot.com/o/images%2Fbobaland%2Fc26e8ce9-a547-4ff4-9486-7a2faca4d873%2F7159a8e8-d978-4329-a6a0-a7e56a5e900e?alt=media&token=44d3cf4c-4be9-4ad3-b5a3-16313f09930b', NULL),
    ('dd5DuIpjKcZH9AWPjVuqRNF4cfo2', 'cyanqueer', 'https://firebasestorage.googleapis.com/v0/b/bobaboard-fb.appspot.com/o/images%2Fbobaland%2Fc26e8ce9-a547-4ff4-9486-7a2faca4d873%2F71e29cf2-65c0-4a02-9f20-38279fbb2155?alt=media&token=48476c3d-900e-42a2-8bcc-e003563d2959', NULL);