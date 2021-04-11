WITH 
    current_thread AS (
        SELECT 
          threads.*,
          posts.string_id AS first_post_string_id
        FROM threads 
        INNER JOIN posts ON threads.id = posts.parent_thread AND posts.parent_post IS NULL
        WHERE threads.string_id = ${thread_string_id}
    ),
    logged_in_user AS( 
        SELECT users.id, thread_cutoff_time
        FROM users
        LEFT JOIN thread_notification_dismissals
        ON thread_notification_dismissals.user_id = users.id
            AND thread_notification_dismissals.thread_string_id = ${thread_string_id}
        WHERE ${firebase_id} IS NOT NULL AND users.firebase_id = ${firebase_id}
        LIMIT 1
    ),
    thread_comments AS (
            SELECT
                  comment_string_id as comment_id,
                  comment_details.parent_post_string_id as parent_post,
                  parent_comment_string_id as parent_comment,
                  chain_parent_comment_string_id AS chain_parent_id,
                  author,
                  username,
                  user_avatar,
                  secret_identity_name,
                  secret_identity_avatar,
                  secret_identity_color,
                  accessory_avatar,
                  content,
                  TO_CHAR(created, 'YYYY-MM-DD"T"HH24:MI:SS') as created,
                  anonymity_type,
                  COALESCE(author = logged_in_user.id, FALSE) as self,
                  COALESCE((SELECT TRUE FROM friends WHERE friends.user_id = author AND friends.friend_id = logged_in_user.id), FALSE) as friend,
                  COALESCE(author != logged_in_user.id AND (thread_cutoff_time IS NULL OR created > thread_cutoff_time), FALSE) as is_new,
                  COALESCE(author = logged_in_user.id, FALSE) as is_own
              FROM comment_details
              LEFT JOIN logged_in_user ON TRUE
              WHERE comment_details.parent_thread_id = (SELECT id FROM threads WHERE threads.string_id = ${thread_string_id})
              ORDER BY comment_details.created ASC
    ),
    thread_posts AS (
        SELECT
            post_string_id as post_id,
            parent_thread_string_id as parent_thread_id,
            parent_post_string_id as parent_post_id,
            post_details.author,
            post_details.username,
            post_details.user_avatar,
            post_details.secret_identity_name,
            post_details.secret_identity_avatar,
            post_details.secret_identity_color,
            post_details.accessory_avatar,
            COALESCE(post_details.author = logged_in_user.id, FALSE) as self,
            COALESCE((SELECT TRUE FROM friends WHERE friends.user_id = post_details.author AND friends.friend_id = logged_in_user.id), FALSE) as friend,
            TO_CHAR(post_details.created, 'YYYY-MM-DD"T"HH24:MI:SS') as created,
            post_details.content,
            post_details. options,
            post_details.type,
            index_tags,
            category_tags,
            content_warnings,
            whisper_tags,
            post_details.anonymity_type,
            thread_post_comments.*,
            COALESCE(post_details.author != logged_in_user.id AND (thread_cutoff_time IS NULL OR post_details.created > thread_cutoff_time), FALSE) as is_new,
            COALESCE(post_details.author = logged_in_user.id, FALSE) as is_own
        FROM post_details
        LEFT JOIN logged_in_user ON TRUE
        LEFT JOIN LATERAL (
          SELECT 
            json_agg(thread_comments.*) AS comments,
            COALESCE(COUNT(thread_comments), 0) as total_comments_amount,
            COALESCE(COUNT(CASE WHEN thread_comments.is_new THEN 1 END), 0) as new_comments_amount
            FROM thread_comments 
            WHERE post_details.post_string_id = thread_comments.parent_post
        ) thread_post_comments ON true
        WHERE post_details.parent_thread_id = (SELECT id FROM threads WHERE threads.string_id = ${thread_string_id})
        ORDER BY post_details.created ASC
    )
SELECT
    current_thread.string_id as thread_id, 
    (SELECT slug FROM boards WHERE boards.id = current_thread.parent_board )as board_slug,
    json_agg(thread_posts) AS posts,
    COALESCE(current_thread.OPTIONS ->> 'default_view', 'thread')::view_types AS default_view,
    COALESCE(SUM(thread_posts.new_comments_amount)::int, 0) as thread_new_comments_amount,
    COALESCE(SUM(thread_posts.total_comments_amount)::int, 0) as thread_total_comments_amount, 
    -- Get all the posts that are direct answers to the first one
    COALESCE(COUNT(parent_post_id = first_post_string_id)::int, 0) as thread_direct_threads_amount,
    -- Count all the new posts that aren't ours, unless we aren't logged in.
    COALESCE(COUNT(CASE WHEN (thread_posts.is_new AND NOT thread_posts.is_own)THEN 1 END)::int, 0) as thread_new_posts_amount,
    COALESCE(COUNT(thread_posts.*)::int, 0) as thread_total_posts_amount
FROM current_thread
LEFT JOIN thread_posts ON current_thread.string_id = thread_posts.parent_thread_id
GROUP BY current_thread.string_id, current_thread.parent_board, current_thread.options;