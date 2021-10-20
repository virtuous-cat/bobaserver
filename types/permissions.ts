/**
 * This table should be exactly the same as the role_permissions enum declared
 * in `db/init/020_roles.sql`.
 *
 * Keep them in sync.
 *
 * TODO: at some point rename both to "Permissions".
 **/
export enum DbRolePermissions {
  all = "all",
  edit_board_details = "edit_board_details",
  post_as_role = "post_as_role",
  edit_category_tags = "edit_category_tags",
  edit_content_notices = "edit_content_notices",
  move_thread = "move_thread",
  edit_content = "edit_content",
  edit_whisper_tags = "edit_whisper_tags",
  edit_index_tags = "edit_index_tags",
  edit_default_view = "edit_default_view",
}

export interface UserBoardPermissions {
  board_permissions: BoardPermissions[];
  post_permissions: PostPermissions[];
  thread_permissions: ThreadPermissions[];
}

export enum ThreadPermissions {
  editDefaultView = DbRolePermissions["edit_default_view"],
  moveThread = DbRolePermissions["move_thread"],
}

export enum BoardPermissions {
  editMetadata = DbRolePermissions["edit_board_details"],
}

export enum PostPermissions {
  editContent = DbRolePermissions["edit_content"],
  editWhisperTags = DbRolePermissions["edit_whisper_tags"],
  editCategoryTags = DbRolePermissions["edit_category_tags"],
  editIndexTags = DbRolePermissions["edit_index_tags"],
  editContentNotices = DbRolePermissions["edit_content_notices"],
}

export const extractPermissions = <T>(
  targetEnum: T,
  permissions: string[]
): T[keyof T][] => {
  const postsPermissions = [] as T[keyof T][];
  permissions.forEach((permission) => {
    // Check in the target enum for the key that has the permission
    // string as the value.
    const foundPermission = Object.entries(targetEnum).find(
      ([_, value]) => value === permission
    );
    if (foundPermission) {
      postsPermissions.push(foundPermission[1] as T[keyof T]);
    }
  });
  return postsPermissions;
};

/**
 * The set of post permissions associated with every post owner.
 */
export const POST_OWNER_PERMISSIONS = [
  PostPermissions.editCategoryTags,
  PostPermissions.editContentNotices,
  PostPermissions.editIndexTags,
  PostPermissions.editWhisperTags,
];

/**
 * The set of thread permissions associated with every thread owner.
 */
export const THREAD_OWNER_PERMISSIONS = [ThreadPermissions.editDefaultView];
