export interface ServerCommentType {
  comment_id: string;
  secret_identity: {
    name: string;
    avatar: string;
  };
  user_identity?: {
    name: string;
    avatar: string;
  };
  content: string;
  created: string;
}

export interface ServerPostType {
  post_id: string;
  parent_thread_id: string;
  parent_post_id: string;
  secret_identity: {
    name: string;
    avatar: string;
  };
  user_identity?: {
    name: string;
    avatar: string;
  };
  self: boolean;
  friend: boolean;
  created: string;
  content: string;
  options: {
    wide?: boolean;
  };
  tags?: {
    index_tags: string[];
    whisper_tags: string[];
  };
  comments?: ServerCommentType[];
  total_comments_amount: number;
  new_comments_amount: number;
  is_new: boolean;
}

export interface ServerThreadType {
  posts: ServerPostType[];
  thread_id: string;
  thread_direct_threads_amount: number;
  thread_new_posts_amount: number;
  thread_new_comments_amount: number;
  thread_total_comments_amount: number;
  thread_total_posts_amount: number;
  thread_last_activity: string;
  muted: boolean;
  hidden: boolean;
}

export interface DbIdentityType {
  id: string;
  username: string;
  user_avatar_reference_id: string;
  display_name: string;
  secret_identity_avatar_reference_id: string;
  friend: boolean;
  self: boolean;
}

export interface DbPostType {
  post_id: string;
  parent_thread_id: string;
  parent_post_id: string;
  author: number;
  username: string;
  user_avatar: string;
  secret_identity_name: string;
  secret_identity_avatar: string;
  friend: boolean;
  self: boolean;
  created: string;
  content: string;
  options: {
    wide?: boolean;
  };
  type: string;
  whisper_tags: string[];
  index_tags: string[];
  anonymity_type: "everyone" | "strangers";
  total_comments_amount: number;
  new_comments_amount: number;
  comments: DbCommentType[] | null;
  is_new: boolean;
  is_own: boolean;
}

export interface DbCommentType {
  comment_id: string;
  parent_post: string;
  author: number;
  username: string;
  user_avatar: string;
  secret_identity_name: string;
  secret_identity_avatar: string;
  friend: boolean;
  self: boolean;
  content: string;
  created: string;
  anonymity_type: "everyone" | "strangers";
  is_new: boolean;
  is_own: boolean;
}

export interface DbThreadType {
  thread_id: string;
  posts: DbPostType[];
  thread_direct_threads_amount: number;
  thread_new_posts_amount: number;
  thread_new_comments_amount: number;
  thread_total_posts_amount: number;
  thread_total_comments_amount: number;
  thread_last_activity: string;
  muted: boolean;
  hidden: boolean;
}

export interface DbActivityThreadType {
  post_id: string;
  parent_post_id: null;
  thread_id: string;
  author: number;
  username: string;
  user_avatar: string;
  secret_identity_name: string;
  secret_identity_avatar: string;
  created: string;
  content: string;
  index_tags: string[];
  whisper_tags: string[];
  muted: boolean;
  hidden: boolean;
  options: {
    wide?: boolean;
  };
  posts_amount: number;
  threads_amount: number;
  friend: boolean;
  self: boolean;
  new_posts_amount: number;
  new_comments_amount: number;
  last_comment: string;
  is_new: boolean;
  comments_amount: number;
  thread_last_activity: string;
}
