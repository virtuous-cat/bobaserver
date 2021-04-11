CREATE VIEW thread_identities AS (
SELECT
    uti.thread_id as thread_id,
    uti.user_id as user_id,
    users.username as username,
    users.avatar_reference_id as user_avatar,
    COALESCE(secret_identity.display_name, role_identity.display_name) as secret_identity_name,
    COALESCE(secret_identity.avatar_reference_id, role_identity.avatar_reference_id) as secret_identity_avatar,
    role_identity.color as secret_identity_color,
    COALESCE(secret_identity.accessory_avatar, role_identity.accessory_avatar) as accessory_avatar
FROM user_thread_identities AS uti 
INNER JOIN users 
    ON uti.user_id = users.id
LEFT JOIN LATERAL (
    SELECT 
      display_name,
      avatar_reference_id,
      (SELECT image_reference_id FROM accessories WHERE ita.accessory_id = accessories.id LIMIT 1) as accessory_avatar
    FROM secret_identities
    LEFT JOIN identity_thread_accessories ita
      ON ita.thread_id = uti.thread_id AND ita.identity_id = uti.identity_id
    WHERE secret_identities.id = uti.identity_id) secret_identity 
ON uti.identity_id IS NOT NULL
LEFT JOIN LATERAL (
  SELECT 
      name AS display_name,
      avatar_reference_id,
      color,
      (SELECT image_reference_id FROM accessories WHERE accessories.id = COALESCE (ita.accessory_id, ra.accessory_id ) LIMIT 1) as accessory_avatar
  FROM roles
  LEFT JOIN identity_thread_accessories ita
    ON ita.thread_id = uti.thread_id AND ita.role_id = roles.id
  LEFT JOIN role_accessories ra
    ON ita.accessory_id IS NULL AND roles.id = ra.role_id
  WHERE roles.id = uti.role_id 
) role_identity
ON uti.role_id IS NOT NULL
);

CREATE VIEW thread_notification_dismissals AS (
SELECT
    users.id as user_id,
    threads.id as thread_id,
    threads.string_id as thread_string_id,
    GREATEST(last_visit_time, dnr.dismiss_request_time, dbnr.dismiss_request_time) as board_cutoff_time,
    GREATEST(last_visit_time, dnr.dismiss_request_time) as thread_cutoff_time
FROM threads
CROSS JOIN users
LEFT JOIN user_thread_last_visits
    ON threads.id = user_thread_last_visits.thread_id AND user_thread_last_visits.user_id = users.id
LEFT JOIN dismiss_notifications_requests dnr
    ON dnr.user_id = users.id
LEFT JOIN dismiss_board_notifications_requests dbnr
    ON dbnr.user_id = users.id AND dbnr.board_id = threads.parent_board
);

CREATE VIEW thread_details AS (
SELECT
    threads.id as thread_id,
    threads.string_id as thread_string_id,
    slug as board_slug,
    first_post.id as first_post_id,
    first_post.string_id AS first_post_string_id,
    first_post.content AS content,
    first_post.author AS author,
    first_post.options AS options,
    COALESCE(threads.OPTIONS ->> 'default_view', 'thread')::view_types AS default_view,
    COALESCE(first_post.whisper_tags, '{}') AS whisper_tags,
    array(
        SELECT tag FROM post_tags 
        LEFT JOIN tags
        ON post_tags.tag_id = tags.id WHERE post_tags.post_id = first_post.id) as index_tags,
    array(
        SELECT category FROM post_categories 
        LEFT JOIN categories
        ON post_categories.category_id = categories.id WHERE post_categories.post_id = first_post.id) as category_tags,
    array(
        SELECT warning FROM post_warnings 
        LEFT JOIN content_warnings
        ON post_warnings.warning_id = content_warnings.id WHERE post_warnings.post_id = first_post.id) as content_warnings,
    first_post_timestamp,
    last_post_timestamp,
    last_comment_timestamp,
    GREATEST(first_post_timestamp, last_post_timestamp, last_comment_timestamp) AS last_update_timestamp,
    threads_amount,
    posts_amount,
    comments_amount
FROM threads
LEFT JOIN boards
    ON boards.id = threads.parent_board
LEFT JOIN posts AS first_post
    ON first_post.parent_thread = threads.id AND first_post.parent_post IS NULL
LEFT JOIN LATERAL (
  SELECT
    MIN(posts.created) as first_post_timestamp,
    MAX(posts.created) as last_post_timestamp,
    COUNT(CASE WHEN posts.parent_post = first_post.id THEN 1 END)::int as threads_amount,
    COUNT(posts.id)::int as posts_amount
  FROM posts
  WHERE posts.parent_thread = threads.id ) posts ON TRUE
LEFT JOIN LATERAL (
  SELECT
    MAX(comments.created) as last_comment_timestamp,
    COUNT(DISTINCT comments.id)::int as comments_amount
  FROM comments
  WHERE threads.id = comments.parent_thread) comments ON TRUE
);

CREATE VIEW thread_user_details AS (
SELECT
    threads.id as thread_id,
    users.id as user_id,
    first_post.author = users.id as own_thread,
    (SELECT friend_id FROM friends WHERE first_post.author = friends.user_id AND friends.friend_id = users.id) IS NOT NULL as friend_thread,
    umt.thread_id IS NOT NULL as muted,
    uht.thread_id IS NOT NULL as hidden,
    COALESCE(users.id != first_post.author AND first_post.created > tnd.thread_cutoff_time, TRUE) AS is_new,
    (SELECT COUNT(*) FROM posts WHERE users.id != posts.author AND posts.parent_thread = threads.id AND (tnd.thread_cutoff_time IS NULL OR posts.created > tnd.thread_cutoff_time))::int as new_posts_amount,
    (SELECT COUNT(*) FROM posts WHERE users.id != posts.author AND posts.parent_thread = threads.id AND (tnd.board_cutoff_time IS NULL OR posts.created > tnd.board_cutoff_time))::int as new_posts_board_amount,
    (SELECT COUNT(*) FROM comments WHERE users.id != comments.author AND comments.parent_thread = threads.id AND (tnd.thread_cutoff_time IS NULL OR comments.created > tnd.thread_cutoff_time))::int as new_comments_amount,
    (SELECT COUNT(*) FROM comments WHERE users.id != comments.author AND comments.parent_thread = threads.id AND (tnd.board_cutoff_time IS NULL OR comments.created > tnd.board_cutoff_time))::int as new_comments_board_amount
FROM threads
CROSS JOIN users
LEFT JOIN LATERAL (
  SELECT * FROM posts 
  WHERE threads.id = posts.parent_thread AND posts.parent_post IS NULL
) AS first_post ON TRUE
LEFT JOIN user_muted_threads umt
    ON umt.user_id = users.id AND umt.thread_id = threads.id
LEFT JOIN user_hidden_threads uht
    ON uht.user_id = users.id AND uht.thread_id = threads.id
 LEFT JOIN thread_notification_dismissals tnd
    ON tnd.thread_id = threads.id AND tnd.user_id = users.id
);

CREATE VIEW comment_details AS (
SELECT
    comments.id as comment_id,
    comments.string_id as comment_string_id,
    parent_thread.id as parent_thread_id,
    parent_thread.string_id as parent_thread_string_id,
    parent_post.id as parent_post_id,
    parent_post.string_id as parent_post_string_id,
    parent_comment.id as parent_comment_id,
    parent_comment.string_id as parent_comment_string_id,
    chain_parent_comment.id as chain_parent_comment_id,
    chain_parent_comment.string_id as chain_parent_comment_string_id,
    author,
    username,
    user_avatar,
    secret_identity_name,
    secret_identity_avatar,
    secret_identity_color,
    accessory_avatar,
    content,
    created,
    anonymity_type
FROM comments
LEFT JOIN LATERAL (
	SELECT id, string_id FROM threads WHERE threads.id = comments.parent_thread
) parent_thread ON TRUE
LEFT JOIN LATERAL (
	SELECT id, string_id FROM posts WHERE posts.id = comments.parent_post
) parent_post ON TRUE
LEFT JOIN LATERAL (
	SELECT id, string_id FROM comments c WHERE c.id = comments.parent_comment
) parent_comment ON comments.parent_comment IS NOT NULL
LEFT JOIN LATERAL (
	SELECT id, string_id FROM comments c WHERE c.id = comments.chain_parent_comment
) chain_parent_comment  ON comments.chain_parent_comment IS NOT NULL
LEFT JOIN thread_identities
    ON thread_identities.thread_id = comments.parent_thread AND thread_identities.user_id = comments.author
);

CREATE VIEW post_details AS (
SELECT 
 posts.id AS post_id,
 posts.string_id as post_string_id,
 parent_thread.id AS parent_thread_id,
 parent_thread.string_id as parent_thread_string_id,
 parent_post.id as parent_post_id,
 parent_post.string_id as parent_post_string_id,
 posts.author,
 thread_identities.username,
 thread_identities.user_avatar,
 thread_identities.secret_identity_name,
 thread_identities.secret_identity_avatar,
 thread_identities.secret_identity_color,
 thread_identities.accessory_avatar,
 posts.created,
 posts.content,
 posts.options,
 posts.type,
  COALESCE(posts.whisper_tags, '{}') AS whisper_tags,
  array(
      SELECT tag FROM post_tags 
      LEFT JOIN tags
      ON post_tags.tag_id = tags.id WHERE post_tags.post_id = posts.id) as index_tags,
  array(
      SELECT category FROM post_categories 
      LEFT JOIN categories
      ON post_categories.category_id = categories.id WHERE post_categories.post_id = posts.id) as category_tags,
  array(
      SELECT warning FROM post_warnings 
      LEFT JOIN content_warnings
      ON post_warnings.warning_id = content_warnings.id WHERE post_warnings.post_id = posts.id) as content_warnings,
  posts.anonymity_type
FROM posts
LEFT JOIN LATERAL (
  SELECT id, string_id FROM threads WHERE threads.id = posts.parent_thread
) parent_thread ON TRUE
LEFT JOIN LATERAL (
  SELECT id, string_id FROM posts p WHERE p.id = posts.parent_post
) parent_post ON parent_post IS NOT NULL
LEFT JOIN thread_identities
    ON thread_identities.thread_id = posts.parent_thread AND thread_identities.user_id = posts.author
);