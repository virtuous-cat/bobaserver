WITH 
board AS
    (SELECT id FROM boards WHERE slug = 'collections'),
new_collection AS
    (INSERT INTO Collections(string_id, parent_board, title, description)
     VALUES ('9ac3ddc6-1ef1-4bf1-b298-e9c54b2bc3b7', (select id from board), 'my new collection', 'a collection')
     RETURNING id),
new_thread AS
    (INSERT INTO threads(string_id, parent_board, parent_collection)
     VALUES(
         'b86710a8-66h7-4c09-b3a5-54668bab7051', 
         (select id from board), 
         (select id from new_collection))
     RETURNING id),
new_post AS
    (INSERT INTO posts(string_id, parent_thread, author, created, content, type, anonymity_type)
     VALUES(
        '8fc49ec2-24b9-4072-8f46-506a5020f7d7',
        (SELECT id FROM new_thread),
        -- Bobatan
        1,
        '2020-08-21 06:55:39.194',
        '[{"insert":{"reddit-embed":{"url":"https://www.reddit.com/r/memes/comments/idh04d/priorities/","embedWidth":"530","embedHeight":"138"}}}]',
        'text',
        'strangers'))
INSERT INTO user_thread_identities(thread_id, user_id, identity_id)
    VALUES
    ((SELECT id FROM new_thread),
    (SELECT id FROM Users WHERE username = 'bobatan'),
    (SELECT id FROM secret_identities WHERE display_name = 'DragonFucker'));

WITH 
board AS
    (SELECT id FROM boards WHERE slug = 'collections'),
collection AS
    (SELECT id from collections WHERE string_id = '9ac3ddc6-1ef1-4bf1-b298-e9c54b2bc3b7'),
new_thread AS
    (INSERT INTO threads(string_id, parent_board, parent_collection)
     VALUES(
         'e7f13337-a5a0-434f-a9a9-c470f531f230', 
         (select id from board), 
         (select id from collection))
     RETURNING id),
new_post AS
    (INSERT INTO posts(string_id, parent_thread, author, created, content, type, anonymity_type)
     VALUES(
         'bdaa6c05-1f9b-4711-af83-d7baebb9bd74',
         (SELECT id FROM new_thread),
         -- Bobatan
         1,
         '2020-08-21 07:40:34.820',
         '[{"insert":{"tweet":{"url":"https://twitter.com/SparkNotes/status/1293211129683083264"}}},{"insert":""}]',
         'text',
         'everyone'))
INSERT INTO user_thread_identities(thread_id, user_id, identity_id)
    VALUES
    ((SELECT id FROM new_thread),
    (SELECT id FROM Users WHERE username = 'bobatan'),
    (SELECT id FROM secret_identities WHERE display_name = 'DragonFucker'));


WITH 
board AS
    (SELECT id FROM boards WHERE slug = 'collections'),
collection AS
    (SELECT id from collections WHERE string_id = '9ac3ddc6-1ef1-4bf1-b298-e9c54b2bc3b7'),
new_thread AS
    (INSERT INTO threads(string_id, parent_board, parent_collection)
     VALUES(
         '81a4e6f5-eb03-48be-b9b3-003a3f15d81c', 
         (select id from board), 
         (select id from collection))
     RETURNING id),
new_post AS
    (INSERT INTO posts(string_id, parent_thread, author, created, content, type, anonymity_type)
     VALUES(
        '2c76e154-3f88-4124-9199-cc55d3bbf15c',
         (SELECT id FROM new_thread),
         -- Bobatan
         1,
         '2020-08-21 08:23:43.896',
         '[{"insert":{"tumblr-embed":{"href":"https://embed.tumblr.com/embed/post/Q1cKOvTKxG1gEC2uFH4fSQ/180900343644","did":"5161ec3fb70d46a3a39592ec47af18bfe687d5ae","url":"https://merciful-rainbow-overlord.tumblr.com/post/180900343644/thats-my-emotional-support-molotov-cocktail","embedWidth":"530","embedHeight":"595"}}},{"insert":""}]',
         'text',
         'everyone'))
INSERT INTO user_thread_identities(thread_id, user_id, identity_id)
    VALUES
    ((SELECT id FROM new_thread),
    (SELECT id FROM Users WHERE username = 'bobatan'),
    (SELECT id FROM secret_identities WHERE display_name = 'DragonFucker'));