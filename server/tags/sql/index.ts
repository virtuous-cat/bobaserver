const getPostsWithTags = `
    select posts_with_tags.* FROM (
        select
            posts.*,
            posts.id as posts_id,
            parent_thread.*,
            ARRAY_AGG (DISTINCT tags.tag) as all_tags,
            COUNT (DISTINCT child_posts.id) as child_post_count,
            COUNT (DISTINCT comments.id) as child_comment_count,
            
            first_post_in_thread.id as first_post_in_thread_id,
            ARRAY_AGG (DISTINCT first_post_tags.tag) as all_first_post_in_thread_tags,
            COUNT (DISTINCT first_post_in_thread_comments) as first_post_in_thread_comment_count
                        
        from posts
            LEFT JOIN post_tags on posts.id = post_tags.post_id
            LEFT JOIN tags on post_tags.tag_id = tags.id
            LEFT JOIN threads as parent_thread on parent_thread.id = posts.parent_thread
            LEFT JOIN posts as child_posts on child_posts.parent_post = posts.id
            LEFT JOIN comments on comments.parent_post = posts.id
            
            LEFT JOIN posts as first_post_in_thread on first_post_in_thread.parent_post is NULL AND first_post_in_thread.parent_thread = posts.parent_thread AND first_post_in_thread.id != posts.id
            LEFT JOIN post_tags as first_post_post_tags on first_post_in_thread.id = first_post_post_tags.post_id
            LEFT JOIN tags as first_post_tags on first_post_post_tags.tag_id = first_post_tags.id 
            LEFT JOIN comments as first_post_in_thread_comments on comments.parent_post = first_post_in_thread.id
        GROUP BY
            posts.id,
            parent_thread.id,
            first_post_in_thread.id
      ) as posts_with_tags
    WHERE
      posts_id = 3;
    





const getPostsWithTags = `
    select posts_with_tags.* FROM (
        select
            posts.*,
            posts.id as posts_id,
            parent_thread.*,
            ARRAY_AGG (DISTINCT tags.tag) as all_tags,
            COUNT (DISTINCT child_posts.id) as child_post_count,
            COUNT (DISTINCT comments.id) as child_comment_count,
            first_post_in_thread.id as first_post_in_thread_id            
             
        from posts
            LEFT JOIN post_tags on posts.id = post_tags.post_id
            LEFT JOIN tags on post_tags.tag_id = tags.id
            LEFT JOIN threads as parent_thread on parent_thread.id = posts.parent_thread
            LEFT JOIN posts as child_posts on child_posts.parent_post = posts.id
            LEFT JOIN comments on comments.parent_post = posts.id
            LEFT JOIN posts as first_post_in_thread on first_post_in_thread.parent_post is NULL AND first_post_in_thread.parent_thread = posts.parent_thread AND first_post_in_thread.id != posts.id
        GROUP BY
            posts.id,
            parent_thread.id,
            first_post_in_thread.id
      ) as posts_with_tags
    WHERE
      posts_id = 3;
    
    
    WHERE
      all_tags @> $/includeTags/ AND
      NOT all_tags && $/excludeTags/
`

    select posts_with_tags.* FROM (
        select
            posts.id as posts_id,
            first_post_in_thread.id as first_post_in_thread_id            
             
        from posts
            LEFT JOIN posts as first_post_in_thread on first_post_in_thread.parent_thread = posts.parent_thread AND first_post_in_thread.id != posts.id AND first_post_in_thread.parent_post is NULL
        GROUP BY
            posts.id,
            first_post_in_thread.id
      ) as posts_with_tags
    WHERE
      posts_id = 3;





export default {
    getPostsWithTags
}



const getPostsWithTags = `
    select posts_with_tags.* FROM (
        select
        
            posts.id,
            posts.string_id,
            posts.parent_thread,
            posts.parent_post,
            posts.created,
            posts.content,
            posts.post_type,
            posts.whisper_tags,
            posts.options,
            posts.is_deleted,
            posts.anonymity_type
            
            !post content warnings!
            
            
            !is_own
            !is_new
            !secret_identity
            !child comments
            !child posts
            !child threads
            !parent thread
            !parent thread first post
        
            ARRAY_AGG (
            ARRAY_AGG (tags.tag) as post_tags 
        from posts
            LEFT JOIN post_tags on posts.id = post_tags.post_id
            LEFT JOIN tags on post_tags.tag_id = tags.id
        GROUP BY
            posts.id
      ) posts_with_tags
    WHERE
      post_tags @> $/includeTags/ AND
      NOT post_tags && $/excludeTags/
`


export default {
    getPostsWithTags
}
