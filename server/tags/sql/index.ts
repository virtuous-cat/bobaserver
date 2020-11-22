const getPostsWithTags = `
    select posts_with_tags.* FROM (  
        select
            row_to_json(posts.*) as post_info,
            posts.id as post_id,
            row_to_json(post_identity.*) as post_identity,
            ARRAY_AGG (DISTINCT tags.tag) as post_tags, 
            ARRAY_AGG (DISTINCT content_warnings.warning) as post_content_warnings,
            COUNT (DISTINCT child_posts.id) as child_posts_count,
            COUNT (DISTINCT comments.id) as child_comments_count,

            row_to_json(parent_thread.*) as parent_thread,
            
            row_to_json(first_post_in_thread.*) as first_post_in_thread_info,
            row_to_json(first_post_identity) as first_post_identity_info,
            ARRAY_AGG (DISTINCT first_post_tags.tag) as first_post_in_thread_tags,
            ARRAY_AGG (DISTINCT first_post_content_warnings.warning) as first_post_content_warnings,
            COUNT (DISTINCT first_post_child_posts) as first_post_child_posts_count,
            COUNT (DISTINCT first_post_comments) as first_post_comment_count
            
                        
        from posts
            LEFT JOIN post_tags on posts.id = post_tags.post_id
            LEFT JOIN tags on post_tags.tag_id = tags.id
            LEFT JOIN threads as parent_thread on parent_thread.id = posts.parent_thread
            LEFT JOIN user_thread_identities as post_identity on post_identity.user_id = posts.author and post_identity.thread_id = posts.parent_thread
            LEFT JOIN posts as child_posts on child_posts.parent_post = posts.id
            LEFT JOIN comments on comments.parent_post = posts.id
            LEFT JOIN post_warnings on posts.id = post_warnings.post_id
            LEFT JOIN content_warnings on post_warnings.warning_id = content_warnings.id
            
            
            
            LEFT JOIN posts as first_post_in_thread on first_post_in_thread.parent_post is NULL AND first_post_in_thread.parent_thread = posts.parent_thread AND first_post_in_thread.id != posts.id
            LEFT JOIN post_tags as first_post_post_tags on first_post_in_thread.id = first_post_post_tags.post_id
            LEFT JOIN tags as first_post_tags on first_post_post_tags.tag_id = first_post_tags.id 
            LEFT JOIN posts as first_post_child_posts on first_post_child_posts.parent_post = first_post_in_thread.id 
            LEFT JOIN comments as first_post_comments on first_post_comments.parent_post = first_post_in_thread.id
            LEFT JOIN user_thread_identities as first_post_identity on first_post_identity.user_id = first_post_in_thread.author and first_post_identity.thread_id = first_post_in_thread.parent_thread
            LEFT JOIN post_warnings as first_post_post_warnings on first_post_in_thread.id = first_post_post_warnings.post_id
            LEFT JOIN content_warnings as first_post_content_warnings on first_post_post_warnings.warning_id = first_post_content_warnings.id
        GROUP BY
            posts.id,
            first_post_identity.*,
            parent_thread.id,
            first_post_in_thread.id,
            post_identity.*
            
      ) as posts_with_tags    
    WHERE
      post_tags @> $/includeTags/ AND
      NOT post_tags && $/excludeTags/
`

export default {
  getPostsWithTags
}
