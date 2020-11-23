const getPostsWithTags = `
    select posts_with_tags.* FROM (  
        select
            posts.id as post_id,
            json_build_object(
              'post_id', posts.string_id,
              'author', posts.author,
              'created', TO_CHAR(posts.created, 'YYYY-MM-DD"T"HH24:MI:SS'),
              'content', posts.content,
              'options', posts.options,
              'type', posts.type,
              'username', posts_user.username,
              'user_avatar', posts_user.avatar_reference_id,
              'secret_identity_name', post_secret_identity.display_name,
              'secret_identity_avatar', post_secret_identity.avatar_reference_id,
              'self', COALESCE(logged_in_user.id = posts.author, FALSE),
              'friend', COALESCE(is_friend.friend, FALSE),
              'index_tags',  ARRAY_AGG (DISTINCT tags.tag),
              'category_tags', ARRAY_AGG (DISTINCT content_warnings.warning) 
              
            ) as post_info,
            json_build_object(
              'post_info', row_to_json(posts.*),
              'posts_user_info', row_to_json(posts_user.*),
              'lil_nesty', json_build_object(
                  'posts_info', row_to_json(posts.*) 
              )
            ) as hurr_durr,
            row_to_json(post_identity.*) as post_thread_identity_info,
            row_to_json(post_secret_identity.*) as post_secret_indentity_info,
            ARRAY_AGG (DISTINCT tags.tag) as post_tags, 
            ARRAY_AGG (DISTINCT content_warnings.warning) as post_content_warnings,
            COUNT (DISTINCT child_posts.id) as child_posts_count,
            COUNT (DISTINCT comments.id) as child_comments_count,

            row_to_json(parent_thread.*) as parent_thread,
            
            row_to_json(first_post_in_thread.*) as first_post_in_thread_info,
            row_to_json(first_post_in_thread_user.*) as first_post_in_thread_user_info,
            row_to_json(first_post_identity) as first_post_thread_identity_info,
            row_to_json(first_post_secret_identity.*) as first_post_secret_indentity_info,
            ARRAY_AGG (DISTINCT first_post_tags.tag) as first_post_in_thread_tags,
            ARRAY_AGG (DISTINCT first_post_content_warnings.warning) as first_post_content_warnings,
            COUNT (DISTINCT first_post_child_posts) as first_post_child_posts_count,
            COUNT (DISTINCT first_post_comments) as first_post_comment_count,
            
            COALESCE(logged_in_user.id = posts.author, FALSE) as self,
            COALESCE(is_friend.friend, FALSE) as friend

        from posts
            LEFT JOIN users as logged_in_user on logged_in_user.firebase_id  = 'fb2'
            LEFT JOIN LATERAL (
               SELECT true as friend 
               FROM friends 
               WHERE friends.user_id = (SELECT id FROM users WHERE users.id = logged_in_user.id ) 
               AND friends.friend_id = posts.author 
               LIMIT 1) as is_friend ON 1=1 


            LEFT JOIN users as posts_user on posts.author = posts_user.id
            LEFT JOIN post_tags on posts.id = post_tags.post_id
            LEFT JOIN tags on post_tags.tag_id = tags.id
            LEFT JOIN threads as parent_thread on parent_thread.id = posts.parent_thread
            LEFT JOIN user_thread_identities as post_identity on post_identity.user_id = posts.author and post_identity.thread_id = posts.parent_thread
            LEFT JOIN secret_identities as post_secret_identity on post_identity.identity_id = post_secret_identity.id
            LEFT JOIN posts as child_posts on child_posts.parent_post = posts.id
            LEFT JOIN comments on comments.parent_post = posts.id
            LEFT JOIN post_warnings on posts.id = post_warnings.post_id
            LEFT JOIN content_warnings on post_warnings.warning_id = content_warnings.id
            
            LEFT JOIN posts as first_post_in_thread on first_post_in_thread.parent_post is NULL AND first_post_in_thread.parent_thread = posts.parent_thread AND first_post_in_thread.id != posts.id
            LEFT JOIN users as first_post_in_thread_user on first_post_in_thread.author = first_post_in_thread_user.id
            LEFT JOIN post_tags as first_post_post_tags on first_post_in_thread.id = first_post_post_tags.post_id
            LEFT JOIN tags as first_post_tags on first_post_post_tags.tag_id = first_post_tags.id 
            LEFT JOIN posts as first_post_child_posts on first_post_child_posts.parent_post = first_post_in_thread.id 
            LEFT JOIN comments as first_post_comments on first_post_comments.parent_post = first_post_in_thread.id
            LEFT JOIN user_thread_identities as first_post_identity on first_post_identity.user_id = first_post_in_thread.author and first_post_identity.thread_id = first_post_in_thread.parent_thread
            LEFT JOIN secret_identities as first_post_secret_identity on first_post_identity.identity_id = first_post_secret_identity.id
            LEFT JOIN post_warnings as first_post_post_warnings on first_post_in_thread.id = first_post_post_warnings.post_id
            LEFT JOIN content_warnings as first_post_content_warnings on first_post_post_warnings.warning_id = first_post_content_warnings.id
        GROUP BY
            posts.id,
            logged_in_user.id,
            first_post_identity.*,
            parent_thread.id,
            first_post_in_thread.id,
            post_identity.*,
            is_friend.friend,
            post_secret_identity.*,
            first_post_secret_identity.*,
            posts_user.*,
            first_post_in_thread_user.*,
            posts_user.username,
            posts_user.avatar_reference_id
            
      ) as posts_with_tags    
    WHERE
      post_id = 2;
      post_tags @> $/includeTags/ AND
      NOT post_tags && $/excludeTags/
`

export default {
  getPostsWithTags
}
