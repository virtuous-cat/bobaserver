const updateUserSettings = `
  INSERT INTO user_settings(user_id, setting_name, setting_value) VALUES 
    ((SELECT id FROM users WHERE users.firebase_id = $/firebase_id/), $/setting_name/, $/setting_value/)
  ON CONFLICT(user_id, setting_name) DO UPDATE 
    SET setting_value = $/setting_value/
    WHERE user_settings.user_id = (SELECT id FROM users WHERE users.firebase_id = $/firebase_id/)
        AND user_settings.setting_name = $/setting_name/`;

const getUserSettings = `
  SELECT
    setting_name as name,
    setting_value as value,
    type
  FROM user_settings
  LEFT JOIN setting_types ON
    user_settings.setting_name = setting_types.name
  WHERE user_settings.user_id = (SELECT id FROM users WHERE users.firebase_id = $/firebase_id/);
`;

const getSettingType = `
  SELECT type
  FROM setting_types
  WHERE setting_types.name = $/setting_name/
`;

const dismissNotifications = `
    INSERT INTO dismiss_notifications_requests(user_id, dismiss_request_time) VALUES (
        (SELECT id FROM users WHERE users.firebase_id = $/firebase_id/),
         DEFAULT)
    ON CONFLICT(user_id) DO UPDATE 
        SET dismiss_request_time = DEFAULT
        WHERE dismiss_notifications_requests.user_id = (SELECT id FROM users WHERE users.firebase_id = $/firebase_id/)`;

const getUserDetails =
  "SELECT * FROM users WHERE firebase_id = $/firebase_id/ LIMIT 1";

const updateUserData = `
    UPDATE users
    SET username = $/username/,
        avatar_reference_id = $/avatar_url/
    WHERE firebase_id = $/firebase_id/`;

const getInviteDetails = `
    SELECT 
      inviter,
      invitee_email,
      created + duration < NOW() as expired,
      used 
    FROM account_invites WHERE nonce = $/nonce/ 
    ORDER BY created LIMIT 1`;

const getBobadexIdentities = `      
    SELECT 
      COUNT(*) AS identities_count,
      jsonb_agg(identities.IDENTITY) FILTER (WHERE (identities.identity->'caught')::boolean = TRUE) AS user_identities
    FROM (
      SELECT
        jsonb_build_object(
          'index', ROW_NUMBER() OVER (ORDER BY si .id),
          'name', si.display_name,
          'avatarUrl', si.avatar_reference_id,
          'caught', bool_or(uti.user_id IS NOT NULL)) AS identity
      FROM secret_identities si
      LEFT JOIN user_thread_identities uti ON uti.identity_id = si.id AND uti.user_id = (SELECT id FROM users WHERE firebase_id = $/firebase_id/)
      GROUP BY si.id) AS identities`;

export default {
  getUserDetails,
  getSettingType,
  updateUserData,
  getUserSettings,
  updateUserSettings,
  dismissNotifications,
  getInviteDetails,
  getBobadexIdentities,
};
